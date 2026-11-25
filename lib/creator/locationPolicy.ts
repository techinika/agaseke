export interface LocationCooldownStatus {
  allowed: boolean;
  lastUpdatedAt: Date | null;
  nextAllowedAt: Date | null;
  remainingDays: number;
}

export function parseLocationTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.toDate === "function") {
      try {
        const d = (record.toDate as () => unknown)();
        if (d instanceof Date && Number.isFinite(d.getTime())) return d;
      } catch {
        // ignore invalid timestamp object
      }
    }
    const seconds =
      typeof record.seconds === "number"
        ? record.seconds
        : typeof record._seconds === "number"
          ? record._seconds
          : null;
    if (seconds !== null && Number.isFinite(seconds)) {
      const d = new Date(seconds * 1000);
      return Number.isFinite(d.getTime()) ? d : null;
    }
  }
  return null;
}

/**
 * Adds one calendar month while clamping to the last day of the target month
 * (e.g. Jan 31 -> Feb 28/29 instead of overflowing into March).
 */
export function addOneCalendarMonth(date: Date): Date {
  const next = new Date(date.getTime());
  const targetDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(targetDay, lastDayOfTargetMonth));
  return next;
}

export function evaluateLocationUpdateCooldown(
  lastUpdatedRaw: unknown,
  now: Date = new Date(),
): LocationCooldownStatus {
  const lastUpdatedAt = parseLocationTimestamp(lastUpdatedRaw);
  if (!lastUpdatedAt) {
    return {
      allowed: true,
      lastUpdatedAt: null,
      nextAllowedAt: null,
      remainingDays: 0,
    };
  }

  const nextAllowedAt = addOneCalendarMonth(lastUpdatedAt);
  const diffMs = nextAllowedAt.getTime() - now.getTime();
  if (diffMs <= 0) {
    return {
      allowed: true,
      lastUpdatedAt,
      nextAllowedAt,
      remainingDays: 0,
    };
  }

  return {
    allowed: false,
    lastUpdatedAt,
    nextAllowedAt,
    remainingDays: Math.max(1, Math.ceil(diffMs / 86_400_000)),
  };
}
