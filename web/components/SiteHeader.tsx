'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { PremiumBadge } from './PremiumBadge';

// Section links on the landing page (they work from every page), then the app's own pages.
export const NAV_LINKS = [
  { href: '/#about', label: 'About' },
  { href: '/#pillars', label: '7 Pillars' },
  { href: '/#levels', label: 'Reading Levels' },
  { href: '/#app', label: 'Genova App' },
  { href: '/#products', label: 'Storybooks' },
  { href: '/#catalog', label: 'Title Catalog' },
  { href: '/#grp', label: 'Reading Program' },
  { href: '/plans/', label: 'Plans' },
];

export function SiteHeader() {
  const path = usePathname();
  const { ready, session, access } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const cur = (href: string) => (path === href ? 'page' : undefined);
  const close = () => setOpen(false);
  return (
    <header className="site-head">
      <div className="nav">
        <Link href="/" className="logo-link" aria-label="Custar Genova home">
          <img className="logo-img" src="/img/genova-logo.png" width={92} height={40} alt="Custar Genova logo" />
        </Link>
        <nav className="nav-links" aria-label="Main">
          {NAV_LINKS.map((l) => <Link key={l.href} href={l.href} aria-current={cur(l.href)}>{l.label}</Link>)}
        </nav>
        <div className="nav-cta">
          {ready && session && <Link href="/account/" className="nav-account" aria-current={cur('/account/')}>Account</Link>}
          {ready && session && access.active && <PremiumBadge access={access} />}
          {ready && !session && <Link href="/login/" className="nav-account" aria-current={cur('/login/')}>Sign in</Link>}
          {ready && !session && <Link href="/signup/" className="btn btn-primary btn-sm">Get started</Link>}
        </div>
        <button className="menu-toggle" aria-label="Menu" aria-expanded={open} aria-controls="mobileMenu" onClick={() => setOpen((o) => !o)}>{open ? '✕' : '☰'}</button>
      </div>
      <nav className={`mobile-menu${open ? ' open' : ''}`} id="mobileMenu" aria-label="Menu">
        {NAV_LINKS.map((l) => <Link key={l.href} href={l.href} onClick={close}>{l.label}</Link>)}
        {ready && session && <Link href="/account/" onClick={close}>Your account</Link>}
        {ready && !session && <Link href="/login/" onClick={close}>Sign in</Link>}
        {ready && !session && <Link href="/signup/" className="btn btn-primary btn-block" onClick={close}>Get started</Link>}
      </nav>
    </header>
  );
}
