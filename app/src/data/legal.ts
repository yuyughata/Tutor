import { supabase } from '../lib/supabase';
import { load, save } from '../state/storage';

export type LegalDoc = { title: string; body: string; version: number | null; updatedAt: string | null; source: 'live' | 'saved' | 'builtin' };

const KEY = 'genova.legal.privacy.v1';

// Shown only if the policy has never been downloaded (first launch with no connection, or no backend).
const BUILTIN: LegalDoc = {
  title: 'Privacy Policy',
  version: null,
  updatedAt: null,
  source: 'builtin',
  body: `SAMPLE TEXT: placeholder wording until the full policy loads.

# Our promise to families
Genova is a children's storybook app made by CUSTAR. We do not show ads, we do not track children across other apps or websites, and we never sell personal information.

# What we collect
- A parent's email address, so they can sign in.
- A child's first name or nickname, a buddy avatar and a reading level.
- Which stories were started or finished, and favourites.

# Your control
Parents can edit or remove a child's profile at any time from the Grown-ups area. Connect to the internet to read the latest version of this policy.`,
};

/** The privacy policy, kept up to date from the admin dashboard. Falls back to the last saved copy when offline. */
export async function getPrivacyPolicy(): Promise<LegalDoc> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('legal_documents').select('title, body, version, updated_at').eq('slug', 'privacy-policy').maybeSingle();
      if (!error && data) {
        const doc: LegalDoc = { title: data.title, body: data.body, version: data.version, updatedAt: data.updated_at, source: 'live' };
        save(KEY, doc);
        return doc;
      }
    } catch { /* offline: fall through to the saved copy */ }
  }
  const saved = await load<LegalDoc | null>(KEY, null);
  return saved ? { ...saved, source: 'saved' } : BUILTIN;
}
