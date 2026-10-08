/** Turn technical auth/network errors into something a parent can act on. */
export function friendly(message: string): string {
  if (/invalid login/i.test(message)) return 'That email or password is not right.';
  if (/already (registered|been registered)|exists/i.test(message)) return 'There is already an account with that email. Try signing in.';
  if (/(otp|token|code).*(expired|invalid)|expired|invalid.*(otp|token|code)/i.test(message)) return 'That code is not right or has expired. Request a new one.';
  if (/rate|too many|seconds/i.test(message)) return 'Please wait a minute before trying again.';
  if (/password/i.test(message) && /(short|weak|least|characters)/i.test(message)) return 'Choose a longer password (at least 8 characters).';
  if (/fetch|network/i.test(message)) return 'We could not reach the server. Check your connection and try again.';
  return message;
}
/** Read the message our edge functions return in their JSON error body. */
export async function functionError(error: { message: string; context?: unknown }): Promise<string> {
  try {
    const res = error.context as Response | undefined;
    const body = res ? await res.json() : null;
    if (body?.error) return String(body.error);
  } catch { /* not json */ }
  return friendly(error.message);
}
