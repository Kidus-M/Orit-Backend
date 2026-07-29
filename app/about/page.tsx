import type { Metadata } from "next";
import Image from "next/image";

import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "The family story behind Orit Tej, an Ethiopian honey wine made in California since 1987.",
};

const milestones = [
  {
    year: "1983",
    title: "A recipe finds a new home",
    text: "Sam and Fi arrived in California from Ethiopia with a treasured family recipe and a spirit of generous hospitality.",
  },
  {
    year: "1987",
    title: "Orit Tej is brought to life",
    text: "Making Tej for family and friends was a labor of love. The enthusiastic response inspired them to offer it to a wider community.",
  },
  {
    year: "2015",
    title: "The tradition continues",
    text: "The next chapter stays grounded in the same idea: make with care, choose quality over quantity, and always leave room at the table.",
  },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="page-hero page-hero--wine">
            <div>
              <p
                className="kicker kicker--light story-hero__kicker"
                data-page-intro
              >
                Our story
              </p>
              <h1 data-page-intro>A recipe carried to a generation.</h1>
              <p data-page-intro>
                Orit Tej began with memory, hospitality, and a family recipe
                brought from Ethiopia to California.
              </p>
            </div>
          </section>

          <section className="section story-collage">
            <div className="story-collage__primary image-frame" data-reveal>
              <Image
                src="/craft-honey-wine.png"
                alt="A small batch of honey wine being prepared by hand"
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            </div>
            <div className="story-collage__copy" data-reveal>
              <div className="story-collage__heading">
                <p className="kicker">Made to gather around</p>
                <h2 className="display-heading">
                  It started at the family table.
                </h2>
              </div>
              <p className="lead">
                In 1983, Sam and Fi came to California from Ethiopia. Soon
                after, they opened a family-owned Ethiopian restaurant in San
                Francisco and began making Tej from a recipe born from culture
                and dedication.
              </p>
              <p className="lead">
                The wine was first shared with relatives and friends. When it
                was introduced publicly in 1987, the response made one thing
                clear: this tradition deserved a wider table.
              </p>
              <blockquote>“Made for quality, not quantity.”</blockquote>
            </div>
            <div className="story-collage__secondary image-frame" data-reveal>
              <Image
                src="/hero-honey-wine.png"
                alt="Golden honey wine, honeycomb, and an Orit Tej bottle"
                fill
                sizes="(max-width: 800px) 100vw, 35vw"
              />
            </div>
          </section>

          <section className="timeline-section">
            <div className="section timeline-section__inner">
              <div
                className="section-heading timeline-section__heading"
                data-reveal
              >
                <div>
                  <p className="kicker kicker--light">A living tradition</p>
                  <h2 className="display-heading">From then to now.</h2>
                </div>
                <p>
                  The place has changed. The care, patience, and purpose have
                  not.
                </p>
              </div>
              <div className="timeline" data-stagger>
                {milestones.map((item) => (
                  <article key={item.year}>
                    <p className="timeline__year">{item.year}</p>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}
