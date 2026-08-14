"use client";

import { useEffect, useState } from "react";

import { clubApi, formatMoney } from "@/lib/web-app/api";
import { ClubSection } from "./club-membership";
import { StripePayment } from "./stripe-payment";

type VendorAccess = {
  isVendor: boolean;
  hasPaymentMethod: boolean;
  casePriceCents: number;
  transportationFeeCents: number;
};

export function VendorOrder() {
  const [access, setAccess] = useState<VendorAccess>();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  async function load() {
    try { setAccess(await clubApi<VendorAccess>("/api/vendor-orders")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Vendor ordering could not load."); }
  }

  useEffect(() => {
    clubApi<VendorAccess>("/api/vendor-orders")
      .then(setAccess)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Vendor ordering could not load."));
  }, []);

  async function placeOrder() {
    setBusy(true); setError(undefined);
    try { await clubApi("/api/vendor-orders", { method: "POST", body: JSON.stringify({ quantity }) }); setSubmitted(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Order could not be placed."); }
    finally { setBusy(false); }
  }

  if (submitted) return <ClubSection title="THANK YOU!" summary="Your order has been submitted and will be delivered within 3 days."><button className="club-button club-button--green" type="button" onClick={() => { setSubmitted(false); setQuantity(1); }}>Done</button></ClubSection>;
  if (!access) return <ClubSection title="Order Cases">{error ? <p className="club-error" role="alert">{error}</p> : <div className="club-loading">Loading vendor ordering…</div>}</ClubSection>;
  if (!access.isVendor) return <ClubSection title="SORRY!"><div className="club-empty"><strong>Page reserved for vendors.</strong></div></ClubSection>;
  if (!access.hasPaymentMethod) return <ClubSection title="Payment"><StripePayment purpose="setup" buttonLabel="Next" onSuccess={load} /></ClubSection>;

  const subtotal = access.casePriceCents * quantity;
  const total = subtotal + access.transportationFeeCents;
  // The product asset is a fixed local image; native dimensions are intentionally preserved.
  // eslint-disable-next-line @next/next/no-img-element
  return <ClubSection title="Order Cases"><div className="club-product"><img src="/craft-honey-wine.png" alt="Case filled with golden honey wine bottles" /><div><p>Orit Tej Cases</p><div className="club-quantity"><button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}>−</button><strong>{quantity}</strong><button type="button" disabled={quantity >= 30} onClick={() => setQuantity((value) => value + 1)}>+</button></div></div></div><div className="club-total-list"><p><span>Cases</span><strong>{formatMoney(access.casePriceCents)} x {quantity}</strong></p><p><span>Case subtotal</span><strong>{formatMoney(subtotal)}</strong></p><p><span>Transportation fee</span><strong>{formatMoney(access.transportationFeeCents)}</strong></p><p className="club-total-list__total"><span>Total</span><strong>{formatMoney(total)}</strong></p></div>{error ? <p className="club-error" role="alert">{error}</p> : null}<button className="club-button club-button--green" type="button" disabled={busy} onClick={placeOrder}>{busy ? "Sending order…" : `Pay ${formatMoney(total)} and Place Order`}</button></ClubSection>;
}
