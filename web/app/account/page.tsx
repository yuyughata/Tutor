import { Suspense } from 'react';
import { AccountClient } from './AccountClient';

export const metadata = { title: 'Your account' };
export default function Page() {
  return <Suspense fallback={<div className="wrap page-top"><p className="muted">Loading…</p></div>}><AccountClient /></Suspense>;
}
