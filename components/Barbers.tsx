import Image from 'next/image';

import { BARBERS } from '@/lib/data';
import { barberText } from '@/lib/i18n/text';
import type { Dictionary } from '@/lib/i18n/types';

import SectionHeading from './SectionHeading';

export default function Barbers({ dict }: { dict: Dictionary }) {
  const t = dict.barbers;

  return (
    <section
      aria-labelledby="barbers-title"
      id="barbers"
      data-scroll-anchor="barbers"
      className="border-y border-graphite-700 bg-graphite-950 py-20 sm:py-28"
    >
      <div className="container-page">
        <SectionHeading id="barbers-title" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />

        <ul className="mt-12 grid gap-6 sm:grid-cols-3">
          {BARBERS.map((barber) => {
            const text = barberText(dict, barber.id);
            return (
              <li key={barber.id} className="overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-800">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={barber.image}
                    alt={text.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover object-top"
                  />
                </div>
                <div className="p-5">
                  <p className="eyebrow">{text.role}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold uppercase text-beige-50">{text.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-beige-300">{text.specialty}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
