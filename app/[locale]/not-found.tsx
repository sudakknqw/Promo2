'use client';

import Link from 'next/link';

import { useI18n } from '@/components/I18nProvider';

export default function LocaleNotFound() {
  const { locale, dict } = useI18n();

  return (
    <main className="container-page flex min-h-screen flex-col items-start justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold uppercase text-beige-50">{dict.notFound.title}</h1>
      <p className="mt-4 text-beige-300">{dict.notFound.text}</p>
      <Link href={`/${locale}`} className="btn-primary mt-8">
        {dict.notFound.home}
      </Link>
    </main>
  );
}
