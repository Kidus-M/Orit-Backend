"use client";

import { useEffect, useState } from "react";

import { MEMBERSHIP_RENEWAL_TERMS_VERSION } from "@/lib/compliance-versions";
import {
  clubApi,
  formatMoney,
  type MembershipPlan,
  type MembershipState,
} from "@/lib/web-app/api";
import { CheckIcon, GiftIcon, HelpIcon } from "./club-icons";
import { StripePayment } from "./stripe-payment";

const benefits = [
  "List of all participating locations",
  "Quick checkout QR",
  "Complimentary bottle every two months",
  "Complimentary glass of tej with every separate bottle purchase",
  "Event orders are available",
];

export function MembershipEnrollment({
  navigate,
  onUpdated,
}: {
  navigate: (view: string) => void;
  onUpdated: () => Promise<void>;
}) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selected, setSelected] = useState<MembershipPlan>();
  const [noMembership, setNoMembership] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    clubApi<{ plans: MembershipPlan[] }>("/api/membership/plans")
      .then(({ plans: items }) => {
        setPlans(items);
        setSelected(items[0]);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Membership plans could not load."));
  }, []);

  async function finishNoMembership() {
    await clubApi("/api/membership", {
      method: "PATCH",
      body: JSON.stringify({ planCode: "non_member" }),
    });
    await onUpdated();
    navigate("home");
  }

  async function finishMembership() {
    await onUpdated();
    navigate("home");
  }

  if (checkout) {
    return (
      <ClubSection
        title={noMembership ? "Payment Method" : "Membership Payment"}
        onBack={() => setCheckout(false)}
      >
        {selected && !noMembership ? (
          <div className="club-renewal-card">
            <div className="club-renewal-card__heading">
              <span className="club-renewal-card__icon">↻</span>
              <div><strong>{formatMoney(selected.priceCents)} every {selected.durationMonths === 1 ? "month" : `${selected.durationMonths} months`}</strong><small>{selected.name} membership</small></div>
            </div>
            <label className="club-check club-check--terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span><strong>{accepted ? "Renewal terms accepted" : "Tap to accept renewal terms"}</strong><small>I authorize Orit Tej to charge my saved payment method {formatMoney(selected.priceCents)} every {selected.durationMonths === 1 ? "month" : `${selected.durationMonths} months`} until I cancel in Settings.</small></span></label>
            <button className="club-help-link" type="button" onClick={() => navigate("help")}><HelpIcon />Questions about membership? Get help</button>
          </div>
        ) : null}
        {noMembership ? (
          <StripePayment purpose="setup" heading="Save Card Securely With Stripe" description="Tap below to enter your card and billing ZIP in Stripe PaymentSheet." footnote="Card details are collected by Stripe and are never stored by Orit Tej." buttonLabel="Save Payment Method" onSuccess={finishNoMembership} />
        ) : selected && accepted ? (
          <StripePayment purpose="membership" planCode={selected.code} description="Tap below to enter your card and billing ZIP in Stripe PaymentSheet." footnote="Card details are collected by Stripe and are never stored by Orit Tej." buttonLabel={`Pay ${formatMoney(selected.priceCents)}`} onSuccess={finishMembership} />
        ) : null}
      </ClubSection>
    );
  }

  return (
    <ClubSection title="Choose A Membership">
      <div className="club-plan-list">
        {plans.map((plan) => {
          const active = !noMembership && selected?.id === plan.id;
          return <button className={`club-plan ${active ? "is-selected" : ""}`} type="button" key={plan.id} onClick={() => { setSelected(plan); setNoMembership(false); }}><span className="club-plan__select">{active ? <CheckIcon /> : null}</span><span><strong>{plan.name}</strong><small>${plan.priceCents / 100} total</small></span></button>;
        })}
        <button className={`club-plan ${noMembership ? "is-selected" : ""}`} type="button" onClick={() => setNoMembership(true)}><span className="club-plan__select">{noMembership ? <CheckIcon /> : null}</span><span><strong>No Membership</strong></span></button>
      </div>
      <MembershipBenefits />
      {!noMembership ? <div className="club-auto-renew">↻ <strong>Selected Plan Renews Automatically</strong></div> : null}
      {error ? <p className="club-error" role="alert">{error}</p> : null}
      <button className="club-button club-button--green" type="button" disabled={!selected && !noMembership} onClick={() => setCheckout(true)}>{noMembership ? "Continue to Payment Method" : "Continue to Payment"}</button>
    </ClubSection>
  );
}

export function MembershipOptions({
  membership,
  onUpdated,
}: {
  membership: MembershipState;
  onUpdated: () => Promise<void>;
}) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [consentPlan, setConsentPlan] = useState<MembershipPlan>();
  const [confirmNonMember, setConfirmNonMember] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    clubApi<{ plans: MembershipPlan[] }>("/api/membership/plans").then((result) => setPlans(result.plans)).catch((caught) => setError(caught instanceof Error ? caught.message : "Plans could not load."));
  }, []);

  async function change(planCode: string) {
    setBusy(true); setError(undefined);
    try {
      await clubApi("/api/membership", {
        method: "PATCH",
        body: JSON.stringify(planCode === "non_member" ? { planCode } : { planCode, autoRenewConsent: true, renewalTermsVersion: MEMBERSHIP_RENEWAL_TERMS_VERSION }),
      });
      setConsentPlan(undefined); setConfirmNonMember(false); setAccepted(false); await onUpdated();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Membership could not be changed."); }
    finally { setBusy(false); }
  }

  return (
    <ClubSection title="Membership Options" summary="Choose the option that works best for you.">
      <div className="club-plan-list">
        {plans.map((plan) => <button className={`club-plan ${membership.membership?.planCode === plan.code ? "is-current" : ""}`} type="button" key={plan.id} disabled={busy} onClick={() => { setConsentPlan(plan); setAccepted(false); }}><span className="club-plan__select">{membership.membership?.planCode === plan.code ? <CheckIcon /> : null}</span><span><strong>{plan.name}</strong><small>{formatMoney(plan.priceCents)} • Renews automatically</small></span>{membership.membership?.planCode === plan.code ? <em>Current</em> : null}</button>)}
        <button className={`club-plan club-plan--danger ${membership.isNonMember ? "is-current" : ""}`} type="button" disabled={busy || membership.isNonMember} onClick={() => setConfirmNonMember(true)}><span className="club-plan__select">{membership.isNonMember ? <CheckIcon /> : null}</span><span><strong>Become a Non-Member</strong><small>Keep paid bottle ordering without complimentary benefits.</small></span>{membership.isNonMember ? <em>Current</em> : null}</button>
      </div>
      {consentPlan ? <div className="club-renewal-card"><strong>Change Membership?</strong><p>Your saved card will be charged {formatMoney(consentPlan.priceCents)}.</p><label className="club-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I agree that this {consentPlan.name} membership renews every {consentPlan.name} and Orit Tej may charge my saved payment method until I cancel in Settings.</span></label><div className="club-inline-actions"><button className="club-button club-button--quiet" type="button" onClick={() => setConsentPlan(undefined)}>Cancel</button><button className="club-button club-button--green" type="button" disabled={!accepted || busy} onClick={() => change(consentPlan.code)}>Confirm Change</button></div></div> : null}
      {confirmNonMember ? <div className="club-renewal-card"><strong>Become a Non-Member?</strong><p>Complimentary Bottle Benefits will no longer be available. You can still place and collect paid bottle orders.</p><div className="club-inline-actions"><button className="club-button club-button--quiet" type="button" onClick={() => setConfirmNonMember(false)}>Keep Membership</button><button className="club-button club-button--green" type="button" disabled={busy} onClick={() => change("non_member")}>Become a Non-Member</button></div></div> : null}
      {error ? <p className="club-error" role="alert">{error}</p> : null}
    </ClubSection>
  );
}

export function MembershipBenefits() {
  return <section className="club-benefits-list"><div className="club-benefits-list__title"><GiftIcon /><h2>Membership Benefits</h2></div>{benefits.map((benefit) => <p key={benefit}><span><CheckIcon /></span>{benefit}</p>)}</section>;
}

export function ClubSection({ eyebrow, title, summary, children, onBack }: { eyebrow?: string; title?: string; summary?: string; children: React.ReactNode; onBack?: () => void }) {
  return <section className="club-section">{onBack ? <button className="club-back" type="button" onClick={onBack}>← Back</button> : null}{eyebrow ? <p className="club-eyebrow">{eyebrow}</p> : null}{title ? <h1>{title}</h1> : null}{summary ? <p className="club-section__summary">{summary}</p> : null}<div className="club-section__body">{children}</div></section>;
}
