import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Thai, Oswald } from 'next/font/google';
import { notFound } from 'next/navigation';

import { I18nProvider } from '@/components/I18nProvider';
import { LOCALES, isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

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

// Thai needs its own font. The "latin" subset keeps Latin letters inside Thai text consistent.
const thai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return new URL(explicit ?? (vercel ? `https://${vercel}` : 'http://localhost:3000'));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) return {};
  const dict = getDictionary(params.locale);

  return {
    metadataBase: siteUrl(),
    title: dict.meta.title,
    description: dict.meta.description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${params.locale}`,
      // <link rel="alternate" hreflang="..."> between the language versions.
      languages: { en: '/en', th: '/th', 'x-default': '/en' },
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#17181a',
  width: 'device-width',
  initialScale: 1,
};

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const dict = getDictionary(params.locale);

  return (
    <html lang={params.locale} className={`${display.variable} ${body.variable} ${thai.variable}`}>
      <body>
        <I18nProvider locale={params.locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
