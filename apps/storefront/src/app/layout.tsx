import type { Metadata } from 'next';
import './globals.css';
import { StorefrontProviders } from './providers';
import { WhatsAppButton } from '../components/whatsapp-button';
import { SiteJsonLd } from '../components/site-jsonld';
import { AnalyticsScripts } from '../components/analytics';

const APP_URL = process.env['APP_URL'] || 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Anzara - Premium Modest Fashion',
    template: '%s · Anzara',
  },
  description: 'Discover premium modest fashion at Anzara. Abayas, hijabs, borkas, and more.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    siteName: 'Anzara',
    locale: 'en_BD',
    url: APP_URL,
  },
  twitter: { card: 'summary_large_image', site: '@anzara' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AnalyticsScripts />
      </head>
      <body className="min-h-screen antialiased">
        <StorefrontProviders>{children}</StorefrontProviders>
        <WhatsAppButton />
        <SiteJsonLd siteUrl={APP_URL} />
      </body>
    </html>
  );
}
