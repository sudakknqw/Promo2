import { RazorIcon } from './icons';

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ochre-400/60 text-ochre-400">
        <RazorIcon className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold uppercase tracking-wide text-beige-50">Sharp</span>
        <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-beige-400">
          Barber · BKK
        </span>
      </span>
    </span>
  );
}
