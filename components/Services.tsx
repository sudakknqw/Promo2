import Image from 'next/image';

import { SERVICES, formatPrice } from '@/lib/data';
import { formatDuration, serviceText } from '@/lib/i18n/text';
import type { Dictionary } from '@/lib/i18n/types';

import { ClockIcon } from './icons';
import SectionHeading from './SectionHeading';

export default function Services({ dict }: { dict: Dictionary }) {
  const t = dict.services;

  return (
    <section aria-labelledby="services-title" id="services" data-scroll-anchor="services" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading id="services-title" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const text = serviceText(dict, service.id);
            return (
              <li
                key={service.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-800 transition hover:border-ochre-500/50"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={service.image}
                    alt={text.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl font-semibold uppercase leading-tight text-beige-50">{text.name}</h3>
                    <p className="shrink-0 font-display text-2xl font-semibold text-ochre-400">{formatPrice(service.priceThb)}</p>
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-beige-300">{text.description}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-beige-400">
                    <ClockIcon className="h-4 w-4" />
                    {formatDuration(service.durationMin, dict)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
