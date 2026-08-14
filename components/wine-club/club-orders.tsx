"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import {
  clubApi,
  formatDate,
  formatMoney,
  type ClubUser,
  type MembershipState,
  type PickupLocation,
  type PurchaseOrder,
} from "@/lib/web-app/api";
import { ArrowIcon, BottleIcon, GiftIcon, LocationIcon, OrdersIcon } from "./club-icons";
import { ClubSection } from "./club-membership";
import { QrCode } from "./qr-code";

type Navigate = (view: string) => void;

export function ClubDashboard({ membership, navigate }: { membership: MembershipState; navigate: Navigate }) {
  return (
    <ClubSection>
      <div className="club-dashboard-grid">
        <DashboardCard icon={<BottleIcon />} title="Create a New Order" onClick={() => navigate("order")} />
        <DashboardCard icon={<OrdersIcon />} title="Active Orders" onClick={() => navigate("orders")} />
        {membership.isMember ? <DashboardCard icon={<GiftIcon />} title="Membership Gifts" onClick={() => navigate("benefits")} /> : null}
      </div>
    </ClubSection>
  );
}

function DashboardCard({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return <button className="club-dashboard-card" type="button" onClick={onClick}><span>{icon}</span><strong>{title}</strong><ArrowIcon /></button>;
}

type CreatedOrder = PurchaseOrder & { pickupUrl: string };

export function ClubOrderFlow({ membership, user, navigate }: { membership: MembershipState; user: ClubUser; navigate: Navigate }) {
  const [type, setType] = useState<"personal" | "event" | undefined>(membership.isMember ? undefined : "personal");
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsRefresh, setLocationsRefresh] = useState(0);
  const [locationError, setLocationError] = useState(false);
  const [location, setLocation] = useState<PickupLocation>();
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<"type" | "location" | "quantity" | "confirmation">(membership.isMember ? "type" : "location");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [order, setOrder] = useState<CreatedOrder>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    clubApi<{ locations: PickupLocation[] }>("/api/locations")
      .then((result) => { setLocations(result.locations); setLocationError(false); })
      .catch(() => setLocationError(true))
      .finally(() => setLocationsLoading(false));
  }, [locationsRefresh]);

  function chooseType(value: "personal" | "event") {
    setType(value); setQuantity(value === "event" ? 2 : 1); setLocation(undefined); setStep("location");
  }

  async function placeOrder() {
    if (!type || !location || !ageConfirmed) return;
    setBusy(true); setError(undefined);
    try {
      const result = await clubApi<{ order: PurchaseOrder; pickupUrl: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ orderType: type, locationId: location.id, quantity }),
      });
      setOrder({ ...result.order, locationName: location.name, pickupUrl: result.pickupUrl });
      setStep("confirmation");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Order could not be placed."); }
    finally { setBusy(false); }
  }

  if (step === "type") return (
    <ClubSection title="Create a New Order" onBack={() => navigate("home")}>
      <div className="club-centered-choices">
        <button className="club-choice" type="button" onClick={() => chooseType("personal")}><span className="club-choice__icon"><BottleIcon /></span><span><strong>Personal</strong></span><ArrowIcon /></button>
        <button className="club-choice" type="button" onClick={() => chooseType("event")}><span className="club-choice__icon"><GiftIcon /></span><span><strong>Events</strong></span><ArrowIcon /></button>
      </div>
    </ClubSection>
  );

  if (step === "location") return (
    <ClubSection title="Choose Pickup Location" onBack={() => membership.isMember ? setStep("type") : navigate("home")}>
      {locationsLoading ? <div className="club-loading">Loading pickup locations…</div> : locationError ? <div className="club-empty"><strong>Unable to load pickup locations.</strong><button className="club-button club-button--quiet" type="button" onClick={() => { setLocationsLoading(true); setLocationsRefresh((value) => value + 1); }}>Try Again</button></div> : locations.length === 0 ? <div className="club-empty">No pickup locations are currently available.</div> : <div className="club-location-list">
        {locations.map((item) => {
          const blocked = type === "personal" && (!item.inStock || item.stockQuantity < 1);
          return <button className={`club-location ${location?.id === item.id ? "is-selected" : ""} ${blocked ? "is-sold-out" : ""}`} type="button" disabled={blocked} key={item.id} onClick={() => setLocation(item)}><LocationIcon /><span><strong>{item.name}</strong><small>{item.addressLine1}<br />{item.city}, {item.state} {item.postalCode}<br />{item.hoursText}</small></span>{blocked ? <b>OUT OF STOCK</b> : null}</button>;
        })}
      </div>}
      <button className="club-button club-button--green" type="button" disabled={!location} onClick={() => setStep("quantity")}>Continue</button>
    </ClubSection>
  );

  if (step === "quantity" && location && type) {
    const min = type === "event" ? 2 : 1;
    const max = type === "event" ? 4 : Math.min(6, location.stockQuantity);
    const unitPrice = type === "event" ? 15000 : location.bottlePriceCents;
    const transportation = type === "event" ? location.transportationFeeCents : 0;
    const total = unitPrice * quantity + transportation;
    return (
      <ClubSection title={type === "event" ? "Order Cases" : "Order Bottles"} onBack={() => setStep("location")}>
        <div className="club-product"><Image src={type === "event" ? "/craft-honey-wine.png" : "/hero-honey-wine-labeled.png"} width={520} height={520} sizes="(max-width: 580px) 100vw, 320px" alt={type === "event" ? "Case filled with golden honey wine bottles" : "Orit Tej honey wine bottle and glass"} /><div><p>{type === "event" ? "Orit Tej Cases" : "Orit Tej"}</p><small>{formatMoney(unitPrice)} per {type === "event" ? "case" : "bottle"}</small><div className="club-quantity"><button type="button" disabled={quantity <= min} onClick={() => setQuantity((value) => value - 1)}>−</button><strong>{quantity}</strong><button type="button" disabled={quantity >= max} onClick={() => setQuantity((value) => value + 1)}>+</button></div></div></div>
        {type === "event" ? <p className="club-minimum">* Minimum order of 2 cases</p> : null}
        <div className="club-total-list">
          {type === "event" ? <p><span>Cases</span><strong>{formatMoney(unitPrice)} x {quantity}</strong></p> : null}
          {type === "event" ? <><p><span>Case subtotal</span><strong>{formatMoney(unitPrice * quantity)}</strong></p><p><span>Transportation fee</span><strong>{formatMoney(transportation)}</strong></p></> : null}
          <p className="club-total-list__total"><span>Total</span><strong>{formatMoney(total)}</strong></p>
        </div>
        {type === "event" ? <div className="club-disclaimer"><strong>Disclaimer: All orders must be picked up after 3 days.</strong></div> : null}
        <label className="club-check club-check--age"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /><span>I confirm that I am 21yrs or older and will present a valid government issued photo ID at pickup</span></label>
        {error ? <p className="club-error" role="alert">{error}</p> : null}
        <button className="club-button club-button--green" type="button" disabled={!ageConfirmed || busy} onClick={placeOrder}>{busy ? (type === "event" ? "Processing…" : "Sending order…") : `Pay ${formatMoney(total)} and Place Order`}</button>
      </ClubSection>
    );
  }

  if (step === "confirmation" && order) return <OrderConfirmation order={order} user={user} navigate={navigate} />;
  return null;
}

function OrderConfirmation({ order, user, navigate }: { order: CreatedOrder; user: ClubUser; navigate: Navigate }) {
  const event = order.orderType === "event";
  return <ClubSection title={event ? "THANK YOU!" : "Show this QR at pickup"}><div className="club-confirmation"><QrCode value={order.pickupUrl} label="One-time order pickup QR code" />{event ? <strong>Pickup will be ready after 3 days.</strong> : null}<p>The QR code deactivates after pickup.</p><dl><div><dt>Customer</dt><dd>{user.firstName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Quantity</dt><dd>{order.quantity} {event ? "cases" : "bottles"}</dd></div><div><dt>Paid</dt><dd>{formatMoney(order.totalCents)}</dd></div><div><dt>Pickup</dt><dd>{order.locationName}</dd></div></dl><div className="club-notice"><strong>Valid ID required at pickup.</strong></div><button className="club-button club-button--green" type="button" onClick={() => navigate("home")}>Done</button></div></ClubSection>;
}

export function ActiveOrders({ user, navigate }: { user: ClubUser; navigate: Navigate }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selected, setSelected] = useState<CreatedOrder>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    clubApi<{ orders: PurchaseOrder[] }>("/api/orders?status=pending").then((result) => setOrders(result.orders)).catch((caught) => setError(caught instanceof Error ? caught.message : "Orders could not load.")).finally(() => setLoading(false));
  }, [refresh]);

  async function open(order: PurchaseOrder) {
    setError(undefined);
    try {
      const result = await clubApi<{ pickupUrl: string }>(`/api/orders/${order.id}/pickup`, { method: "POST", body: JSON.stringify({}) });
      setSelected({ ...order, pickupUrl: result.pickupUrl });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The QR code could not be opened."); }
  }

  if (selected) return <ClubSection title={selected.orderType === "event" ? "THANK YOU!" : "Show this QR at pickup"} onBack={() => setSelected(undefined)}><div className="club-confirmation"><QrCode value={selected.pickupUrl} />{selected.orderType === "event" ? <strong>Pickup will be ready after 3 days.</strong> : null}<p>The QR code deactivates after pickup.</p><dl><div><dt>Customer</dt><dd>{user.firstName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Quantity</dt><dd>{selected.quantity} {selected.orderType === "event" ? "cases" : "bottles"}</dd></div><div><dt>Paid</dt><dd>{formatMoney(selected.totalCents)}</dd></div><div><dt>Pickup</dt><dd>{selected.locationName}</dd></div></dl><div className="club-notice"><strong>Valid ID required at pickup.</strong></div><button className="club-button club-button--green" type="button" onClick={() => navigate("home")}>Done</button></div></ClubSection>;

  return <ClubSection title="Pickup Orders"><div className="club-inline-actions"><button className="club-button club-button--quiet" type="button" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh</button></div>{loading ? <div className="club-loading">Loading active orders…</div> : orders.length === 0 ? <div className="club-empty"><OrdersIcon /><strong>No Active Pickup Orders</strong><p>Pending orders will appear here until pickup is complete.</p></div> : <div className="club-order-list">{orders.map((order) => <button type="button" key={order.id} onClick={() => open(order)}><span><strong>Order {order.id.slice(0, 8).toUpperCase()}</strong><small>Date: {formatDate(order.createdAt)} · Location: {order.locationName}<br />Quantity: {order.quantity} {order.orderType === "event" ? "cases" : "bottles"} · Total: {formatMoney(order.totalCents)}</small></span><b>View Pickup QR</b><ArrowIcon /></button>)}</div>}{error ? <p className="club-error" role="alert">{error}</p> : null}</ClubSection>;
}

type BenefitResponse = {
  active: boolean;
  status: string;
  nextEligibleAt: string | null;
  benefit: null | { code: string; status: string; expiresAt: string };
};

export function MembershipGift() {
  const [benefit, setBenefit] = useState<BenefitResponse>();
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { clubApi<BenefitResponse>("/api/member-benefit").then((result) => { setBenefit(result); setError(undefined); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Benefit could not load.")); }, [refresh]);
  return <ClubSection title="Benefits">{error ? <div className="club-empty"><p>{error}</p><button className="club-button club-button--quiet" type="button" onClick={() => setRefresh((value) => value + 1)}>Try Again</button></div> : !benefit ? <div className="club-loading">Loading benefit…</div> : <div className="club-benefit-pass"><h2>{benefit.active ? "Active" : "Not Active"}</h2><QrCode value={benefit.benefit?.code ?? "ORIT-BENEFIT-INACTIVE"} active={benefit.active} label={benefit.active ? "Active complimentary bottle QR code" : "Inactive complimentary bottle QR code"} />{benefit.active && benefit.benefit ? <strong>Active Through {formatDate(benefit.benefit.expiresAt)}</strong> : null}<div className="club-notice">A complimentary bottle becomes available every two months. Each QR code expires at the end of its active month or immediately after it is scanned. Unused benefits do not accumulate.</div><button className="club-button club-button--quiet" type="button" onClick={() => setRefresh((value) => value + 1)}>Refresh Status</button></div>}</ClubSection>;
}
