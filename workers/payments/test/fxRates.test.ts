import { describe, expect, it, vi } from "vitest";
import { parseFxSnapshot, isSnapshotFresh } from "../src/money/fx";
import { refreshFxRates } from "../src/services/fxRates";
import type { Env } from "../src/types";

function makeEnv(overrides: Record<string, string | undefined> = {}): Env {
  return {
    FX_RATES_ENABLED: "true",
    FX_RATE_BASE: "USD",
    FX_RATE_REFRESH_MINUTES: "360",
    FX_RATE_MAX_AGE_MINUTES: "1440",
    FIREBASE_PROJECT_ID: "test-project",
    FIREBASE_CLIENT_EMAIL: "test@example.com",
    FIREBASE_PRIVATE_KEY: "",
    ...overrides,
  } as unknown as Env;
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

  it("prefers api.frankfurter.dev v2 as the primary FX provider", async () => {
    vi.resetModules();
    const firestoreSet = vi.fn(async () => true);
    vi.doMock("../src/firestore", async (importOriginal) => {
      const mod = await importOriginal<typeof import("../src/firestore")>();
      return {
        ...mod,
        firestoreSet,
        firestoreGet: vi.fn(async () => null),
      };
    });
    vi.doMock("../src/logger", () => ({
      logActivity: vi.fn(async () => {}),
    }));

    const { refreshFxRates: mockedRefresh } = await import("../src/services/fxRates");
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      requestedUrls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => [
          { date: "2026-11-25", base: "USD", quote: "RWF", rate: 1478.21 },
          { date: "2026-11-25", base: "USD", quote: "KES", rate: 129.98 },
        ],
      };
    });

    const res = await mockedRefresh(makeEnv(), {
      fetchImpl: fetchMock as unknown as typeof fetch,
      force: true,
      now: new Date("2026-11-25T10:00:00.000Z"),
    });

    expect(res.skipped).toBe(false);
    expect(res.snapshot?.source).toBe("frankfurter.dev");
    expect(res.snapshot?.rates).toMatchObject({ RWF: 1478.21, KES: 129.98 });
    expect(requestedUrls[0]).toBe(
      "https://api.frankfurter.dev/v2/rates?base=USD",
    );
    expect(firestoreSet).toHaveBeenCalledTimes(2);
    vi.doUnmock("../src/firestore");
    vi.doUnmock("../src/logger");
  });
});
