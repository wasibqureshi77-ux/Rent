import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import SubscriptionGuard from '@/components/providers/SubscriptionGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PG Management',
  description: 'Manage your PG tenants, bills, and electricity readings efficiently.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionGuard>
              {children}
            </SubscriptionGuard>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
