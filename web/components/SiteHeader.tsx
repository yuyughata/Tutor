'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PremiumBadge } from './PremiumBadge';

const LINKS = [{ href: '/plans/', label: 'Plans' }, { href: '/privacy/', label: 'Privacy' }];

export function SiteHeader() {
  const path = usePathname();
  const { ready, session, access } = useAuth();
  return (
    <header className="site-head">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="Genova home">Gen<i>o</i>va</Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>)}
          {ready && session && <Link href="/account/" aria-current={path === '/account/' ? 'page' : undefined}>Account</Link>}
          {ready && session && access.active && <PremiumBadge access={access} />}
          {ready && !session && <Link href="/login/">Sign in</Link>}
          {ready && !session && <Link href="/signup/" className="btn" style={{ minHeight: 42, padding: '8px 20px' }}>Get started</Link>}
        </nav>
      </div>
    </header>
  );
}
