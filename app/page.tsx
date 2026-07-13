import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Orit Tej | Handcrafted Ethiopian Honey Wine",
  description:
    "Discover Orit Tej, a family-made Ethiopian honey wine handcrafted in California with natural ingredients and a recipe carried across generations.",
};

export default function Home() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="hero">
            <div className="hero__media" aria-hidden="true">
              <Image
                src="/hero-honey-wine.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className="hero__image"
              />
            </div>
            <div className="hero__veil" />
            <div className="hero__content">
              <p className="kicker" data-page-intro>Handcrafted in California</p>
              <h1 data-page-intro>A golden tradition,<br />made to be shared.</h1>
              <p className="hero__lede" data-page-intro>
                Orit Tej is a softly sweet Ethiopian honey wine made with
                patience, natural ingredients, and a family recipe with roots
                far deeper than any bottle.
              </p>
              <div className="hero__actions" data-page-intro>
                <Link className="button button--wine" href="/about">
                  Discover our story <span aria-hidden="true">-&gt;</span>
                </Link>
                <Link className="text-link" href="/gallery">
                  See the craft <span aria-hidden="true">-&gt;</span>
                </Link>
              </div>
            </div>
            <div className="hero__note" data-page-intro>
              <span>01</span>
              <p>Honey wine with Ethiopian roots and a California home.</p>
            </div>
          </section>

          <section className="section intro-grid">
            <div data-reveal>
              <p className="kicker">Meet Tej</p>
              <h2 className="display-heading">
                Not red. Not white.<br />Something golden.
              </h2>
            </div>
            <div className="intro-copy" data-reveal>
              <p className="lead">
                Tej, pronounced &ldquo;tejj,&rdquo; is Ethiopia&apos;s
                celebrated honey wine: aromatic, smooth, and gently sweet.
              </p>
              <p>
                Unlike grape wine, its character begins with honey. The result
                is warm and expressive, at home beside a full meal or a long
                conversation.
              </p>
              <Link className="text-link text-link--wine" href="/about">
                Learn what makes ours special <span aria-hidden="true">-&gt;</span>
              </Link>
            </div>
          </section>

          <section className="story-feature">
            <div className="story-feature__image image-frame">
              <Image
                src="/craft-honey-wine.png"
                alt="Hands carefully preparing a small batch of honey wine"
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
                data-parallax
              />
            </div>
            <div className="story-feature__copy" data-reveal>
              <p className="kicker kicker--light">A family recipe</p>
              <h2>From Ethiopia, through California, to your table.</h2>
              <p>
                Sam and Fi arrived in California in 1983 carrying a recipe from
                home. What began as something made for family and close friends
                became Orit Tej in 1987, when an overwhelming response gave
                them the courage to share it with the wider community.
              </p>
              <Link className="button button--honey" href="/about">
                Read the full story <span aria-hidden="true">-&gt;</span>
              </Link>
            </div>
          </section>

          <section className="section">
            <div className="section-heading" data-reveal>
              <div>
                <p className="kicker">In every glass</p>
                <h2 className="display-heading">Simple ingredients. Full character.</h2>
              </div>
              <p>
                We make for quality, not quantity. Every detail is guided by
                balance, patience, and the easy generosity of a drink meant to
                bring people together.
              </p>
            </div>
            <div className="quality-grid" data-stagger>
              <article>
                <span className="quality-number">01</span>
                <h3>Honey-led</h3>
                <p>A luminous sweetness and rounded aroma that never needs to shout.</p>
              </article>
              <article>
                <span className="quality-number">02</span>
                <h3>Handcrafted</h3>
                <p>Small-batch attention, shaped by decades of family knowledge.</p>
              </article>
              <article>
                <span className="quality-number">03</span>
                <h3>Made for food</h3>
                <p>Smooth enough to complement a meal and relaxed enough to enjoy on its own.</p>
              </article>
            </div>
          </section>

          <section className="gallery-preview">
            <div className="gallery-preview__copy" data-reveal>
              <p className="kicker kicker--light">A seat at the table</p>
              <h2>Good wine makes room for good company.</h2>
              <Link className="button button--outline-light" href="/gallery">
                Explore the gallery <span aria-hidden="true">-&gt;</span>
              </Link>
            </div>
            <div className="gallery-preview__images" data-stagger>
              <div className="image-frame">
                <Image src="/tej-at-the-table.png" alt="A glass of golden honey wine served with Ethiopian food" fill sizes="(max-width: 800px) 100vw, 40vw" />
              </div>
              <div className="image-frame">
                <Image src="/honey-and-gesho.png" alt="Golden honey and natural leaves" fill sizes="(max-width: 800px) 100vw, 30vw" />
              </div>
            </div>
          </section>

          <section className="section app-feature">
            <div className="app-feature__copy" data-reveal>
              <p className="kicker">The Orit Tej app</p>
              <h2 className="display-heading">Membership, pickup, and a faster way to your next bottle.</h2>
              <p>
                Join the club, place an order, and keep your pickup QR close.
                The app is being prepared for Android and iPhone.
              </p>
              <Link className="button button--wine" href="/download">
                Preview the app <span aria-hidden="true">-&gt;</span>
              </Link>
            </div>
            <div className="phone-stage" data-reveal aria-label="Orit Tej app preview">
              <div className="phone-mockup">
                <div className="phone-mockup__bar" />
                <Image src="/app-icon.png" alt="Orit Tej app icon showing a cartoon bottle and honey jar" width={220} height={220} />
                <p>Orit Tej</p>
                <span>Wine club</span>
                <div className="phone-mockup__button">Enter</div>
              </div>
              <div className="honey-orbit honey-orbit--one" />
              <div className="honey-orbit honey-orbit--two" />
            </div>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}
