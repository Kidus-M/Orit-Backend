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
    text: "Sam and Fi arrived with a family recipe and a spirit of genuine hospitality.",
  },
  {
    year: "1987",
    title: "Orit Tej is brought to life",
    text: "Making Tej for family and friends was a labor of love. The enthusiastic response inspired them to offer it to a wider community.",
  },
  {
    year: "2015",
    title: "The tradition continues",
    text: "The next chapter stays grounded in the same idea - make with care, quality over quantity, and always leave room at the table.",
  },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="page-hero page-hero--wine page-hero--centered">
            <div>
              <h1 data-page-intro>A recipe given to the next generation.</h1>
              <p data-page-intro>
                Orit Tej began with memory, hospitality, and a family recipe
                brought from Ethiopia to California.
              </p>
            </div>
          </section>

          <section className="section story-collage">
            <div className="story-collage__heading" data-reveal>
              <h2 className="display-heading">
                It started at the table...
              </h2>
            </div>
            <div className="story-collage__primary image-frame" data-reveal>
              <Image
                src="/family-pic.jpg"
                alt="The Orit Tej family"
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            </div>
            <div className="story-collage__copy" data-reveal>
              <p className="lead">
                Very similar to many loving stories, Sam and Fi first arrived in
                California in 1983 from Ethiopia. Rather than searching for work,
                they created their own work by starting a family owned Ethiopian
                Restaurant in San Francisco. After several years, Sam and Fi
                decided that they wanted to give something more special to the
                community. Amongst their hand full of small possessions they had
                brought from Ethiopia, there was a family recipe for Tej. Slowly
                and tirelessly they handcrafted their Tej to perfection, only
                serving it to family and close friends. The response was so
                overwhelming that in 1987 Sam and Fi finally mustered the courage
                to introduce their Tej to the rest of the community.
              </p>
              <p className="lead">
                Throughout the years, Sam and Fi have continued to carefully
                handcraft each and every barrel of Orit Tej, using nothing but
                their hands, their passion, and natural ingredients. Having
                established their winery in Solano County, California, Sam and Fi
                continue to produce the best quality Tej everyone deserves to
                have.
              </p>
            </div>
            <div className="story-collage__special" data-reveal>
              <h2>What Makes Our Tej Special</h2>
              <p className="lead">
                Many ask, &quot;what is Tej?&quot; Tej, pronounced as
                &lsquo;Tejj&rsquo;, is a particular type of sweet wine found in
                Ethiopia. What makes Tej unique is that it is produced from honey
                rather than from grapes. Although slightly sweet, Tej has a very
                smooth and aromatically calm flavor that can compliment any meal or
                any conversation. What makes Orit Tej so unique is that every ounce
                of Tej is carefully handcrafted with the idea of quality, not
                quantity, in mind!
              </p>
            </div>
            <div className="story-collage__secondary image-frame" data-reveal>
              <Image
                src="/wine-bottle-ps.jpg"
                alt="A bottle of Orit Tej honey wine"
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
                  The place has changed. The care, the patience, and the purpose has
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
