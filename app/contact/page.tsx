import type { Metadata } from "next";

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
          <section className="page-hero page-hero--honey page-hero--centered contact-hero">
            <div>
              <p className="kicker contact-hero__kicker" data-page-intro>
                Contact
              </p>
              <h1 data-page-intro>We would love to hear from you.</h1>
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
                  <a href="tel:+15102700840">(510) 270-0840</a>
                </div>
              </div>

            </div>

            <div className="contact-form-wrap" data-reveal>
              <ContactForm />
            </div>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}
