'use client';
import { useEffect, useRef, useState } from 'react';
import { Legal } from '@/components/Legal';
import { getSupabase } from '@/lib/supabase';

type Doc = { title: string; body: string; version: number; updated_at: string };

/** The privacy policy as a pop-up (same text the app shows). `onAgree` adds an "I agree" button for consent screens. */
export function PrivacyDialog({ open, onClose, onAgree }: { open: boolean; onClose: () => void; onAgree?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || doc) return;
    setFailed(false);
    getSupabase().from('legal_documents').select('title, body, version, updated_at').eq('slug', 'privacy-policy').maybeSingle()
      .then(({ data, error }) => { if (error || !data) setFailed(true); else setDoc(data as Doc); });
  }, [open, doc]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="privacy-title" onClose={onClose} onCancel={onClose}>
      <div className="sheet-head">
        <div><h2 id="privacy-title">{doc?.title ?? 'Privacy policy'}</h2>{doc && <p className="muted small" style={{ fontWeight: 700 }}>Version {doc.version}</p>}</div>
        <button type="button" className="btn ghost" onClick={onClose}>Close</button>
      </div>
      <div className="sheet-body">
        {doc ? <Legal text={doc.body} /> : failed ? <p className="notice bad" role="alert">We could not load the policy right now. Please try again in a moment.</p> : <p className="muted" aria-live="polite">Loading…</p>}
      </div>
      {onAgree && <div className="sheet-foot"><button type="button" className="btn" disabled={!doc} onClick={() => { onAgree(); onClose(); }}>I have read it and I agree</button></div>}
    </dialog>
  );
}
