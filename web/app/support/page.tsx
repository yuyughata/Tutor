import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/config';

export const metadata = { title: 'Help and support' };

/** Public support page: the store listings need a support URL that works without signing in. */
export default function Page() {
  return (
    <div className="wrap" style={{ maxWidth: 780 }}>
      <div className="page-top"><h1>Help and support</h1><p>We are happy to help. Most answers are below.</p></div>

      <div className="card stack" style={{ marginTop: 24 }}>
        <h2>Contact us</h2>
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will reply, usually within one working day. If you have an account, you can also <Link href="/account/#support">message us from your account</Link> so we can see your details.</p>
      </div>

      <div className="card stack" style={{ marginTop: 20 }}>
        <h2>Common questions</h2>
        <h3>I paid but the app still shows the Free plan</h3>
        <p>Sign in to the app with the same email you used on the website. Close and reopen the app. If it still shows Free after a few minutes, contact us with the email you paid with.</p>
        <h3>I forgot my password</h3>
        <p>Open the app or the website, choose Forgot password, and enter the 6-digit code we email you.</p>
        <h3>I forgot my grown-up passcode</h3>
        <p>In the app, open Grown-ups, choose Forgot passcode, confirm with your account password, then choose a new passcode.</p>
        <h3>How do I cancel my subscription?</h3>
        <p>Sign in to <Link href="/account/">your account</Link> and choose Manage or cancel subscription. Premium stays on until the end of the period you paid for.</p>
        <h3>How does kiosk mode work?</h3>
        <p>Turn it on in the app under Grown-ups. It keeps a child inside Genova until the grown-up passcode is entered.</p>
      </div>

      <div className="card stack" style={{ marginTop: 20 }}>
        <h2>Delete your account and data</h2>
        <p>To delete your Genova account, your children&apos;s reader profiles and your reading data, email <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20Genova%20account`}>{SUPPORT_EMAIL}</a> from the email address on the account with the subject &ldquo;Delete my Genova account&rdquo;. We will confirm and complete it within 30 days. Payment records may be kept for as long as the law requires. See the <Link href="/privacy/">privacy policy</Link>.</p>
      </div>
    </div>
  );
}
