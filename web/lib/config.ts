// Public client configuration. The anon key is designed to be public: every table is protected by row-level security.
// Never put the service-role key or the Paystack secret key here.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cjdrlddvbyfataumdztg.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZHJsZGR2YnlmYXRhdW1kenRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzA0MzcsImV4cCI6MjEwNzA0NjQzN30.SwnZqajinzmRx_6t2oWFlAAV-8v-u9URHImiB1DKhvA';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@custar.com';

/** The folder the site is hosted in (for example "/Genova" for www.custar.ng/Genova), or "" at the root of a domain. Set NEXT_PUBLIC_BASE_PATH when building. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
/** Prefix a site path ("/img/logo.png", "/#about") with the hosting folder. Next's <Link> and router do this by themselves; plain <a>, <img> and fetch() need it. */
export const withBase = (p: string) => `${BASE_PATH}${p}`;
