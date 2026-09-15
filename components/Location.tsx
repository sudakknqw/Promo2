import { OPENING_HOURS, SHOP, WEEK_ORDER, formatMinutes } from '@/lib/data';
import type { Locale } from '@/lib/i18n/config';
import { interpolate } from '@/lib/i18n/text';
import type { Dictionary } from '@/lib/i18n/types';

import { LineIcon, MapPinIcon, PhoneIcon } from './icons';
import SectionHeading from './SectionHeading';

export default function Location({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.location;
  const { address } = dict.shop;
  const query = encodeURIComponent(SHOP.mapQuery);
  // hl: map labels in the page language.
  const mapSrc = `https://www.google.com/maps?q=${query}&hl=${locale}&output=embed`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${query}&hl=${locale}`;

  return (
    <section aria-labelledby="location-title" id="location" data-scroll-anchor="location" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading id="location-title" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-graphite-700 bg-graphite-800 p-6">
              <h3 className="flex items-center gap-2 font-display text-xl uppercase tracking-wide text-beige-50">
                <MapPinIcon className="h-5 w-5 text-ochre-400" />
                {t.address}
              </h3>
              <address className="mt-3 not-italic leading-relaxed text-beige-200">
                {address.line1}
                <br />
                {address.line2}
                <br />
                {address.city}
              </address>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  {t.getDirections}
                </a>
                <a
                  href={SHOP.phoneHref}
                  className="btn-ghost"
                  aria-label={interpolate(dict.common.callUsAt, { phone: SHOP.phoneDisplay })}
                >
                  <PhoneIcon className="h-4 w-4" />
                  {dict.common.call}
                </a>
                <a href={SHOP.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  <LineIcon className="h-4 w-4 text-brand-line" />
                  {dict.common.line}
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-graphite-700 bg-graphite-800 p-6">
              <h3 className="font-display text-xl uppercase tracking-wide text-beige-50">{t.hours}</h3>
              <dl className="mt-3 divide-y divide-graphite-600">
                {WEEK_ORDER.map((day) => {
                  const { open, close } = OPENING_HOURS[day];
                  return (
                    <div key={day} className="flex justify-between gap-4 py-2.5 text-sm">
                      <dt className="text-beige-300">{dict.time.daysLong[day]}</dt>
                      <dd className="tabular-nums text-beige-50">
                        {formatMinutes(open)} – {formatMinutes(close)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-800">
            <iframe
              src={mapSrc}
              title={interpolate(t.mapTitle, { name: dict.shop.name })}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0 grayscale-[35%]"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
