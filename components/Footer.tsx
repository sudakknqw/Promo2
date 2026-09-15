import { SOCIALS } from '@/lib/data';
import { interpolate } from '@/lib/i18n/text';
import type { Dictionary } from '@/lib/i18n/types';

import { FacebookIcon, InstagramIcon, LineIcon, TikTokIcon } from './icons';
import Logo from './Logo';

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  line: LineIcon,
} as const;

export default function Footer({ dict }: { dict: Dictionary }) {
  const year = new Date().getFullYear();

  return (
    <footer data-scroll-anchor="footer" className="border-t border-graphite-700 bg-graphite-950">
      <div className="container-page flex flex-col gap-8 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo brand={dict.shop.brand} />
          <p className="mt-3 text-sm text-beige-400">{dict.shop.slogan}</p>
        </div>

        <ul className="flex gap-3" aria-label={dict.footer.social}>
          {SOCIALS.map(({ id, label, href }) => {
            const Icon = SOCIAL_ICONS[id];
            return (
              <li key={id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={interpolate(dict.common.opensInNewTab, { label })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-beige-300/20 text-beige-200 transition hover:border-ochre-400 hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400"
                >
                  <Icon className="h-5 w-5" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-graphite-700">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-beige-400 sm:flex-row sm:justify-between">
          <p>{interpolate(dict.footer.rights, { year, name: dict.shop.name })}</p>
          <p className="font-semibold uppercase tracking-wider text-ochre-400">{dict.footer.demo}</p>
        </div>
      </div>
    </footer>
  );
}
