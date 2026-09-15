import { notFound } from 'next/navigation';

// Unknown paths inside a locale (/en/whatever) show the localized 404 from ../not-found.tsx.
export default function CatchAll() {
  notFound();
}
