"use client";

import Image from "next/image";
import { useState } from "react";

type VendorOrder = {
  id: string;
  vendorName: string;
  vendorEmail: string;
  locationName: string;
  quantity: number;
  casePriceCents: number;
  transportationFeeCents: number;
  totalCents: number;
  paid: boolean;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
};

function money(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

export function VendorOrderConfirmation({
  token,
  order,
}: {
  token: string;
  order: VendorOrder;
}) {
  const [confirmed, setConfirmed] = useState(order.status === "confirmed");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/vendor-orders/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to confirm this order");
      }
      setConfirmed(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to confirm this order",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pickup-shell">
      <section className="pickup-card" aria-live="polite">
        <Image
          className="pickup-logo"
          src="/app-icon.png"
          alt="Orit Tej"
          width={112}
          height={112}
          priority
        />
        <h1>Vendor order</h1>
        <div className="paid-pill">Paid</div>
        <dl className="order-details">
          <div>
            <dt>Name</dt>
            <dd>{order.vendorName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{order.vendorEmail}</dd>
          </div>
          <div>
            <dt>Cases</dt>
            <dd>{order.quantity}</dd>
          </div>
          <div>
            <dt>Case subtotal</dt>
            <dd>{money(order.casePriceCents * order.quantity)}</dd>
          </div>
          <div>
            <dt>Transportation</dt>
            <dd>{money(order.transportationFeeCents)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(order.totalCents)}</dd>
          </div>
        </dl>
        <p className="location-label">{order.locationName}</p>

        {confirmed ? (
          <div className="success-panel">
            <div className="success-mark" aria-hidden="true">
              ✓
            </div>
            <h2>Order confirmed</h2>
          </div>
        ) : (
          <button
            type="button"
            className="complete-button"
            onClick={confirm}
            disabled={submitting}
          >
            {submitting ? "Confirming..." : "Confirm"}
          </button>
        )}

        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  );
}