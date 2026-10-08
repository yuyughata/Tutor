'use client';
import { useEffect, useState } from 'react';
import { Legal } from '@/components/Legal';
import { getSupabase } from '@/lib/supabase';

type Doc = { title: string; body: string; version: number; updated_at: string };

/** The same policy text the app shows, kept up to date from the admin dashboard. */
export function PrivacyClient() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    getSupabase().from('legal_documents').select('title, body, version, updated_at').eq('slug', 'privacy-policy').maybeSingle()
      .then(({ data, error }) => { if (error || !data) setFailed(true); else setDoc(data as Doc); });
  }, []);
  return (
    <div className="wrap" style={{ maxWidth: 780 }}>
      <div className="page-top"><h1>{doc?.title ?? 'Privacy policy'}</h1>
        {doc && <p>Version {doc.version} · updated {new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
      </div>
      <div className="card" style={{ marginTop: 24 }}>
        {doc ? <Legal text={doc.body} /> : failed ? <p className="notice bad" role="alert">We could not load the policy right now. Please try again in a moment.</p> : <p className="muted" aria-live="polite">Loading…</p>}
      </div>
    </div>
  );
}
