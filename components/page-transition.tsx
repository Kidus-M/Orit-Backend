"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export function PageTransition({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!scope.current) return;

      const media = gsap.matchMedia();
      media.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          desktop: "(min-width: 800px)",
        },
        (context) => {
          const { reduceMotion, desktop } = context.conditions as {
            reduceMotion: boolean;
            desktop: boolean;
          };

          if (reduceMotion) {
            gsap.set("[data-reveal], [data-stagger] > *", {
              opacity: 1,
              y: 0,
            });
            return;
          }

          const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
          intro
            .fromTo(
              ".route-wipe",
              { scaleX: 1 },
              {
                scaleX: 0,
                transformOrigin: "right center",
                duration: 0.8,
              },
            )
            .from(
              "[data-page-intro]",
              {
                y: 34,
                opacity: 0,
                duration: 0.8,
                stagger: 0.09,
              },
              0.18,
            );

          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((item) => {
            gsap.from(item, {
              y: 46,
              opacity: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: item,
                start: "top 88%",
                once: true,
              },
            });
          });

          gsap.utils
            .toArray<HTMLElement>("[data-stagger]")
            .forEach((container) => {
              gsap.from(Array.from(container.children), {
                y: 30,
                opacity: 0,
                duration: 0.7,
                stagger: 0.1,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: container,
                  start: "top 86%",
                  once: true,
                },
              });
            });

          if (desktop) {
            gsap.utils
              .toArray<HTMLElement>("[data-parallax]")
              .forEach((image) => {
                gsap.fromTo(
                  image,
                  { yPercent: -4, scale: 1.04 },
                  {
                    yPercent: 4,
                    ease: "none",
                    scrollTrigger: {
                      trigger: image.parentElement,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 0.7,
                    },
                  },
                );
              });
          }
        },
      );

      return () => media.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="page-transition">
      <div className="route-wipe" aria-hidden="true" />
      {children}
    </div>
  );
}
