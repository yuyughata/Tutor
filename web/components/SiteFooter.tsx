import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/config';

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <img className="foot-logo" src="/img/genova-logo.png" width={83} height={36} alt="Custar Genova logo" />
            <p className="blurb">A storybook world built on seven pillars of wholesome development, for families raising readers, thinkers, and people of real character.</p>
          </div>
          <div className="foot-col">
            <h5>Explore</h5>
            <a href="/#about">About Genova</a>
            <a href="/#pillars">7 Pillars</a>
            <a href="/#levels">Reading Levels</a>
            <a href="/#products">Storybooks</a>
            <a href="/#catalog">Title Catalog</a>
          </div>
          <div className="foot-col">
            <h5>Programs</h5>
            <a href="/#grp">Reading Program (GRP)</a>
            <a href="/#grp-form">Request a Session</a>
            <a href="/#preorder">Request a Title</a>
            <a href="/#library">Genova Library</a>
          </div>
          <div className="foot-col">
            <h5>Genova App</h5>
            <a href="/#app">About the app</a>
            <Link href="/plans/">Plans</Link>
            <Link href="/account/">Your account</Link>
            <Link href="/support/">Help and support</Link>
            <Link href="/account/#support">Contact support</Link>
            <Link href="/privacy/">Privacy policy</Link>
          </div>
          <div className="foot-col">
            <h5>Get In Touch</h5>
            <a className="foot-email" href="mailto:Custarlc25@gmail.com">Custarlc25@gmail.com</a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>App support: {SUPPORT_EMAIL}</a>
            <a href="https://wa.me/2349015487736" target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
            <div className="foot-socials"><span>IG</span><span>FB</span><span>TT</span></div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Custar. Built for a generation of bright minds. Payments are processed securely by Paystack.</span>
          <span>Built in homes, Reaching for the world. · <a href="/admin/">Staff sign in</a></span>
        </div>
      </div>
    </footer>
  );
}
