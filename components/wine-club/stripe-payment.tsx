"use client";

import { useEffect, useRef, useState } from "react";

import { MEMBERSHIP_RENEWAL_TERMS_VERSION } from "@/lib/compliance-versions";
import { ClubApiError, clubApi } from "@/lib/web-app/api";

type StripeElement = { mount(target: HTMLElement): void; destroy(): void };
type StripeElements = {
  create(type: "payment", options?: Record<string, unknown>): StripeElement;
};
type StripeResult = {
  error?: { message?: string };
  paymentIntent?: { id: string };
  setupIntent?: { id: string };
};
type StripeClient = {
  elements(options: Record<string, unknown>): StripeElements;
  confirmPayment(options: Record<string, unknown>): Promise<StripeResult>;
  confirmSetup(options: Record<string, unknown>): Promise<StripeResult>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeClient;
  }
}

let stripeScriptPromise: Promise<void> | undefined;

function loadStripeScript() {
  stripeScriptPromise ??= new Promise<void>((resolve, reject) => {
    if (window.Stripe) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.stripe.com/v3/"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Stripe could not load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Stripe could not load."));
    document.head.append(script);
  });
  return stripeScriptPromise;
}

type IntentResponse = {
  publishableKey: string;
  paymentIntentId?: string;
  paymentIntentClientSecret?: string;
  setupIntentId?: string;
  setupIntentClientSecret?: string;
};

const demoPaymentMethod = {
  brand: "visa",
  last4: "4242",
  expiryMonth: 12,
  expiryYear: new Date().getFullYear() + 3,
  billingZip: "95112",
};

export function StripePayment({
  purpose,
  planCode,
  buttonLabel,
  heading = "Secure Payment With Stripe",
  description,
  footnote,
  onSuccess,
}: {
  purpose: "membership" | "setup";
  planCode?: "one_month" | "three_month" | "six_month";
  buttonLabel: string;
  heading?: string;
  description?: string;
  footnote?: string;
  onSuccess: () => void | Promise<void>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<StripeClient | undefined>(undefined);
  const elementsRef = useRef<StripeElements | undefined>(undefined);
  const intentRef = useRef<IntentResponse | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let disposed = false;
    let paymentElement: StripeElement | undefined;

    async function initialize() {
      try {
        const response = await clubApi<IntentResponse>(
          purpose === "membership"
            ? "/api/stripe/payment-sheet/membership"
            : "/api/stripe/payment-sheet/vendor-card",
          {
            method: "POST",
            body: JSON.stringify(
              purpose === "membership"
                ? {
                    planCode,
                    autoRenewConsent: true,
                    renewalTermsVersion: MEMBERSHIP_RENEWAL_TERMS_VERSION,
                  }
                : {},
            ),
          },
        );
        if (disposed) return;
        const clientSecret =
          response.paymentIntentClientSecret ?? response.setupIntentClientSecret;
        if (!clientSecret) throw new Error("Stripe did not return a payment form.");

        await loadStripeScript();
        if (disposed || !window.Stripe || !mountRef.current) return;
        const stripe = window.Stripe(response.publishableKey);
        const elements = stripe.elements({
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#681d31",
              colorText: "#211c18",
              colorBackground: "#fffdf8",
              borderRadius: "14px",
              fontFamily: "Arial, sans-serif",
            },
          },
        });
        paymentElement = elements.create("payment", {
          layout: { type: "tabs", defaultCollapsed: false },
        });
        paymentElement.mount(mountRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
        intentRef.current = response;
        setReady(true);
      } catch (caught) {
        if (disposed) return;
        if (caught instanceof ClubApiError && caught.status === 409) {
          setDemoMode(true);
          setReady(true);
          return;
        }
        setError(caught instanceof Error ? caught.message : "Payment could not load.");
      }
    }

    initialize();
    return () => {
      disposed = true;
      paymentElement?.destroy();
    };
  }, [planCode, purpose]);

  async function completeDemoPayment() {
    if (purpose === "membership") {
      await clubApi("/api/memberships/purchase", {
        method: "POST",
        body: JSON.stringify({
          planCode,
          autoRenewConsent: true,
          renewalTermsVersion: MEMBERSHIP_RENEWAL_TERMS_VERSION,
          paymentMethod: demoPaymentMethod,
        }),
      });
    } else {
      await clubApi("/api/account/payment-method", {
        method: "PATCH",
        body: JSON.stringify(demoPaymentMethod),
      });
    }
  }

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      if (demoMode) {
        await completeDemoPayment();
      } else {
        const stripe = stripeRef.current;
        const elements = elementsRef.current;
        const intent = intentRef.current;
        if (!stripe || !elements || !intent) throw new Error("Payment is still loading.");

        if (purpose === "membership") {
          const result = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: { return_url: `${window.location.origin}/club/home` },
          });
          if (result.error) throw new Error(result.error.message ?? "Payment failed.");
          const paymentIntentId = result.paymentIntent?.id ?? intent.paymentIntentId;
          if (!paymentIntentId) throw new Error("Payment confirmation is missing.");
          await clubApi("/api/memberships/purchase", {
            method: "POST",
            body: JSON.stringify({
              planCode,
              paymentIntentId,
              autoRenewConsent: true,
              renewalTermsVersion: MEMBERSHIP_RENEWAL_TERMS_VERSION,
            }),
          });
        } else {
          const result = await stripe.confirmSetup({
            elements,
            redirect: "if_required",
            confirmParams: { return_url: `${window.location.origin}/club/settings` },
          });
          if (result.error) throw new Error(result.error.message ?? "Card setup failed.");
          const setupIntentId = result.setupIntent?.id ?? intent.setupIntentId;
          if (!setupIntentId) throw new Error("Card confirmation is missing.");
          await clubApi("/api/account/payment-method/vendor", {
            method: "POST",
            body: JSON.stringify({ setupIntentId }),
          });
        }
      }
      await onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="club-payment">
      <div className="club-payment__secure">
        <span aria-hidden="true">●</span>
        <div>
          <strong>{heading}</strong>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {demoMode ? (
        <div className="club-notice">Test mode is active. No card will be charged.</div>
      ) : (
        <div ref={mountRef} className="club-payment__element" aria-label="Secure card form" />
      )}
      {error ? <p className="club-error" role="alert">{error}</p> : null}
      <button className="club-button club-button--green" type="button" disabled={!ready || busy} onClick={submit}>
        {busy ? "Processing…" : buttonLabel}
      </button>
      {footnote ? <p className="club-payment__footnote">{footnote}</p> : null}
    </div>
  );
}
