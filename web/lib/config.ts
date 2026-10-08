// Public client configuration. The anon key is designed to be public: every table is protected by row-level security.
// Never put the service-role key or the Paystack secret key here.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cjdrlddvbyfataumdztg.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZHJsZGR2YnlmYXRhdW1kenRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzA0MzcsImV4cCI6MjEwNzA0NjQzN30.SwnZqajinzmRx_6t2oWFlAAV-8v-u9URHImiB1DKhvA';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@custar.com';
