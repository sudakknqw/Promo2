import type { Dictionary } from '@/lib/i18n/types';

import { StarIcon } from './icons';
import SectionHeading from './SectionHeading';

export default function Reviews({ dict }: { dict: Dictionary }) {
  const t = dict.reviews;

  return (
    <section
      aria-labelledby="reviews-title"
      id="reviews"
      data-scroll-anchor="reviews"
      className="border-y border-graphite-700 bg-graphite-950 py-20 sm:py-28"
    >
      <div className="container-page">
        <SectionHeading id="reviews-title" eyebrow={t.eyebrow} title={t.title} />

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {t.items.map((review) => (
            <li key={review.name}>
              <figure className="flex h-full flex-col rounded-2xl border border-graphite-700 bg-graphite-800 p-6">
                <div className="flex gap-1 text-ochre-400" role="img" aria-label={t.rating}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon key={i} className="h-4 w-4" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 leading-relaxed text-beige-200">
                  <p>“{review.text}”</p>
                </blockquote>
                <figcaption className="mt-6 border-t border-graphite-600 pt-4 font-display text-lg uppercase tracking-wide text-beige-50">
                  {review.name}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
