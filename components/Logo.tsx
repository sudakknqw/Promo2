import ScissorsIcon from './ScissorsIcon';

/**
 * Brand mark: scissors icon + brand name. Used in the header and footer.
 * Inside a link with the `group` class, the icon and text lighten on hover.
 */
export default function Logo({ brand, hideTextOnMobile = false }: { brand: string; hideTextOnMobile?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <ScissorsIcon className="h-6 w-6 shrink-0 text-ochre-400 transition-colors group-hover:text-ochre-300 sm:h-7 sm:w-7" />
      <span
        className={`${hideTextOnMobile ? 'hidden min-[480px]:inline' : 'inline'} whitespace-nowrap font-display text-lg font-bold uppercase leading-none tracking-wide text-beige-50 transition-colors group-hover:text-white sm:text-xl`}
      >
        {brand}
      </span>
    </span>
  );
}
