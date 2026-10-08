// Copy to config.js and fill in. The anon key is public by design; never put the Paystack secret here.
window.GENOVA = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY',
  // Display only. The real price is set on the Paystack plan (PLN_...) in your dashboard.
  plans: {
    monthly: { label: 'Monthly', price: '₦2,500', per: 'per month' },
    yearly: { label: 'Yearly', price: '₦24,000', per: 'per year', badge: 'Save 20%' },
  },
};
