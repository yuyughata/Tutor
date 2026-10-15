import { supabase } from './supabase';

export type PlanEmailResult = { ok: true } | { ok: false; message: string };

const FAILED = 'We could not send the email just now. Please try again in a little while.';

/**
 * "Change plan": the app never shows prices or purchase links, so the parent is emailed a link to the plans page
 * on the website instead (the send-email function sends the "Subscribe to change your plan" template to the
 * signed-in parent's own address). Succeeds only when the email really went out.
 */
export async function emailPlansLink(): Promise<PlanEmailResult> {
  if (!supabase) return { ok: false, message: FAILED };
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body: { action: 'self', template: 'change_plan' } });
    if (error) {
      let status = 0;
      try { status = (error as { context?: Response }).context?.status ?? 0; } catch { /* no response */ }
      return { ok: false, message: status === 429 ? 'We have already emailed you a few times. Please check your inbox, or try again in an hour.' : FAILED };
    }
    return data && data.sent > 0 ? { ok: true } : { ok: false, message: FAILED };
  } catch {
    return { ok: false, message: FAILED };
  }
}
