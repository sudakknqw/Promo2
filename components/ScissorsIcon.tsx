import type { SVGProps } from 'react';

type ScissorsIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  title?: string;
};

/**
 * Classic barber scissors, vertical: finger rings on top, blades pointing down.
 * Outline only, so it inherits color from `currentColor` like a painted shop sign.
 */
export default function ScissorsIcon({ title, className, ...props }: ScissorsIconProps) {
  const a11y = title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={className}
      {...a11y}
      {...props}
    >
      {title && <title>{title}</title>}

      {/* Finger rings, set slightly apart */}
      <circle cx="7.6" cy="4.6" r="2.7" />
      <circle cx="16.4" cy="4.6" r="2.7" />

      {/* Finger rest (tang) curling off the left ring */}
      <path d="M5.3 6.4C4.2 7.3 4.1 8.8 5 9.6" />

      {/* Shanks: curve in from the rings to the pivot */}
      <path d="M9.3 6.7C10.3 8.2 11 9.9 11.4 11.5" />
      <path d="M14.7 6.7C13.7 8.2 13 9.9 12.6 11.5" />

      {/* Pivot screw */}
      <circle cx="12" cy="12.4" r="0.95" />

      {/* Blades: cross at the pivot (each continues the opposite shank), open slightly
          and taper from a narrow wedge into a single line, so a gap stays visible at 24px. */}
      <path d="M12.8 13.3C11.9 16.3 10.2 19.6 8.8 22.4C9.8 20.2 11.1 17.3 11.6 14.8" />
      <path d="M11.2 13.3C12.1 16.3 13.8 19.6 15.2 22.4C14.2 20.2 12.9 17.3 12.4 14.8" />
    </svg>
  );
}
