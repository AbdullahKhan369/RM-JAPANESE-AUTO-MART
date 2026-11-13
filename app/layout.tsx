import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { CURRENCY_COOKIE } from '@/lib/constants';
import { getRates } from '@/lib/rates';
import { getSiteContent, t } from '@/lib/site-content';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { CurrencyProvider } from '@/components/providers/CurrencyProvider';
import { ToastProvider } from '@/components/ui/Toast';
import type { Currency } from '@/types/database';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function metadataBase(): URL {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL('http://localhost:3000');
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const name = t(content, 'site_name');
  const description = t(content, 'seo_description');
  return {
    metadataBase: metadataBase(),
    title: { default: t(content, 'seo_title'), template: `%s | ${name}` },
    description,
    applicationName: name,
    openGraph: {
      type: 'website',
      siteName: name,
      title: t(content, 'seo_title'),
      description,
      images: [{ url: '/logo.png', alt: name }],
    },
    twitter: { card: 'summary_large_image', title: t(content, 'seo_title'), description },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
};

function parseCurrency(value: string | undefined): Currency | null {
  return value === 'PKR' || value === 'GBP' || value === 'EUR' ? value : null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialCurrency = parseCurrency(cookies().get(CURRENCY_COOKIE)?.value);
  const { rates } = await getRates();

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            <CurrencyProvider initialCurrency={initialCurrency} rates={rates}>
              {children}
            </CurrencyProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
