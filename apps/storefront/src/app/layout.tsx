import type { Metadata } from 'next';
import './globals.css';
import { StorefrontProviders } from './providers';

export const metadata: Metadata = {
  title: 'Anzara - Premium Modest Fashion',
  description: 'Discover premium modest fashion at Anzara. Abayas, hijabs, borkas, and more.',
  metadataBase: new URL(process.env['APP_URL'] || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <StorefrontProviders>{children}</StorefrontProviders>
      </body>
    </html>
  );
}
