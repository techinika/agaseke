import { describe, expect, it } from "vitest";
import { parseFxSnapshot, isSnapshotFresh } from "../src/money/fx";
import { refreshFxRates } from "../src/services/fxRates";

function makeEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    FX_RATES_ENABLED: "true",
    FX_RATE_BASE: "USD",
    FX_RATE_REFRESH_MINUTES: "360",
    FX_RATE_MAX_AGE_MINUTES: "1440",
    ...overrides,
  } as any;
}

describe("fx snapshot freshness", () => {
  it("treats a snapshot within max age as fresh", () => {
    const snapshot = parseFxSnapshot({
      base: "USD",
      rates: { RWF: 1300 },
      fetchedAt: new Date().toISOString(),
      source: "test",
    });
    expect(isSnapshotFresh(snapshot, new Date(), 60)).toBe(true);
  });

  it("treats an old snapshot as stale", () => {
    const snapshot = parseFxSnapshot({
      base: "USD",
      rates: { RWF: 1300 },
      fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      source: "test",
    });
    expect(isSnapshotFresh(snapshot, new Date(), 60)).toBe(false);
  });
});

describe("refreshFxRates", () => {
  it("skips when FX rates are disabled", async () => {
    const res = await refreshFxRates(makeEnv({ FX_RATES_ENABLED: "false" }));
    expect(res.skipped).toBe(true);
  });
});
