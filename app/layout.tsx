import type { Metadata, Viewport } from 'next';
import { Inter, Oswald } from 'next/font/google';

import './globals.css';

const display = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sharp Barber Bangkok | Haircuts, Fades & Hot Towel Shaves',
  description:
    'Barbershop on Sukhumvit Soi 11, Bangkok. Precision haircuts, skin fades, beard trims and straight razor shaves. Book online in a minute. Demo project.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#17181a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
