import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/config';

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap cols">
        <div style={{ maxWidth: 360 }}>
          <span className="logo">Gen<i>o</i>va</span>
          <p className="small" style={{ marginTop: 10 }}>Storybooks that grow with every reader. A CUSTAR product.</p>
        </div>
        <div><b>Genova</b>
          <ul><li><Link href="/plans/">Plans</Link></li><li><Link href="/account/">Your account</Link></li><li><Link href="/privacy/">Privacy policy</Link></li></ul>
        </div>
        <div><b>Help</b>
          <ul><li><Link href="/support/">Help and support</Link></li><li><Link href="/account/#support">Contact support</Link></li><li><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li><li><a href="/admin/">Staff sign in</a></li></ul>
        </div>
      </div>
      <div className="wrap small" style={{ marginTop: 32, opacity: 0.7 }}>© {new Date().getFullYear()} CUSTAR. Payments are processed securely by Paystack.</div>
    </footer>
  );
}
