"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  PRIVACY_POLICY_VERSION,
  VENDOR_COMPLIANCE_VERSION,
} from "@/lib/compliance-versions";
import { clubApi, isAtLeast21 } from "@/lib/web-app/api";
import { PrivacyPolicyContent } from "./club-account";
import { ArrowIcon, BottleIcon, CheckIcon, DesktopIcon } from "./club-icons";

type Navigate = (view: string) => void;

function ErrorMessage({ message }: { message?: string }) {
  return message ? <p className="club-error" role="alert">{message}</p> : null;
}

function PinInput({ name, label, helperText }: { name: string; label: string; helperText?: string }) {
  return (
    <label className="club-field">
      <span>{label}</span>
      <input
        name={name}
        inputMode="numeric"
        autoComplete={name === "pin" ? "current-password" : "new-password"}
        minLength={4}
        maxLength={4}
        pattern="[0-9]{4}"
        placeholder="••••"
        required
      />
      {helperText ? <small>{helperText}</small> : null}
    </label>
  );
}

export function ClubLogin({ navigate, onAuthenticated }: { navigate: Navigate; onAuthenticated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    try {
      await clubApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("pin") }),
      });
      await onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicPanel title="Welcome back" summary="Sign in on a new device. This device will remember you.">
      <form className="club-form" onSubmit={submit}>
        <label className="club-field">
          <span>Email address</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <PinInput name="pin" label="4-digit PIN" helperText="Enter the PIN you created when you joined." />
        <ErrorMessage message={error} />
        <button className="club-button club-button--green" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}<ArrowIcon />
        </button>
      </form>
      <button className="club-text-button" type="button" onClick={() => navigate("signup")}>
        New member? Create an account
      </button>
    </PublicPanel>
  );
}

export function ClubSignup({ navigate, onAuthenticated }: { navigate: Navigate; onAuthenticated: () => Promise<void> }) {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [type, setType] = useState<"customer" | "vendor">();

  if (!privacyAccepted) {
    return <PublicPanel title="Privacy Policy" summary="Effective August 5, 2026" wide policy><PrivacyPolicyContent /><label className="club-check"><input type="checkbox" checked={privacyChecked} onChange={(event) => setPrivacyChecked(event.target.checked)} /><span>I have read and agree to the Orit Tej Privacy Policy.</span></label><button className="club-button club-button--green" type="button" disabled={!privacyChecked} onClick={() => setPrivacyAccepted(true)}>Agree and Continue<ArrowIcon /></button></PublicPanel>;
  }

  if (type === "customer") {
    return <CustomerSignup navigate={navigate} onAuthenticated={onAuthenticated} onBack={() => setType(undefined)} />;
  }
  if (type === "vendor") {
    return <VendorSignup onAuthenticated={onAuthenticated} onBack={() => setType(undefined)} />;
  }

  return (
    <PublicPanel>
      <div className="club-choice-stack">
        <button className="club-choice" type="button" onClick={() => setType("customer")}>
          <span className="club-choice__icon"><BottleIcon /></span>
          <span><strong>Customer</strong></span>
          <ArrowIcon />
        </button>
        <button className="club-choice" type="button" onClick={() => setType("vendor")}>
          <span className="club-choice__icon"><DesktopIcon /></span>
          <span><strong>Vendor</strong></span>
          <ArrowIcon />
        </button>
      </div>
    </PublicPanel>
  );
}

function CustomerSignup({ navigate, onAuthenticated, onBack }: { navigate: Navigate; onAuthenticated: () => Promise<void>; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dateOfBirth = String(form.get("dateOfBirth"));
    const pin = String(form.get("pin"));
    if (!isAtLeast21(dateOfBirth)) return setError("You must be 21yrs or older to purchase alcohol.");
    if (pin !== form.get("confirmPin")) return setError("PINs do not match.");

    setBusy(true);
    setError(undefined);
    try {
      await clubApi("/api/auth/members/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          dateOfBirth,
          email: form.get("email"),
          password: pin,
          privacyConsent: true,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        }),
      });
      await onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicPanel title="Create Account" onBack={onBack}>
      <form className="club-form" onSubmit={submit}>
        <label className="club-field"><span>First name</span><input name="firstName" autoComplete="given-name" required /></label>
        <label className="club-field"><span>Birthdate</span><input name="dateOfBirth" type="date" autoComplete="bday" required /><small>* Must be over 21yrs to purchase alcohol.</small></label>
        <label className="club-field"><span>Email address</span><input name="email" type="email" autoComplete="email" required /></label>
        <div className="club-form__split">
          <PinInput name="pin" label="Create a 4-digit PIN" helperText="Choose four numbers you can remember." />
          <PinInput name="confirmPin" label="Confirm your PIN" />
        </div>
        <ErrorMessage message={error} />
        <button className="club-button club-button--green" disabled={busy}>{busy ? "Creating account…" : "Continue"}<ArrowIcon /></button>
      </form>
      <button className="club-text-button" type="button" onClick={() => navigate("login")}>Already have an account? Sign in</button>
    </PublicPanel>
  );
}

const vendorRequirements = [
  "Ensure all customers are at least 21 years of age at the time of purchase and present valid government identification.",
  "Extra cases will be provided to the vendor at no cost.",
  "Extra cases cannot be used to replace inventory.",
  "Non-members do not receive wine club benefits but are still able to make a purchase.",
  "Members get one complimentary bottle every two months when the QR code is active.",
  "Members get one complimentary glass with every new purchase, not with each bottle.",
  "If a member declines a complimentary bottle or glass, it cannot be received later and does not accumulate.",
];

function VendorSignup({ onAuthenticated, onBack }: { onAuthenticated: () => Promise<void>; onBack: () => void }) {
  const [step, setStep] = useState<"code" | "details" | "compliance">("code");
  const [vendorCode, setVendorCode] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<boolean[]>(vendorRequirements.map(() => false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    setBusy(true); setError(undefined);
    try {
      await clubApi("/api/auth/vendors/code/verify", { method: "POST", body: JSON.stringify({ code }) });
      setVendorCode(code); setStep("details");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Vendor code could not be verified."); }
    finally { setBusy(false); }
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dateOfBirth = String(form.get("dateOfBirth"));
    if (!isAtLeast21(dateOfBirth)) return setError("You must be 21yrs or older to purchase alcohol.");
    setError(undefined);
    setDetails(Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)])));
    setStep("compliance");
  }

  async function register() {
    setBusy(true); setError(undefined);
    try {
      await clubApi("/api/auth/vendors/register", {
        method: "POST",
        body: JSON.stringify({
          contactName: details.contactName,
          dateOfBirth: details.dateOfBirth,
          businessName: details.businessName,
          businessEmail: details.businessEmail,
          abcLicenseNumber: details.abcLicenseNumber,
          vendorCode,
          privacyConsent: true,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          vendorComplianceConsent: true,
          vendorComplianceVersion: VENDOR_COMPLIANCE_VERSION,
        }),
      });
      await onAuthenticated();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Vendor account creation failed."); }
    finally { setBusy(false); }
  }

  if (step === "code") return (
    <PublicPanel title="Vendor Code" summary="Please enter the vendor code given to you by the admin." onBack={onBack} compact>
      <form className="club-form" onSubmit={verifyCode}>
        <PinInput name="code" label="Vendor code" />
        <ErrorMessage message={error} />
        <button className="club-button club-button--green" disabled={busy}>{busy ? "Checking…" : "Next"}<ArrowIcon /></button>
      </form>
    </PublicPanel>
  );

  if (step === "details") return (
    <PublicPanel title="Vendor Sign Up" onBack={() => setStep("code")}>
      <form className="club-form" onSubmit={saveDetails}>
        <label className="club-field"><span>Your name</span><input name="contactName" required /></label>
        <label className="club-field"><span>Birthdate</span><input name="dateOfBirth" type="date" required /><small>* Must be over 21yrs to purchase alcohol.</small></label>
        <label className="club-field"><span>Business name</span><input name="businessName" required /></label>
        <label className="club-field"><span>California ABC license number</span><input name="abcLicenseNumber" required /></label>
        <label className="club-field"><span>Business email</span><input name="businessEmail" type="email" required /></label>
        <ErrorMessage message={error} />
        <button className="club-button club-button--green">Continue<ArrowIcon /></button>
      </form>
    </PublicPanel>
  );

  const allChecked = checked.every(Boolean);
  return (
    <PublicPanel title="Don't forget..." onBack={() => setStep("details")} wide>
      <div className="club-compliance-list">
        {vendorRequirements.map((requirement, index) => (
          <label className="club-check-card" key={requirement}>
            <input type="checkbox" checked={checked[index]} onChange={(event) => setChecked((current) => current.map((value, item) => item === index ? event.target.checked : value))} />
            <span className="club-check-card__mark"><CheckIcon /></span>
            <span>{requirement}</span>
          </label>
        ))}
      </div>
      <ErrorMessage message={error} />
      <button className="club-button club-button--green club-button--centered" type="button" disabled={!allChecked || busy} onClick={register}>{busy ? "Creating account…" : "Continue"}<ArrowIcon /></button>
    </PublicPanel>
  );
}

export function PublicPanel({ eyebrow, title, summary, children, onBack, compact, wide, policy }: { eyebrow?: string; title?: string; summary?: string; children: React.ReactNode; onBack?: () => void; compact?: boolean; wide?: boolean; policy?: boolean }) {
  return (
    <main id="main-content" className={`club-public ${policy ? "club-public--consent" : ""}`}>
      <Link className="club-public__brand" href="/"><Image src="/orit-tej-bee.png" alt="" width={56} height={56} priority /><span><strong>Orit Tej</strong><small>Wine Club</small></span></Link>
      <section className={`club-public__panel ${compact ? "club-public__panel--compact" : ""} ${wide ? "club-public__panel--wide" : ""}`}>
        {onBack ? <button className="club-back" type="button" onClick={onBack}>← Back</button> : null}
        {eyebrow ? <p className="club-eyebrow">{eyebrow}</p> : null}
        {title ? <h1>{title}</h1> : null}
        {summary ? <p className="club-public__summary">{summary}</p> : null}
        {children}
      </section>
    </main>
  );
}
