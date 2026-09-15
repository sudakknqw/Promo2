import { SHOP } from '@/lib/data';

import { FacebookIcon, InstagramIcon, LineIcon, TikTokIcon } from './icons';
import Logo from './Logo';

// Platform homepages only: this is a fictional business with no real accounts.
const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: InstagramIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: FacebookIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/', Icon: TikTokIcon },
  { label: 'LINE', href: SHOP.lineUrl, Icon: LineIcon },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-graphite-700 bg-graphite-950">
      <div className="container-page flex flex-col gap-8 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-beige-400">{SHOP.slogan}</p>
        </div>

        <ul className="flex gap-3" aria-label="Social media">
          {SOCIALS.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-beige-300/20 text-beige-200 transition hover:border-ochre-400 hover:text-ochre-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-400"
              >
                <Icon className="h-5 w-5" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-graphite-700">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-beige-400 sm:flex-row sm:justify-between">
          <p>
            © {year} {SHOP.name}. All rights reserved.
          </p>
          <p className="font-semibold uppercase tracking-wider text-ochre-400">Demo project — not a real business</p>
        </div>
      </div>
    </footer>
  );
}
