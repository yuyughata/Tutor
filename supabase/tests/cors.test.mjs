import test from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders } from '../functions/_shared/cors.ts';

// a minimal stand-in: the Request class in Node drops the forbidden Origin header
const req = (origin, extra = {}) => { const h = { ...(origin ? { Origin: origin } : {}), ...extra }; return { headers: { get: (k) => h[k] ?? null } }; };

test('echoes the live domain whichever form WEB_URL has', () => {
  for (const web of ['https://www.custar.ng/Genova', 'https://custar.ng', undefined, '']) {
    for (const o of ['https://custar.ng', 'https://www.custar.ng']) assert.equal(corsHeaders(req(o), web)['Access-Control-Allow-Origin'], o, `${web} / ${o}`);
  }
});

test('accepts the www / non-www twin of a configured address and the address itself', () => {
  assert.equal(corsHeaders(req('https://app.example.org'), 'https://app.example.org/Genova')['Access-Control-Allow-Origin'], 'https://app.example.org');
  assert.equal(corsHeaders(req('https://example.org'), 'https://www.example.org')['Access-Control-Allow-Origin'], 'https://example.org');
});

test('an unknown origin gets the configured one (so the browser blocks it), or * when nothing is configured', () => {
  assert.equal(corsHeaders(req('https://evil.test'), 'https://www.custar.ng/Genova')['Access-Control-Allow-Origin'], 'https://www.custar.ng');
  assert.equal(corsHeaders(req('https://evil.test'), undefined)['Access-Control-Allow-Origin'], '*');
});

test('allows exactly the headers the browser asks for', () => {
  const h = corsHeaders(req('https://custar.ng', { 'Access-Control-Request-Headers': 'authorization,content-type,x-new-header' }), undefined);
  assert.equal(h['Access-Control-Allow-Headers'], 'authorization,content-type,x-new-header');
  assert.match(h.Vary, /Origin/);
});
