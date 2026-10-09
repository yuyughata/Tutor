// A fake Supabase backend for browser tests. Speaks the real wire format (auth, REST, RPC, storage),
// so the app's / website's real supabase-js code runs unchanged.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAFklEQVR4nGP8z8Dwn4EIwESMolGFgwcAABvPAhEhzMvSAAAAAElFTkSuQmCC', 'base64');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };

function jwt(user) {
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
}

const day = 86_400_000;
const STORIES = [
  { id: '00000000-0000-0000-0000-00000000a001', slug: 'luna-and-the-firefly', title: 'Luna and the Firefly', synopsis: 'Luna follows a tiny light through the garden.', cover_url: 'https://img.test/cover1.png', reading_level: 'spark', is_free: true, page_count: 2, reading_minutes: 4, published_at: new Date(Date.now() - 9 * day).toISOString(), authors: { name: 'CUSTAR' }, story_categories: [{ categories: { slug: 'bedtime' } }] },
  { id: '00000000-0000-0000-0000-00000000a002', slug: 'the-dragon-who-hated-fire', title: 'The Dragon Who Hated Fire', synopsis: 'Ember would rather bake cakes than burn castles.', cover_url: 'https://img.test/cover2.png', reading_level: 'spark', is_free: false, page_count: 2, reading_minutes: 5, published_at: new Date(Date.now() - 5 * day).toISOString(), authors: { name: 'CUSTAR' }, story_categories: [{ categories: { slug: 'fantasy' } }] },
  { id: '00000000-0000-0000-0000-00000000a003', slug: 'bedtime-for-bear', title: 'Bedtime for Bear', synopsis: 'Bear has counted every star twice.', cover_url: 'https://img.test/cover3.png', reading_level: 'sunrise', is_free: true, page_count: 2, reading_minutes: 2, published_at: new Date(Date.now() - 1 * day).toISOString(), authors: { name: 'CUSTAR' }, story_categories: [{ categories: { slug: 'bedtime' } }] },
];
const PAGES = {
  [STORIES[0].id]: [{ position: 1, image_url: 'https://img.test/p1.png', text: 'Late one evening, Luna sat by her window.' }, { position: 2, image_url: 'https://img.test/p2.png', text: 'A soft sparkle danced across her room.' }],
  [STORIES[1].id]: [{ position: 1, image_url: 'https://img.test/p3.png', text: 'Ember was a dragon with a secret.' }, { position: 2, image_url: 'https://img.test/p4.png', text: 'She baked the fluffiest cakes in the kingdom.' }],
  [STORIES[2].id]: [{ position: 1, image_url: 'https://img.test/p5.png', text: 'Bear yawned a great big yawn.' }, { position: 2, image_url: 'https://img.test/p6.png', text: 'Then Mama hummed and Bear fell asleep.' }],
};
const POLICY = { slug: 'privacy-policy', title: 'Privacy Policy', body: 'SAMPLE TEXT: placeholder.\n\n# Our promise to families\nWe do not show ads.\n\n# What we collect\n- Parent email\n- Child first name or nickname', version: 3, updated_at: '2026-10-09T10:00:00Z' };
const PLANS = [
  { id: 'free', name: 'Free', tagline: 'A taste of Genova', price_minor: 0, currency: 'NGN', billing_interval: null, features: ['A growing set of free stories', 'Reader profiles for every child'], sort_order: 1, active: true },
  { id: 'monthly', name: 'Premium Monthly', tagline: 'Pay month to month', price_minor: 500000, currency: 'NGN', billing_interval: 'monthly', features: ['Every story in the library', 'Cancel any time'], sort_order: 2, active: true },
  { id: 'quarterly', name: 'Premium Quarterly', tagline: 'Best value: save 20%', price_minor: 1200000, currency: 'NGN', billing_interval: 'quarterly', features: ['Everything in Monthly'], sort_order: 3, active: true },
];

/** state: { access: row|null, password: 'secret123', calls: [], user } */
function createState(over = {}) {
  return { calls: [], password: 'secret123', code: '123456', user: { id: '33333333-3333-3333-3333-333333333333', aud: 'authenticated', role: 'authenticated', email: 'parent@example.com', email_confirmed_at: '2026-10-01T00:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' },
    access: null, // e.g. { active: true, status: 'active', plan: 'monthly', current_period_end, access_until, in_grace: false }
    signedUp: [], checkoutUrl: 'https://paystack.test/pay/abc', manageUrl: 'https://paystack.test/manage/xyz', ...over };
}

async function install(context, state, { host = 'mock.supabase.test' } = {}) {
  await context.route(/img\.test/, (r) => r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG }));
  await context.route(new RegExp(host.replace(/\./g, '\\.')), async (route) => {
    if (state.down) return route.abort('internetdisconnected');
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    let body = null;
    try { body = req.postDataJSON(); } catch { body = req.postData(); }
    state.calls.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams), body });
    const send = (status, data, extra = {}) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json', ...extra }, body: data === undefined ? '' : JSON.stringify(data) });
    const p = url.pathname;
    const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const session = () => ({ access_token: jwt(state.user), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh', user: state.user });

    // ---- auth ----
    if (p === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') return body?.password === state.password ? send(200, session()) : send(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' });
      return send(200, session());
    }
    if (p === '/auth/v1/signup') { state.signedUp.push(body); return send(200, session()); }
    if (p === '/auth/v1/recover') { state.recoverFor = body?.email; return send(200, {}); }
    if (p === '/auth/v1/verify') return body?.token === state.code ? send(200, session()) : send(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    if (p === '/auth/v1/user') { if (method === 'PUT') { state.newPassword = body?.password; if (body?.password) state.password = body.password; } return send(200, state.user); }
    if (p === '/auth/v1/logout') return send(204);
    // ---- rest ----
    if (p === '/rest/v1/stories') return send(200, STORIES);
    if (p === '/rest/v1/popular_stories') return send(200, []);
    if (p === '/rest/v1/featured_slots') return send(200, [{ type: 'week', stories: { slug: STORIES[0].slug } }, { type: 'month', stories: { slug: STORIES[1].slug } }]);
    if (p === '/rest/v1/categories') return send(200, [{ slug: 'bedtime', name: 'Bedtime' }, { slug: 'fantasy', name: 'Fantasy' }]);
    if (p === '/rest/v1/story_pages') {
      const id = (url.searchParams.get('story_id') || '').replace('eq.', '');
      const story = STORIES.find((s) => s.id === id);
      const allowed = story && (story.is_free || state.access?.active);
      return send(200, allowed ? PAGES[id] : []);
    }
    if (p === '/rest/v1/legal_documents') return state.legalDown ? send(500, { message: 'down' }) : send(200, wantsObject ? POLICY : [POLICY]);
    if (p === '/rest/v1/plans') return send(200, PLANS);
    if (p === '/rest/v1/rpc/my_access') return send(200, state.access ? [state.access] : []);
    if (p === '/rest/v1/child_profiles' && method === 'GET') return send(200, state.children || []);
    if (p === '/rest/v1/profiles') return send(200, wantsObject ? { id: state.user.id, email: state.user.email, is_admin: !!state.isAdmin } : [{ id: state.user.id, email: state.user.email, is_admin: !!state.isAdmin }]);
    if (p.startsWith('/rest/v1/')) return send(method === 'GET' ? 200 : 201, method === 'GET' ? [] : []);
    // ---- storage + functions ----
    if (p.startsWith('/storage/v1/object/sign/')) return send(200, [{ path: 'x', signedURL: '/object/sign/x?token=t' }]);
    if (p === '/functions/v1/paystack-checkout') return state.checkoutError ? send(409, { error: state.checkoutError }) : send(200, { url: state.checkoutUrl });
    if (p === '/functions/v1/paystack-manage') return send(200, { url: state.manageUrl });
    return send(404, { message: 'unmocked ' + p });
  });
  return state;
}

module.exports = { install, createState, STORIES, PLANS, POLICY };
