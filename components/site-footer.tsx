import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="footer-brand">
          <p>
            Handcrafted Ethiopian honey wine made by a family who believes
            quality is always worth the time.
          </p>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© 2026 Orit Tej. All rights reserved.</p>
        <p>Please enjoy responsibly. 21+ only.</p>
      </div>
    </footer>
  );
}
