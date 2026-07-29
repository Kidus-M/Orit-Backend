import type { Metadata } from "next";

import { ArrowRightIcon } from "@/components/arrow-right-icon";
import { ContactForm } from "@/components/contact-form";
import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Orit Tej in the Bay Area.",
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
                  <a href="mailto:orittej@gmail.com">
                    orittej@gmail.com
                  </a>
                </div>
                <div>
                  <p className="eyebrow">Phone</p>
                  <a href="tel:+15102700840">(510) 270-0840</a>
                </div>
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
              href="mailto:orittej@gmail.com?subject=Orit%20Tej%20pickup%20partnership"
            >
              Start a conversation <ArrowRightIcon />
            </a>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}

