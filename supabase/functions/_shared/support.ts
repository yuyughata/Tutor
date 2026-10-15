// Password-support logic for admins, written against small injected dependencies so it can be unit tested.

export type SupportDeps = {
  /** Resolve the caller from the request's JWT. */
  getCaller: (jwt: string) => Promise<{ id: string; email: string | null } | null>;
  isAdmin: (userId: string) => Promise<boolean>;
  findParentByEmail: (email: string) => Promise<{ id: string; email: string; is_admin: boolean } | null>;
  sendReset: (email: string) => Promise<void>;
  setPassword: (userId: string, password: string) => Promise<void>;
  /** True when the parent still has a running Paystack subscription (deleting the account would not stop the billing). */
  hasLiveSubscription: (userId: string) => Promise<boolean>;
  /** Delete the sign-in; the database removes the profile and everything that hangs off it. */
  deleteAccount: (userId: string) => Promise<void>;
  log: (row: { admin_id: string; action: string; target_email: string; detail?: Record<string, unknown> }) => Promise<void>;
};

export type SupportResult = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string): SupportResult => ({ status, body: { error } });

export async function handleSupport(authHeader: string | null, input: unknown, deps: SupportDeps): Promise<SupportResult> {
  const jwt = authHeader?.replace(/^Bearer\s+/i, '') || '';
  if (!jwt) return fail(401, 'Sign in first.');
  const caller = await deps.getCaller(jwt);
  if (!caller) return fail(401, 'Your session has expired. Sign in again.');
  if (!(await deps.isAdmin(caller.id))) return fail(403, 'Only admins can do that.');

  const { action, email, password, confirm_email, force } = (input ?? {}) as { action?: string; email?: string; password?: string; confirm_email?: string; force?: boolean };
  const target = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!target || !target.includes('@')) return fail(400, 'Enter a valid email address.');
  if (action !== 'send_reset' && action !== 'set_password' && action !== 'delete_account') return fail(400, 'Unknown action.');

  const parent = await deps.findParentByEmail(target);
  if (!parent) return fail(404, 'No account found for that email.');

  if (action === 'send_reset') {
    await deps.sendReset(parent.email);
    await deps.log({ admin_id: caller.id, action, target_email: parent.email });
    return { status: 200, body: { ok: true } };
  }

  if (action === 'delete_account') {
    if (typeof confirm_email !== 'string' || confirm_email.trim().toLowerCase() !== parent.email.toLowerCase()) return fail(400, 'Type the account email to confirm the deletion.');
    if (parent.id === caller.id) return fail(403, 'You cannot delete your own account.');
    if (parent.is_admin) return fail(403, 'Admin accounts cannot be deleted here. Remove their admin access in Settings first.');
    if (force !== true && (await deps.hasLiveSubscription(parent.id))) return fail(409, 'This parent has an active Paystack subscription. Deleting the account does not stop the billing: cancel it in Paystack first, or delete anyway.');
    await deps.deleteAccount(parent.id);
    // the log keeps the email (not the person's data) so there is a record of who was removed
    await deps.log({ admin_id: caller.id, action, target_email: parent.email });
    return { status: 200, body: { ok: true } };
  }

  // set_password
  if (parent.is_admin) return fail(403, 'Admin accounts can only be reset by email.');
  if (typeof password !== 'string' || password.length < 8) return fail(400, 'Use at least 8 characters.');
  if (password.length > 72) return fail(400, 'That password is too long.');
  await deps.setPassword(parent.id, password);
  // never store the password; only that it happened
  await deps.log({ admin_id: caller.id, action, target_email: parent.email });
  return { status: 200, body: { ok: true } };
}
