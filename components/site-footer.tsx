import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div>
          <p className="kicker kicker--light">Made to be shared</p>
          <h2>Honey, heritage, and a little California light.</h2>
        </div>
        <Link className="button button--honey" href="/contact">
          Start a conversation
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>

      <div className="site-footer__grid">
        <div className="footer-brand">
          <Image
            className="company-logo company-logo--footer"
            src="/app-icon.png"
            alt="Orit Tej"
            width={72}
            height={72}
          />
          <p>
            Handcrafted Ethiopian honey wine, made by a family who believes
            quality is always worth the time.
          </p>
        </div>

        <div>
          <h3>Explore</h3>
          <Link href="/about">Our story</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/download">Get the app</Link>
        </div>

        <div>
          <h3>Visit & contact</h3>
          <a href="mailto:orittej.comments@gmail.com">
            orittej.comments@gmail.com
          </a>
          <a href="tel:+14157243664">(415) 724-3664</a>
          <p>San Francisco Bay Area, California</p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {new Date().getFullYear()} Orit Tej. All rights reserved.</p>
        <p>Please enjoy responsibly. 21+ only.</p>
      </div>
    </footer>
  );
}
