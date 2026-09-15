import { SHOP } from '@/lib/data';
import type { Dictionary } from '@/lib/i18n/types';

import BookingForm from './BookingForm';
import { LineIcon, PhoneIcon } from './icons';
import SectionHeading from './SectionHeading';

export default function Booking({ dict }: { dict: Dictionary }) {
  const t = dict.booking;

  return (
    <section aria-labelledby="booking-title" id="booking" data-scroll-anchor="booking" className="py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <SectionHeading id="booking-title" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />

          <ol className="mt-10 space-y-6">
            {t.steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ochre-400/50 font-display text-lg text-ochre-400">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-beige-50">{step.title}</p>
                  <p className="mt-1 text-sm text-beige-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-graphite-700 p-5">
            <p className="text-sm text-beige-300">{t.talkToHuman}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={SHOP.phoneHref} className="btn-ghost">
                <PhoneIcon className="h-4 w-4" />
                {SHOP.phoneDisplay}
              </a>
              <a href={SHOP.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <LineIcon className="h-4 w-4 text-brand-line" />
                {t.chatOnLine}
              </a>
            </div>
          </div>
        </div>

        <BookingForm />
      </div>
    </section>
  );
}
