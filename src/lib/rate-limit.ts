const rateLimiters = new Map<string, Map<string, { count: number; resetTime: number }>>();

// Clean up expired entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [, store] of rateLimiters) {
      for (const [key, entry] of store) {
        if (now > entry.resetTime) {
          store.delete(key);
        }
      }
    }
  }, 60_000);
  // Don't prevent Node from exiting
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

export function rateLimit({
  windowMs,
  maxRequests,
}: {
  windowMs: number;
  maxRequests: number;
}) {
  const store = new Map<string, { count: number; resetTime: number }>();
  rateLimiters.set(`${windowMs}-${maxRequests}-${Date.now()}`, store);
  ensureCleanup();

  return {
    check(ip: string): { success: boolean; remaining: number } {
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now > entry.resetTime) {
        store.set(ip, { count: 1, resetTime: now + windowMs });
        return { success: true, remaining: maxRequests - 1 };
      }

      if (entry.count >= maxRequests) {
        return { success: false, remaining: 0 };
      }

      entry.count++;
      return { success: true, remaining: maxRequests - entry.count };
    },
  };
}
