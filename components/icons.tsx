import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

export function LineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="M12 3C6.48 3 2 6.58 2 11c0 3.96 3.53 7.28 8.3 7.9.32.07.76.21.87.49.1.25.07.64.03.9l-.14.84c-.04.25-.2.98.86.53 1.06-.44 5.72-3.37 7.8-5.77C21.16 14.3 22 12.74 22 11c0-4.42-4.48-8-10-8Z" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        d="M12 2.75a9.25 9.25 0 0 0-7.98 13.93L2.75 21.25l4.7-1.23A9.25 9.25 0 1 0 12 2.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.03 7.55c.18-.4.37-.41.54-.42h.46c.16 0 .41.06.63.3.21.24.83.8.83 1.96s-.85 2.27-.97 2.43c-.12.16.02.36.09.46.08.1 1.1 1.73 2.7 2.37 1.33.52 1.6.42 1.9.39.28-.03.92-.37 1.05-.74.13-.36.13-.67.09-.74-.04-.06-.14-.1-.3-.18l-1.52-.73c-.2-.07-.35-.1-.5.12-.14.22-.57.72-.7.87-.13.15-.26.17-.48.06a6.1 6.1 0 0 1-3-2.6c-.23-.39.22-.36.64-1.2.07-.14.04-.27-.02-.38l-.7-1.66c-.16-.4-.33-.39-.46-.39"
        fill="currentColor"
      />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v4M10 15.5h4" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.5V12h2.8v9.7H14V12h2.8l.4-3.5H14Z" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...props}>
      <path d="M16.2 3c.3 2.3 1.8 4 4 4.3v3.1a7 7 0 0 1-4-1.3v6a5.9 5.9 0 1 1-5.9-5.9l.6.03v3.2a2.8 2.8 0 1 0 2.2 2.7V3h3.1Z" />
    </svg>
  );
}
