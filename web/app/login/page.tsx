import { Suspense } from 'react';
import { LoginClient } from './LoginClient';

export const metadata = { title: 'Sign in' };
export default function Page() {
  return <Suspense fallback={null}><LoginClient /></Suspense>;
}
