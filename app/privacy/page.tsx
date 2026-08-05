import type { Metadata } from "next";

import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Orit Tej collects, uses, protects, and deletes personal information.",
};

const collectedData = [
  {
    category: "Account and identity",
    examples: "Name, birthdate, email, account ID, and vendor business details.",
    purpose:
      "Create and secure accounts, confirm alcohol eligibility, and identify orders at pickup.",
  },
  {
    category: "Payment information",
    examples:
      "Stripe customer and payment-method references, card brand, last four digits, expiration, and billing ZIP.",
    purpose:
      "Process purchases, renew memberships with consent, prevent fraud, and provide payment support.",
  },
  {
    category: "Purchases and membership",
    examples:
      "Orders, quantities, totals, pickup location, membership status, benefits, and pickup completion.",
    purpose:
      "Fulfill orders, administer benefits, maintain records, and provide customer service.",
  },
  {
    category: "Support and messages",
    examples: "Support concerns, notification status, and communications.",
    purpose: "Respond to requests and provide service-related updates.",
  },
  {
    category: "Security and technical data",
    examples:
      "Session identifiers, limited request and security logs, hashed network identifiers, and basic website analytics.",
    purpose:
      "Keep the service reliable, prevent abuse, diagnose problems, and protect accounts.",
  },
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="page-hero page-hero--honey page-hero--centered legal-hero">
            <div>
              <p className="kicker" data-page-intro>Legal</p>
              <h1 data-page-intro>Privacy Policy</h1>
              <p data-page-intro>Effective August 5, 2026</p>
            </div>
          </section>

          <article className="section legal-policy">
            <p className="legal-policy__lead">
              This Privacy Policy explains how Orit Tej collects, uses,
              discloses, retains, and protects personal information through the
              Orit Tej mobile application, website, ordering service, and
              related customer and vendor services.
            </p>

            <section>
              <h2>Notice at collection</h2>
              <p>
                We collect the categories below when you create an account,
                make a purchase, join the wine club, register as a vendor,
                contact support, or use a pickup QR code. We use this
                information only for the purposes described here.
              </p>
              <div className="legal-data-list">
                {collectedData.map((item) => (
                  <div key={item.category}>
                    <h3>{item.category}</h3>
                    <p><strong>Examples:</strong> {item.examples}</p>
                    <p><strong>Why we use it:</strong> {item.purpose}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Age and identification</h2>
              <p>
                Alcohol purchases are limited to people age 21 or older. We
                collect your birthdate to determine eligibility. At pickup, a
                store employee records that valid government identification
                was presented and age was verified. Orit Tej does not ask the
                app or pickup website to store an identification number,
                photograph, or copy.
              </p>
            </section>

            <section>
              <h2>How information is collected</h2>
              <p>
                We collect information directly from you, automatically when
                you use our services, from payment processor Stripe when a
                payment or saved card is confirmed, and from participating
                pickup locations when an order is completed.
              </p>
            </section>

            <section>
              <h2>How information is disclosed</h2>
              <p>
                We disclose information only as needed to operate the service:
                Stripe processes payments; Vercel hosts the website and API;
                Neon hosts the database; Resend delivers transactional email;
                Apple distributes the iOS app; and participating pickup
                locations receive the name, email, quantity, membership
                indicator, and pickup details needed to fulfill an order.
                These providers are expected to protect information consistent
                with their contracts and applicable law.
              </p>
              <p>
                We do not sell personal information. We do not share personal
                information for cross-context behavioral advertising, and the
                app does not use third-party advertising tracking.
              </p>
            </section>

            <section>
              <h2>Retention and deletion</h2>
              <p>
                Account information is retained while your account is active.
                When you delete your account, active sessions are revoked,
                membership renewal is stopped, and the saved Stripe billing
                profile is removed. We may retain transaction, consent,
                security, tax, and support records for the period reasonably
                necessary to meet legal, accounting, fraud-prevention, dispute,
                and compliance obligations. We delete or de-identify
                information when it is no longer needed for those purposes.
              </p>
            </section>

            <section>
              <h2>Your choices and California privacy rights</h2>
              <p>
                You can change your email and payment method, cancel or change
                membership options, and delete your account in Settings. You
                may also ask to know, access, correct, or delete personal
                information by contacting us. We may verify your identity
                before completing a request. We will not discriminate against
                you for exercising an applicable privacy right.
              </p>
              <p>
                Because we do not sell or share personal information for
                behavioral advertising, we do not provide a “Do Not Sell or
                Share” link. We do not respond differently to browser Do Not
                Track signals. Where legally required, we will treat a valid
                Global Privacy Control signal as a request to opt out of sale
                or sharing.
              </p>
            </section>

            <section>
              <h2>Security</h2>
              <p>
                We use reasonable administrative, technical, and organizational
                safeguards, including encrypted network connections, secured
                session storage, access controls, and payment processing
                through Stripe. No system can guarantee absolute security.
              </p>
            </section>

            <section>
              <h2>Children and alcohol eligibility</h2>
              <p>
                The service is not directed to children and is not available
                for alcohol purchases by anyone under 21. We do not knowingly
                create alcohol-purchasing accounts for people under 21.
              </p>
            </section>

            <section>
              <h2>Changes to this policy</h2>
              <p>
                We may update this policy when our practices or legal
                requirements change. We will post the updated policy here with
                a new effective date and provide additional notice when
                required.
              </p>
            </section>

            <section>
              <h2>Contact us</h2>
              <p>
                For privacy requests or questions, email{" "}
                <a href="mailto:orittej.comments@gmail.com">
                  orittej.comments@gmail.com
                </a>{" "}
                or call <a href="tel:+15102700840">(510) 270-0840</a>.
              </p>
            </section>
          </article>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}
