import Image from 'next/image';

import { BARBERS } from '@/lib/data';

import SectionHeading from './SectionHeading';

export default function Barbers() {
  return (
    <section aria-labelledby="barbers-title" id="barbers" className="border-y border-graphite-700 bg-graphite-950 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          id="barbers-title"
          eyebrow="The team"
          title="Meet your barbers"
          intro="Three chairs, three specialists. Pick your favourite when booking, or let us match you with whoever is free."
        />

        <ul className="mt-12 grid gap-6 sm:grid-cols-3">
          {BARBERS.map((barber) => (
            <li key={barber.id} className="overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-800">
              <div className="relative aspect-[4/5]">
                <Image
                  src={barber.image}
                  alt={barber.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover object-top"
                />
              </div>
              <div className="p-5">
                <p className="eyebrow">{barber.role}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold uppercase text-beige-50">{barber.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-beige-300">{barber.specialty}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
