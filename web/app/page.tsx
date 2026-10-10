import fs from 'node:fs';
import path from 'node:path';
import { LandingEnhance } from '@/components/LandingEnhance';
import { PlansPreview } from '@/components/PlansPreview';

// The landing page's content lives in web/content/*.html (one source for this page and for the single-file copy,
// built by tools/site/build_landing.mjs). The plans are live, so they are the one React piece in the middle.
const read = (n: string) => fs.readFileSync(path.join(process.cwd(), 'content', n), 'utf8');
const Html = ({ file }: { file: string }) => <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: read(file) }} />;

export default function Home() {
  return (
    <div className="lp" id="top">
      <Html file="landing-a.html" />
      <Html file="landing-app.html" />
      <section id="plans" className="plans-section" aria-label="Plans">
        <div className="wrap">
          <Html file="landing-plans-head.html" />
          <PlansPreview />
        </div>
      </section>
      <Html file="landing-faq.html" />
      <Html file="landing-b.html" />
      <Html file="landing-modal.html" />
      <Html file="landing-float.html" />
      <LandingEnhance />
    </div>
  );
}
