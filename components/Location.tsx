import { OPENING_HOURS, SHOP, WEEK_ORDER, formatMinutes } from '@/lib/data';

import { LineIcon, MapPinIcon, PhoneIcon } from './icons';
import SectionHeading from './SectionHeading';

export default function Location() {
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(SHOP.mapQuery)}&output=embed`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.mapQuery)}`;

  return (
    <section aria-labelledby="location-title" id="location" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          id="location-title"
          eyebrow="How to find us"
          title="Visit the shop"
          intro="Five minutes' walk from BTS Nana, Exit 3. Look for the ochre pole."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-graphite-700 bg-graphite-800 p-6">
              <h3 className="flex items-center gap-2 font-display text-xl uppercase tracking-wide text-beige-50">
                <MapPinIcon className="h-5 w-5 text-ochre-400" />
                Address
              </h3>
              <address className="mt-3 not-italic leading-relaxed text-beige-200">
                {SHOP.address.line1}
                <br />
                {SHOP.address.line2}
                <br />
                {SHOP.address.city}
              </address>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Get directions
                </a>
                <a href={SHOP.phoneHref} className="btn-ghost" aria-label={`Call us at ${SHOP.phoneDisplay}`}>
                  <PhoneIcon className="h-4 w-4" />
                  Call
                </a>
                <a href={SHOP.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  <LineIcon className="h-4 w-4 text-brand-line" />
                  LINE
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-graphite-700 bg-graphite-800 p-6">
              <h3 className="font-display text-xl uppercase tracking-wide text-beige-50">Opening hours</h3>
              <dl className="mt-3 divide-y divide-graphite-600">
                {WEEK_ORDER.map((i) => {
                  const { day, open, close } = OPENING_HOURS[i];
                  return (
                    <div key={day} className="flex justify-between py-2.5 text-sm">
                      <dt className="text-beige-300">{day}</dt>
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
              title={`Map showing ${SHOP.name} on Sukhumvit Soi 11, Bangkok`}
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
