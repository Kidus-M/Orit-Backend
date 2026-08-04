import type { Metadata } from "next";
import Image from "next/image";

import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Orit Tej | Handcrafted Ethiopian Honey Wine",
  description:
    "Discover Orit Tej, a family-made Ethiopian honey wine handcrafted in California with natural ingredients and a recipe carried through generations.",
};

export default function Home() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="hero">
            <div className="hero__media" aria-hidden="true">
              <Image
                src="/hero-honey-wine-labeled.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className="hero__image"
              />
            </div>
            <div className="hero__veil" />
            <div className="hero__content">
              <h1 data-page-intro>
                A Golden Tradition<br />Made To Be Shared.
              </h1>
              <p className="hero__lede" data-page-intro>
                Orit Tej is an Ethiopian wine made with patience, natural
                ingredients, and a family recipe which is far deeper than
                what’s inside the bottle.
              </p>
            </div>
          </section>

          <section className="section intro-heading">
            <div data-reveal>
              <h2 className="display-heading">
                Not Red. Not White.<br />Golden.
              </h2>
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
                Sam and Fi arrived in California in 1983. Their arrival sparked
                something new, a family wine recipe. What began as something
                made for family and friends quickly turned into a wine for
                others.
              </p>
            </div>
          </section>

          <section className="section">
            <div className="section-heading quality-heading" data-reveal>
              <div>
                <p className="kicker">In every glass</p>
                <h2 className="display-heading">Simple ingredients. Full character.</h2>
              </div>
            </div>
            <div className="quality-grid" data-stagger>
              <article>
                <span className="quality-number">01</span>
                <h3>Honey based</h3>
                <p>All natural domestic honey.</p>
              </article>
              <article>
                <span className="quality-number">02</span>
                <h3>Handcrafted</h3>
                <p>Handcrafted and bottled with minimal machine influence.</p>
              </article>
              <article>
                <span className="quality-number">03</span>
                <h3>Home made</h3>
                <p>
                  Pairs with and complements foods that are rich in spices.
                </p>
              </article>
            </div>
          </section>

        </main>
      </PageTransition>
    </MarketingShell>
  );
}
