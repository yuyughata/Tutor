import { Suspense } from 'react';
import { ForgotClient } from './ForgotClient';

export const metadata = { title: 'Reset your password' };
export default function Page() {
  return <Suspense fallback={null}><ForgotClient /></Suspense>;
}
