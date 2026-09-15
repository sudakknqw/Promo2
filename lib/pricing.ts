// Totals for a booking with one or more services.
//
// SERVICES in lib/data.ts is the only price list. The form uses these helpers to
// show totals instantly; the API receives service ids only and recalculates
// everything on the server with the same functions. Prices sent by a browser
// are never read.

import { SERVICES } from './data';

export type ServiceLine = { id: string; name: string; priceThb: number; durationMin: number };

export type Quote = {
  services: ServiceLine[];
  totalPriceThb: number;
  totalDurationMin: number;
};

/** Unknown ids are ignored, duplicates count once, lines follow the price list order. */
export function quoteServices(ids: readonly string[]): Quote {
  const selected = new Set(ids);
  const services = SERVICES.filter((s) => selected.has(s.id)).map(({ id, name, priceThb, durationMin }) => ({
    id,
    name,
    priceThb,
    durationMin,
  }));

  return {
    services,
    totalPriceThb: services.reduce((sum, s) => sum + s.priceThb, 0),
    totalDurationMin: services.reduce((sum, s) => sum + s.durationMin, 0),
  };
}

/** "Signature Haircut + Beard Trim & Shape" */
export function joinServiceNames(lines: readonly { name: string }[]): string {
  return lines.map((s) => s.name).join(' + ');
}
