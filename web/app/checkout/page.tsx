import { Suspense } from 'react';
import { CheckoutClient } from './CheckoutClient';

export const metadata = { title: 'Checkout' };
export default function Page() {
  return <Suspense fallback={<div className="wrap page-top"><p className="muted">Loading…</p></div>}><CheckoutClient /></Suspense>;
}
