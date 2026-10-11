import type { Metadata } from 'next';
import './globals.css';
import { AdminProviders } from './providers';

export const metadata: Metadata = {
  title: 'Anzara Admin',
  description: 'Anzara admin dashboard',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
