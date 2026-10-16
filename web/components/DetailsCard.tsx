'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export const NG_STATES = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Outside Nigeria'];
const GENDERS: [string, string][] = [['female', 'Female'], ['male', 'Male'], ['prefer_not_to_say', 'Prefer not to say']];
const PHONE = /^[0-9+()\- ]{7,20}$/;

type Form = { first_name: string; last_name: string; phone: string; address: string; state: string; gender: string };
const EMPTY: Form = { first_name: '', last_name: '', phone: '', address: '', state: '', gender: '' };

/** A parent's basic details (name, phone, address, state, gender). Saved to their own row only; every field is optional. */
export function DetailsCard({ userId }: { userId: string }) {
  const [f, setF] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Form) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setMsg(null); };

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await getSupabase().from('parent_details').select('first_name, last_name, phone, address, state, gender').eq('parent_id', userId).maybeSingle();
      if (!live) return;
      if (data) setF({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])) });
      setLoaded(true);
    })();
    return () => { live = false; };
  }, [userId]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const v = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.trim()])) as Form;
    if (v.phone && !PHONE.test(v.phone)) return setMsg({ ok: false, text: 'Enter a phone number using digits, spaces, + or - (7 to 20 characters).' });
    setBusy(true);
    const row = { parent_id: userId, ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === '' ? null : x])), updated_at: new Date().toISOString() };
    const { error } = await getSupabase().from('parent_details').upsert(row, { onConflict: 'parent_id' });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: 'We could not save your details just now. Please try again.' });
    setF(v); setMsg({ ok: true, text: 'Your details were saved.' });
  }

  return (
    <form className="card" id="details" style={{ marginTop: 24 }} onSubmit={save} aria-busy={!loaded}>
      <h3 style={{ marginBottom: 6 }}>Your details</h3>
      <p className="muted small" style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>Optional. Only you and the Genova team can see these. Your children's reader profiles never include them.</p>
      <div className="field-row">
        <div className="field"><label htmlFor="d-first">First name</label><input id="d-first" autoComplete="given-name" maxLength={60} value={f.first_name} onChange={(e) => set('first_name')(e.target.value)} /></div>
        <div className="field"><label htmlFor="d-last">Last name</label><input id="d-last" autoComplete="family-name" maxLength={60} value={f.last_name} onChange={(e) => set('last_name')(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="d-phone">Phone number</label><input id="d-phone" type="tel" autoComplete="tel" maxLength={20} value={f.phone} onChange={(e) => set('phone')(e.target.value)} /></div>
      <div className="field"><label htmlFor="d-address">Address</label><input id="d-address" autoComplete="street-address" maxLength={250} value={f.address} onChange={(e) => set('address')(e.target.value)} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="d-state">State</label>
          <select id="d-state" autoComplete="address-level1" value={f.state} onChange={(e) => set('state')(e.target.value)}>
            <option value="">Choose your state</option>
            {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div className="field"><label htmlFor="d-gender">Gender</label>
          <select id="d-gender" autoComplete="sex" value={f.gender} onChange={(e) => set('gender')(e.target.value)}>
            <option value="">Choose</option>
            {GENDERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
      </div>
      {msg && <div className={`notice ${msg.ok ? 'ok' : 'bad'}`} role={msg.ok ? 'status' : 'alert'} style={{ marginBottom: 14 }}>{msg.text}</div>}
      <button className="btn" disabled={busy || !loaded}>{busy ? 'Saving…' : 'Update'}</button>
    </form>
  );
}
