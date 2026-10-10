import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './design.css';
import './pages.css';

export const metadata: Metadata = {
  title: { default: 'Genova · Storybooks That Stay and Grow With Them', template: '%s · Genova' },
  description: 'Genova storybooks stay and grow with your child. Rooted in family and faith culture, crafted to spark a love for reading and nurture confident readers and well-grounded learners.',
};
export const viewport: Viewport = { themeColor: '#6C2BD9', width: 'device-width', initialScale: 1 };

// Same fonts as the landing page design: Baloo 2 (headings), Fraunces (display), Inter (text), Caveat (handwritten labels).
const FONTS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,500&family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="page-body">
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
