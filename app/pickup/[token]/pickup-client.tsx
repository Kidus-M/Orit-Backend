"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type PickupOrder = {
  id: string;
  name: string;
  email: string;
  quantity: number;
  paid: boolean;
  locationName: string;
  status: string;
};

async function postJson(
  path: string,
  body: Record<string, string>,
) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = (await response.json()) as {
    error?: string;
    order?: PickupOrder;
    completed?: boolean;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to verify this pickup");
  }
  return result;
}

export function PickupClient({ token }: { token: string }) {
  const [serviceCode, setServiceCode] = useState("");
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [state, setState] = useState<
    "code" | "verifying" | "ready" | "completing" | "completed"
  >("code");
  const [error, setError] = useState<string | null>(null);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}$/.test(serviceCode)) {
      setError("Enter the four-digit location service code.");
      return;
    }

    setState("verifying");
    setError(null);
    try {
      const result = await postJson("/api/pickup/verify", {
        token,
        serviceCode,
      });
      setOrder(result.order ?? null);
      setState("ready");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Verification failed",
      );
      setState("code");
    }
  }

  async function complete() {
    setState("completing");
    setError(null);
    try {
      await postJson("/api/pickup/complete", { token, serviceCode });
      setState("completed");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to complete pickup",
      );
      setState("ready");
    }
  }

  return (
    <main className="pickup-shell">
      <section className="pickup-card" aria-live="polite">
        <Image
          className="pickup-logo"
          src="/orit-tej-icon.png"
          alt="Orit Tej wine bottle and honey jar"
          width={112}
          height={112}
          priority
        />
        <p className="eyebrow">Orit Tej</p>
        <h1>Pickup verification</h1>

        {state === "code" || state === "verifying" ? (
          <>
            <p className="intro">
              Enter this location&apos;s four-digit service code to view the
              paid order.
            </p>
            <form onSubmit={verify} className="code-form">
              <label htmlFor="service-code">Location service code</label>
              <input
                id="service-code"
                name="service-code"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                maxLength={4}
                value={serviceCode}
                onChange={(event) =>
                  setServiceCode(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                placeholder="••••"
                autoFocus
              />
              <button
                type="submit"
                className="verify-button"
                disabled={state === "verifying"}
              >
                {state === "verifying" ? "Checking..." : "View order"}
              </button>
            </form>
          </>
        ) : null}

        {order && (state === "ready" || state === "completing") ? (
          <>
            <div className="paid-pill">Paid order</div>
            <dl className="order-details">
              <div>
                <dt>Name</dt>
                <dd>{order.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.email}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>
                  {order.quantity} bottle{order.quantity === 1 ? "" : "s"}
                </dd>
              </div>
            </dl>
            <p className="location-label">{order.locationName}</p>
            <button
              type="button"
              className="complete-button"
              onClick={complete}
              disabled={state === "completing"}
            >
              {state === "completing" ? "Completing..." : "Complete"}
            </button>
            <p className="complete-note">
              Press only after the customer has received the bottles. This QR
              code will stop working immediately.
            </p>
          </>
        ) : null}

        {state === "completed" ? (
          <div className="success-panel">
            <div className="success-mark" aria-hidden="true">
              ✓
            </div>
            <h2>Pickup complete</h2>
            <p>The order is complete and this QR code is now inactive.</p>
          </div>
        ) : null}

        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  );
}


