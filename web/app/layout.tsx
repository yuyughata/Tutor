import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AuthProvider } from '@/lib/auth';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

const nunito = localFont({
  src: [
    { path: './fonts/Nunito-600.ttf', weight: '600' },
    { path: './fonts/Nunito-800.ttf', weight: '800' },
    { path: './fonts/Nunito-900.ttf', weight: '900' },
  ],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Genova: storybooks that grow with every reader', template: '%s · Genova' },
  description: 'Genova is a safe, ad-free storybook app for children, with stories at three reading levels. Subscribe on the web and read on your phone or tablet.',
};
export const viewport: Viewport = { themeColor: '#ab46d2', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <AuthProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
