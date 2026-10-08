import Link from 'next/link';
import { LEVELS } from '@/lib/levels';
import { PlansPreview } from '@/components/PlansPreview';

const FAQ = [
  ['Do I pay inside the app?', 'No. The app never asks for money and has no purchase buttons, so children can never buy anything by accident. Subscribe here on the website, then sign in on the app with the same email.'],
  ['What does Free include?', 'A growing set of free stories, reader profiles for every child, favourites and reading progress. Premium unlocks the whole library and new stories every week.'],
  ['What if a payment fails?', 'You keep Premium for 5 more days while you sort it out. If the renewal still has not gone through after that, your account moves back to the Free plan automatically. Nothing is lost, and you can resubscribe at any time.'],
  ['Can I cancel?', 'Any time, from your account page. You keep Premium until the end of the period you paid for.'],
  ['Is it safe for my children?', 'No ads, no tracking, and no way to chat with strangers. Areas meant for grown-ups are protected by a parental gate, and we collect only a child\'s first name or nickname and reading level.'],
  ['Can we read without internet?', 'Yes. Save stories to the device from the app and read them anywhere, even on a long journey.'],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Stories that grow<br />with <em>every reader</em></h1>
          <p className="lead">Genova is a safe, ad-free storybook app. Every story has a picture on every page and words that match your child's reading level.</p>
          <div className="row">
            <Link href="/signup/" className="btn light big">Get started free</Link>
            <Link href="/plans/" className="btn big" style={{ background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.6)' }}>See plans</Link>
          </div>
        </div>
      </section>

      <div className="wrap pull">
        <div className="grid g3">
          {[['🚫', 'No ads, ever', 'No third-party trackers and nothing to buy inside the app.'], ['🔒', 'Parent-protected', 'Grown-up areas sit behind a parental gate.'], ['📴', 'Read offline', 'Save stories to read on the road or without signal.']].map(([e, t, d]) => (
            <div key={t} className="card"><div style={{ fontSize: 34 }} aria-hidden="true">{e}</div><h3 style={{ marginTop: 8 }}>{t}</h3><p className="muted" style={{ fontWeight: 600, marginTop: 6 }}>{d}</p></div>
          ))}
        </div>
      </div>

      <div className="wrap">
        <section className="block" aria-labelledby="levels">
          <h2 id="levels">A level for every reader</h2>
          <p className="lead">Children are matched to stories by reading level, so they always find something that feels just right.</p>
          <div className="grid g3">
            {LEVELS.map((l) => (
              <div key={l.id} className="card level">
                <div className="emoji" aria-hidden="true">{l.emoji}</div>
                <h3>{l.name}</h3><div className="desc">{l.descriptor}</div>
                <p className="muted" style={{ fontWeight: 600 }}>{l.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="block" aria-labelledby="how">
          <h2 id="how">How it works</h2>
          <p className="lead">Three steps, and the first one is free.</p>
          <div className="grid g3">
            {[['Create your account', 'Sign up here with your email. It takes a minute.'], ['Choose a plan', 'Stay on Free, or go Premium for the whole library. Pay securely with Paystack.'], ['Read on the app', 'Sign in on the Genova app with the same email and add a profile for each child.']].map(([t, d], i) => (
              <div key={t} className="card step"><div className="num">{i + 1}</div><h3>{t}</h3><p className="muted" style={{ fontWeight: 600, marginTop: 6 }}>{d}</p></div>
            ))}
          </div>
        </section>

        <section className="block" aria-labelledby="plans">
          <h2 id="plans">Simple plans</h2>
          <p className="lead">Start free. Upgrade when you are ready.</p>
          <PlansPreview />
        </section>

        <section className="block" aria-labelledby="faq">
          <h2 id="faq" style={{ marginBottom: 24 }}>Questions parents ask</h2>
          <div>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>
      </div>
    </>
  );
}
