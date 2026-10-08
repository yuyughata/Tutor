// Public client configuration for the GenovaStorybook Supabase project.
// The anon key is designed to be public: every table is protected by row-level security.
// Never put the service-role key or the Paystack secret key in this file.
window.GENOVA = {
  supabaseUrl: 'https://cjdrlddvbyfataumdztg.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZHJsZGR2YnlmYXRhdW1kenRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzA0MzcsImV4cCI6MjEwNzA0NjQzN30.SwnZqajinzmRx_6t2oWFlAAV-8v-u9URHImiB1DKhvA',
  // Display only on the subscribe page. The real price is set on the Paystack plan (PLN_...).
  plans: {
    monthly: { label: 'Monthly', price: '₦2,500', per: 'per month' },
    yearly: { label: 'Yearly', price: '₦24,000', per: 'per year', badge: 'Save 20%' },
  },
  // demo: true,   // uncomment to preview the admin dashboard with sample data and no backend
};
