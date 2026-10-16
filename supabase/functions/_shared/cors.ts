// CORS for the functions the website calls from the browser.
// The site can be served from custar.ng or www.custar.ng (with or without a folder such as /Genova), and the WEB_URL
// secret may name only one of them. A browser refuses the whole request ("Failed to send a request to the Edge
// Function") when the origin it is on is not the one the function answers with, so echo the caller's origin when it is
// one of ours. These functions are protected by the signed-in user's token (not cookies), so this is not a security boundary.

const originOf = (url: string): string => { try { return new URL(url).origin; } catch { return ''; } };

/** Origins that may call the functions: the configured WEB_URL, its www / non-www twin, and the live domain. */
export function allowedOrigins(webUrl: string | undefined): string[] {
  const out = new Set(['https://custar.ng', 'https://www.custar.ng']);
  const configured = originOf(webUrl ?? '');
  if (configured) {
    out.add(configured);
    out.add(configured.includes('//www.') ? configured.replace('//www.', '//') : configured.replace('//', '//www.'));
  }
  return [...out];
}

export function corsHeaders(req: Pick<Request, 'headers'>, webUrl: string | undefined): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const configured = originOf(webUrl ?? '');
  const allow = allowedOrigins(webUrl).includes(origin) ? origin : (configured || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    // answer with whatever headers the browser says it will send, so a newer client library never breaks the preflight
    'Access-Control-Allow-Headers': req.headers.get('Access-Control-Request-Headers') || 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin, Access-Control-Request-Headers',
  };
}
