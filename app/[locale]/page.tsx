import { notFound } from 'next/navigation';

import Barbers from '@/components/Barbers';
import Booking from '@/components/Booking';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import LocaleScrollRestorer from '@/components/LocaleScrollRestorer';
import Location from '@/components/Location';
import Reviews from '@/components/Reviews';
import Services from '@/components/Services';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ochre-400 focus:px-4 focus:py-2 focus:text-graphite-950"
      >
        {dict.common.skipToContent}
      </a>
      <Header locale={locale} dict={dict} />
      <main id="main">
        <Hero dict={dict} />
        <Services dict={dict} />
        <Barbers dict={dict} />
        <Booking dict={dict} />
        <Reviews dict={dict} />
        <Location locale={locale} dict={dict} />
      </main>
      <Footer dict={dict} />
      <LocaleScrollRestorer />
    </>
  );
}
