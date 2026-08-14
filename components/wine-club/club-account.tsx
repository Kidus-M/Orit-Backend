"use client";

import { useEffect, useState, type FormEvent } from "react";

import { clubApi, formatDate, isAtLeast21, type ClubUser } from "@/lib/web-app/api";
import { ArrowIcon, CardIcon, HelpIcon, MessageIcon, SettingsIcon } from "./club-icons";
import { ClubSection } from "./club-membership";
import { StripePayment } from "./stripe-payment";

type Navigate = (view: string) => void;

export function ClubSettings({
  user,
  navigate,
  onDeleted,
}: {
  user: ClubUser;
  navigate: Navigate;
  onDeleted: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function deleteAccount() {
    const warning = user.isVendor
      ? "This deletes your vendor account and saved payment method."
      : "This removes your membership, saved payment method, and account information.";
    if (!window.confirm(`Delete account?\n\n${warning}`)) return;
    setDeleting(true); setError(undefined);
    try { await clubApi("/api/account", { method: "DELETE" }); await onDeleted(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Account could not be deleted."); setDeleting(false); }
  }

  return <ClubSection title="Settings">
    <div className="club-settings-list">
      <SettingsRow title="Change email" icon={<SettingsIcon />} onClick={() => navigate("email")} />
      {!user.isVendor ? <SettingsRow title="Membership options" icon={<MessageIcon />} onClick={() => navigate("membership-options")} /> : null}
      <SettingsRow title="Payment options" icon={<CardIcon />} onClick={() => navigate("payment-options")} />
      <SettingsRow title="Privacy Policy" icon={<SettingsIcon />} onClick={() => navigate("privacy")} />
      <SettingsRow title="Help" icon={<HelpIcon />} onClick={() => navigate("help")} />
      <button className="club-settings-row club-settings-row--danger" type="button" disabled={deleting} onClick={deleteAccount}><span className="club-settings-row__icon">×</span><strong>{deleting ? "Deleting account…" : "Delete account"}</strong><ArrowIcon /></button>
    </div>
    {error ? <p className="club-error" role="alert">{error}</p> : null}
  </ClubSection>;
}

function SettingsRow({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return <button className="club-settings-row" type="button" onClick={onClick}><span className="club-settings-row__icon">{icon}</span><strong>{title}</strong><ArrowIcon /></button>;
}

export function ChangeEmail({ user, onUpdated, navigate }: { user: ClubUser; onUpdated: () => Promise<void>; navigate: Navigate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(undefined);
    try { await clubApi("/api/account", { method: "PATCH", body: JSON.stringify({ email: new FormData(event.currentTarget).get("email") }) }); await onUpdated(); navigate("settings"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Email could not be changed."); }
    finally { setBusy(false); }
  }
  return <ClubSection title="Change email" onBack={() => navigate("settings")}><form className="club-form club-form--narrow" onSubmit={submit}><label className="club-field"><span>Email address</span><input name="email" type="email" defaultValue={user.email} required /></label>{error ? <p className="club-error" role="alert">{error}</p> : null}<button className="club-button club-button--green" disabled={busy}>{busy ? "Saving…" : "Save email"}</button></form></ClubSection>;
}

export function AgeDetails({ onUpdated }: { onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateOfBirth = String(new FormData(event.currentTarget).get("dateOfBirth"));
    if (!isAtLeast21(dateOfBirth)) {
      setError("You must be 21 or older to purchase alcohol.");
      return;
    }
    setBusy(true); setError(undefined);
    try {
      await clubApi("/api/account", { method: "PATCH", body: JSON.stringify({ dateOfBirth }) });
      await onUpdated();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Birthdate could not be saved."); }
    finally { setBusy(false); }
  }
  return <ClubSection title="Age Verification" summary="Enter your birthdate before making an alcohol purchase."><form className="club-form club-form--narrow" onSubmit={submit}><label className="club-field"><span>Birthdate</span><input name="dateOfBirth" type="date" autoComplete="bday" required /><small>* Must be over 21yrs to purchase alcohol.</small></label>{error ? <p className="club-error" role="alert">{error}</p> : null}<button className="club-button club-button--green" disabled={busy}>{busy ? "Saving…" : "Continue"}</button></form></ClubSection>;
}

export function PaymentOptions({ navigate }: { navigate: Navigate }) {
  const [saved, setSaved] = useState(false);
  return <ClubSection title="Change credit card" summary="Replace the card saved for future payments." onBack={() => navigate("settings")}>{saved ? <div className="club-success"><strong>Credit card updated</strong><button className="club-button club-button--green" type="button" onClick={() => navigate("settings")}>Done</button></div> : <StripePayment purpose="setup" description="Your card and ZIP are entered in Stripe's secure PaymentSheet." footnote="Your full card number is collected by Stripe and is not stored by Orit Tej." buttonLabel="Save new card" onSuccess={() => setSaved(true)} />}</ClubSection>;
}

export function ConcernForm({ navigate }: { navigate: Navigate }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(undefined);
    try { await clubApi("/api/concerns", { method: "POST", body: JSON.stringify({ message }) }); setSubmitted(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Your request could not be sent."); }
    finally { setBusy(false); }
  }
  if (submitted) return <ClubSection title="Request Submitted" summary="Your request has been submitted. We will get back to you shortly." onBack={() => navigate("settings")}><button className="club-button club-button--green" type="button" onClick={() => navigate("settings")}>Return to Home</button></ClubSection>;
  return <ClubSection title="Make Your Concern Known" summary="Enter your concern below so our team can help." onBack={() => navigate("settings")}><form className="club-form club-form--narrow" onSubmit={submit}><label className="club-field"><span>Your concern</span><textarea value={message} minLength={10} maxLength={50} rows={5} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what you need help with..." required /><small>{message.length}/50 characters</small></label>{error ? <p className="club-error" role="alert">{error}</p> : null}<button className="club-button club-button--green" disabled={busy || message.trim().length < 10}>{busy ? "Submitting…" : "Submit"}</button></form></ClubSection>;
}

type ClubMessage = { id: string; title: string; body: string; readAt: string | null; createdAt: string };

export function MessageCenter() {
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  useEffect(() => {
    clubApi<{ messages: ClubMessage[] }>("/api/messages").then(async (result) => {
      setMessages(result.messages);
      await Promise.all(result.messages.filter((message) => !message.readAt).map((message) => clubApi(`/api/messages/${message.id}/read`, { method: "POST", body: JSON.stringify({}) }).catch(() => undefined)));
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Messages could not load.")).finally(() => setLoading(false));
  }, []);
  return <ClubSection title="Message center"><div className="club-notice">This inbox is read-only. Messages are sent by Orit Tej.</div>{loading ? <div className="club-loading">Loading messages…</div> : messages.length === 0 ? null : <div className="club-message-list">{messages.map((message) => <article key={message.id} className={!message.readAt ? "is-unread" : ""}><div><strong>{message.title}</strong><time>{formatDate(message.createdAt)}</time></div><p>{message.body}</p></article>)}</div>}{error ? <p className="club-error" role="alert">{error}</p> : null}</ClubSection>;
}

export const privacySections = [
  ["Overview", "This Privacy Policy explains how Orit Tej collects, uses, discloses, retains, and protects personal information through the Orit Tej mobile application, website, ordering service, and related customer and vendor services. Effective August 5, 2026."],
  ["Notice at collection", "We collect account and identity information such as name, birthdate, email, account ID, and vendor business details; payment references and masked card details supplied by Stripe; membership, purchase, pickup, and benefit history; support messages; session and limited security data. We use this information to create and secure accounts, confirm alcohol eligibility, process payments, fulfill pickups, administer memberships and benefits, provide support, prevent fraud, and maintain the service."],
  ["Age and identification", "Alcohol purchases are limited to people age 21 or older. We collect your birthdate to determine eligibility. At pickup, a store employee records that valid government identification was presented and age was verified. Orit Tej does not ask the app or pickup website to store an identification number, photograph, or copy."],
  ["How information is collected", "We collect information directly from you, automatically when you use our services, from Stripe when a payment or saved card is confirmed, and from participating pickup locations when an order is completed."],
  ["Service providers and pickup partners", "Stripe processes payments; Vercel hosts the website and API; Neon hosts the database; Resend delivers transactional email; Apple distributes the iOS app; and participating pickup locations receive the name, email, quantity, membership indicator, and pickup details needed to fulfill an order. These providers are expected to protect information consistent with their contracts and applicable law."],
  ["Sale, sharing, and tracking", "We do not sell personal information or share it for cross-context behavioral advertising. The app does not use third-party advertising tracking. Basic website analytics and operational logs may be used to understand performance and protect the service."],
  ["Retention and deletion", "Account information is retained while your account is active. When you delete your account, sessions are revoked, membership renewal is stopped, and the saved Stripe billing profile is removed. Transaction, consent, security, tax, and support records may be retained for the period reasonably necessary for legal, accounting, fraud-prevention, dispute, and compliance obligations. Information is deleted or de-identified when no longer needed."],
  ["Your choices and California privacy rights", "You can change your email and payment method, manage membership options, and delete your account in Settings. You may ask to know, access, correct, or delete personal information by contacting us. We may verify your identity before completing a request and will not discriminate against you for exercising an applicable privacy right."],
  ["Do Not Track and Global Privacy Control", "Because we do not sell or share personal information for behavioral advertising, we do not provide a Do Not Sell or Share link. We do not respond differently to browser Do Not Track signals. Where legally required, a valid Global Privacy Control signal will be treated as a request to opt out of sale or sharing."],
  ["Security", "We use reasonable safeguards, including encrypted network connections, secured session storage, access controls, and payment processing through Stripe. No system can guarantee absolute security."],
  ["Children and alcohol eligibility", "The service is not directed to children and is not available for alcohol purchases by anyone under 21. We do not knowingly create alcohol-purchasing accounts for people under 21."],
  ["Policy changes and contact", "We may update this policy when practices or legal requirements change and will post a new effective date. For privacy requests or questions, email orittej.comments@gmail.com or call (510) 270-0840."],
];

export function ClubPrivacy({ navigate, authenticated }: { navigate: Navigate; authenticated: boolean }) {
  return <ClubSection title="Privacy Policy" summary="Effective August 5, 2026" onBack={() => navigate(authenticated ? "settings" : "signup")}><PrivacyPolicyContent /></ClubSection>;
}

export function PrivacyPolicyContent() {
  return <div className="club-policy">{privacySections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div>;
}
