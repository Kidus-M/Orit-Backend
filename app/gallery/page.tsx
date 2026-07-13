import type { Metadata } from "next";
import Image from "next/image";

import { MarketingShell } from "@/components/marketing-shell";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A look at Orit Tej honey wine, its ingredients, craft, and place at the table.",
};

const galleryItems = [
  {
    src: "/tej-at-the-table.png",
    alt: "Golden honey wine served at an Ethiopian dinner table",
    className: "gallery-card gallery-card--wide",
    label: "At the table",
  },
  {
    src: "/craft-honey-wine.png",
    alt: "A small batch of honey wine being handcrafted",
    className: "gallery-card gallery-card--tall",
    label: "The craft",
  },
  {
    src: "/hero-honey-wine.png",
    alt: "An Orit Tej bottle beside a glass of golden honey wine",
    className: "gallery-card gallery-card--standard",
    label: "The bottle",
  },
  {
    src: "/honey-and-gesho.png",
    alt: "Golden honeycomb with natural green leaves",
    className: "gallery-card gallery-card--standard",
    label: "From nature",
  },
  {
    src: "/family-red-wine.png",
    alt: "A warm family gathering around a shared table",
    className: "gallery-card gallery-card--wide",
    label: "Made to share",
  },
];

export default function GalleryPage() {
  return (
    <MarketingShell>
      <PageTransition>
        <main id="main-content">
          <section className="page-hero page-hero--cream">
            <div>
              <p className="kicker" data-page-intro>
                Gallery
              </p>
              <h1 data-page-intro>Golden moments, gathered.</h1>
              <p data-page-intro>
                A closer look at the ingredients, hands, meals, and people
                that make Orit Tej feel at home.
              </p>
            </div>
          </section>

          <section className="section gallery-grid" data-stagger>
            {galleryItems.map((item) => (
              <figure className={item.className} key={item.src}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                />
                <figcaption>{item.label}</figcaption>
              </figure>
            ))}
          </section>

          <section className="gallery-quote" data-reveal>
            <p className="kicker kicker--light">Our measure of success</p>
            <blockquote>
              “A bottle is finished. The feeling around the table continues.”
            </blockquote>
          </section>
        </main>
      </PageTransition>
    </MarketingShell>
  );
}
