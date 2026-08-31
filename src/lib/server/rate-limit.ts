const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    throw new Error("Too many requests. Please wait a moment and try again.");
  }
  hits.push(now);
  buckets.set(key, hits);
}
