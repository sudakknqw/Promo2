import 'server-only';

// Sliding-window, in-memory limiter. Good enough for a single Node server.
// On serverless/multi-instance hosting each instance keeps its own counters;
// swap this for a shared store (e.g. Upstash Redis) if that matters.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_KEYS = 5000;

const store = globalThis as unknown as { __bookingRateLimit?: Map<string, number[]> };
const hits = (store.__bookingRateLimit ??= new Map<string, number[]>());

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSec: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    hits.forEach((times, k) => {
      if (now - times[times.length - 1] >= WINDOW_MS) hits.delete(k);
    });
  }

  return { allowed: true };
}
