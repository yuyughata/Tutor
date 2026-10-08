import { Suspense } from 'react';
import { SignupClient } from './SignupClient';

export const metadata = { title: 'Create your account' };
export default function Page() {
  return <Suspense fallback={null}><SignupClient /></Suspense>;
}
