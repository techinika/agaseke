const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit({
  interval = 60_000,
  max = 30,
  key,
}: {
  interval?: number;
  max?: number;
  key: string;
}): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + interval });
    return { allowed: true, remaining: max - 1, resetIn: interval };
  }

  entry.count++;

  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  return { allowed: true, remaining: max - entry.count, resetIn: entry.resetAt - now };
}

export function rateLimitByIp(req: Request, { interval, max }: { interval?: number; max?: number } = {}) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return rateLimit({ interval, max, key: `ip:${ip}` });
}
