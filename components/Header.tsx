import { SHOP } from '@/lib/data';

import { LineIcon, PhoneIcon } from './icons';
import Logo from './Logo';

const iconButton =
  'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-beige-300/25 px-3 text-sm font-semibold text-beige-100 transition hover:border-ochre-400 hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-graphite-700/80 bg-graphite-950/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <a
          href="#top"
          aria-label={`${SHOP.name}, back to top`}
          className="group shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-400"
        >
          {/* On very narrow screens only the icon stays. */}
          <Logo hideTextOnNarrow />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 text-sm text-beige-300 lg:flex">
          <a href="#services" className="transition hover:text-ochre-300">Services</a>
          <a href="#barbers" className="transition hover:text-ochre-300">Barbers</a>
          <a href="#reviews" className="transition hover:text-ochre-300">Reviews</a>
          <a href="#location" className="transition hover:text-ochre-300">Location</a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a href={SHOP.phoneHref} className={iconButton} aria-label={`Call us at ${SHOP.phoneDisplay}`}>
            <PhoneIcon className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">Call</span>
          </a>
          <a
            href={SHOP.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={iconButton}
            aria-label="Message us on LINE (opens in a new tab)"
          >
            <LineIcon className="h-[18px] w-[18px] text-brand-line" />
            <span className="hidden sm:inline">LINE</span>
          </a>
          <a href="#booking" className="btn-primary ml-0.5 whitespace-nowrap px-3.5 tracking-normal sm:ml-1 sm:px-5 sm:tracking-wider">
            Book now
          </a>
        </div>
      </div>
    </header>
  );
}
