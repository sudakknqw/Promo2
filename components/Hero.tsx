import Image from 'next/image';

import { SHOP, getHoursSummary } from '@/lib/data';

import { ClockIcon, MapPinIcon } from './icons';

export default function Hero() {
  const hours = getHoursSummary();

  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate flex min-h-[calc(100svh-4rem)] items-end overflow-hidden">
      <Image
        src="/images/hero.jpg"
        alt="Interior of Sharp Barber Bangkok with black leather barber chairs, steel workstations and artwork on dark walls"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-graphite-950 via-graphite-950/60 to-graphite-950/10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-graphite-950/70 to-transparent" />

      <div className="container-page pb-10 pt-24 sm:pb-16 lg:pb-20">
        <p className="eyebrow flex items-center gap-2">
          <MapPinIcon className="h-4 w-4" />
          Sukhumvit Soi 11 · Bangkok
        </p>
        <h1
          id="hero-title"
          className="mt-4 font-display text-[3.4rem] font-bold uppercase leading-[0.9] tracking-tight text-beige-50 sm:text-7xl lg:text-8xl"
        >
          Sharp Barber
          <span className="block text-ochre-400">Bangkok</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-beige-200 sm:text-xl">{SHOP.slogan}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#booking" className="btn-primary min-h-14 px-8 text-base">
            Book now
          </a>
          <a href="#services" className="btn-ghost min-h-14 px-8 text-base">
            See services & prices
          </a>
        </div>

        <div className="mt-10 inline-flex max-w-full items-start gap-3 rounded-2xl border border-beige-300/15 bg-graphite-950/60 p-4 backdrop-blur-sm">
          <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-ochre-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-beige-400">Opening hours</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-beige-100">
              {hours.map((h) => (
                <li key={h.days}>
                  <span className="font-semibold">{h.days}</span>{' '}
                  <span className="tabular-nums text-beige-300">{h.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
