import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Orit Tej or find the current pickup location in San Jose, California.",
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="page-hero page-hero--honey">
            <div>
              <p className="kicker" data-page-intro>
                Contact us
              </p>
              <h1 data-page-intro>There is always room at our table.</h1>
              <p data-page-intro>
                Questions about Orit Tej, membership, pickup, or partnering
                with us? We would love to hear from you.
              </p>
            </div>
          </section>

          <section className="section contact-layout">
            <div className="contact-details" data-reveal>
              <p className="kicker">Get in touch</p>
              <h2 className="display-heading">Say hello.</h2>
              <div className="contact-list">
                <div>
                  <p className="eyebrow">Email</p>
                  <a href="mailto:orittej.comments@gmail.com">
                    orittej.comments@gmail.com
                  </a>
                </div>
                <div>
                  <p className="eyebrow">Phone</p>
                  <a href="tel:+14157243664">(415) 724-3664</a>
                </div>
              </div>

              <div className="contact-pickup-card">
                <p className="eyebrow">Current pickup location</p>
                <h3>Leyou Ethiopian</h3>
                <address>
                  1100 N First St, Suite C
                  <br />
                  San Jose, CA 95112
                </address>
                <p>Monday-Sunday Â· 5:30 PM-9:00 PM</p>
                <a
                  className="text-link text-link--wine"
                  href="https://maps.google.com/?q=1100+N+First+St+Ste+C+San+Jose+CA+95112"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in maps <span aria-hidden="true">-&gt;</span>
                </a>
              </div>
            </div>

            <div className="contact-form-wrap" data-reveal>
              <ContactForm />
            </div>
          </section>

          <section className="partnership-band" data-reveal>
            <div>
              <p className="kicker kicker--light">For restaurants and shops</p>
              <h2>Interested in becoming a pickup partner?</h2>
            </div>
            <a
              className="button button--honey"
              href="mailto:orittej.comments@gmail.com?subject=Orit%20Tej%20pickup%20partnership"
            >
              Start a conversation <span aria-hidden="true">-&gt;</span>
            </a>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}

