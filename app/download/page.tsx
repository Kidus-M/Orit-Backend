import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import androidRelease from "@/public/downloads/android-update.json";
import { ArrowRightIcon } from "@/components/arrow-right-icon";
import {
  AndroidLogoIcon,
  AppleLogoIcon,
} from "@/components/device-platform-icons";
import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Get the App",
  description:
    "Download the Orit Tej wine club app for Android and preview the planned iPhone release.",
};

const features = [
  "Keep your membership details in one place",
  "Order bottles for pickup at a participating location",
  "Return to pending orders and pickup QR codes anytime",
];

export default function DownloadPage() {
  const androidReady =
    androidRelease.enabled &&
    androidRelease.apkUrl.toLowerCase().endsWith(".apk");

  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="page-hero page-hero--honey">
            <div>
              <p className="kicker" data-page-intro>
                The Orit Tej app
              </p>
              <h1 data-page-intro>Your wine club, close at hand.</h1>
              <p data-page-intro>
                Membership, ordering, pickup, and your QR codes in one simple
                place.
              </p>
            </div>
          </section>

          <section className="section download-intro">
            <div className="phone-stage phone-stage--large" data-reveal>
              <div className="phone-mockup">
                <div className="phone-mockup__bar" />
                <Image
                  src="/app-icon.png"
                  alt="Orit Tej app icon with a cartoon wine bottle and honey jar"
                  width={220}
                  height={220}
                  priority
                />
                <p>Orit Tej</p>
                <span>Wine club</span>
                <div className="phone-mockup__button">Enter</div>
              </div>
              <div className="honey-orbit honey-orbit--one" />
              <div className="honey-orbit honey-orbit--two" />
            </div>
            <div className="download-intro__copy" data-reveal>
              <p className="kicker">Made for members</p>
              <h2 className="display-heading">
                Less waiting. More time around the table.
              </h2>
              <p className="lead">
                The app makes each step from membership to pickup clear and
                quick, without losing the personal feeling behind Orit Tej.
              </p>
              <ul className="feature-list">
                {features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">{"\u2713"}</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="download-options">
            <div className="section">
              <div className="section-heading" data-reveal>
                <div>
                  <p className="kicker kicker--light">
                    {androidReady ? "Available now" : "Coming soon"}
                  </p>
                  <h2 className="display-heading">Choose your device.</h2>
                </div>
                <p>
                  Android testers can install the latest APK here. The iPhone
                  app is planned for a later release.
                </p>
              </div>
              <div className="store-grid" data-stagger>
                <article className="store-card store-card--android">
                  <div className="store-card__top">
                    <div className="store-card__icon">
                      <AndroidLogoIcon />
                    </div>
                    <span className="status-pill">
                      {androidReady ? "Ready" : "Coming soon"}
                    </span>
                  </div>
                  <div className="store-card__copy">
                    <p className="eyebrow">Android</p>
                    <h3>Download the APK</h3>
                    <p>
                      {androidReady
                        ? "Install the latest Orit Tej tester release directly on your Android phone."
                        : "The direct Android download will appear here after the first tester release."}
                    </p>
                    {androidReady && (
                      <a
                        className="button button--wine store-card__download"
                        href={androidRelease.apkUrl}
                        download
                      >
                        Download version {androidRelease.versionName}
                        <ArrowRightIcon />
                      </a>
                    )}
                  </div>
                  <div className="store-card__footer">
                    <span>Release channel</span>
                    <strong>Direct download</strong>
                  </div>
                </article>
                <article className="store-card store-card--ios">
                  <div className="store-card__top">
                    <div className="store-card__icon">
                      <AppleLogoIcon />
                    </div>
                    <span className="status-pill">Planned</span>
                  </div>
                  <div className="store-card__copy">
                    <p className="eyebrow">iPhone</p>
                    <h3>Download for iOS</h3>
                    <p>
                      The App Store version is planned for a later release.
                    </p>
                  </div>
                  <div className="store-card__footer">
                    <span>Release channel</span>
                    <strong>Apple App Store</strong>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section className="closing-cta" data-reveal>
            <p className="kicker">Need help?</p>
            <h2>Contact us if you need help installing the app.</h2>
            <Link className="button button--wine" href="/contact">
              Contact us <ArrowRightIcon />
            </Link>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}
