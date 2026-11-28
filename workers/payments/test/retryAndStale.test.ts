import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

function makeEnv(): Env {
  return {
    FIREBASE_API_KEY: "key",
    FIREBASE_PROJECT_ID: "proj",
    FIREBASE_CLIENT_EMAIL: "svc@proj.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "pk",
    PAYPACK_CLIENT_ID: "pp-id",
    PAYPACK_CLIENT_SECRET: "pp-sec",
    PESAPAL_CONSUMER_KEY: "ck",
    PESAPAL_CONSUMER_SECRET: "cs",
    PESAPAL_URL: "https://pesapal.example.com",
    PESAPAL_IPN_ID: "ipn",
    APP_URL: "https://agaseke.me",
    SUPPORT_WORKER_URL: "https://support.api.agaseke.me",
    STORE_WORKER_URL: "https://store.api.agaseke.me",
    BOOKINGS_WORKER_URL: "https://bookings.api.agaseke.me",
    COMMUNITY_WORKER_URL: "https://community.api.agaseke.me",
    COMMS_WORKER_URL: "https://comms.api.agaseke.me",
    INTERNAL_AUTH_SECRET: "secret",
    PAYPACK_WEBHOOK_SECRET: "whsec",
  };
}

describe("payments worker retry ownership and 15-minute stalled expiration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("allows cancelling when supporterId is 'anonymous' and initiatedBy matches uid, or via email fallback", async () => {
    const sets: Array<{ path: string; fields: Record<string, unknown> }> = [];

    const txByRef: Record<string, Record<string, unknown>> = {
      "AGS-MOMO-ANON": {
        ref: { stringValue: "AGS-MOMO-ANON" },
        status: { stringValue: "pending" },
        supporterId: { stringValue: "anonymous" },
        initiatedBy: { stringValue: "uid-owner" },
      },
      "AGS-EMAIL-MATCH": {
        ref: { stringValue: "AGS-EMAIL-MATCH" },
        status: { stringValue: "stalled" },
        supporterId: { stringValue: "anonymous" },
        initiatedBy: { stringValue: "anonymous" },
        buyerEmail: { stringValue: "Owner@Example.com" },
      },
    };

    vi.doMock("../src/firestore", () => ({
      convertFromFields: (fields: Record<string, Record<string, unknown>>) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if ("stringValue" in v) out[k] = v.stringValue;
        }
        return out;
      },
      convertToFields: (obj: Record<string, unknown>) => obj,
      firestoreQuery: vi.fn(
        async (_env: Env, _col: string, _field: string, val: { stringValue?: string }) => {
          const ref = val.stringValue || "";
          return txByRef[ref]
            ? [{ name: `projects/proj/databases/(default)/documents/transactions/${ref}`, fields: txByRef[ref] }]
            : [];
        },
      ),
      firestoreGet: vi.fn(async () => null),
      firestoreSet: vi.fn(async (_env: Env, path: string, fields: Record<string, unknown>) => {
        sets.push({ path, fields });
        return {};
      }),
    }));

    const { cancelTransaction } = await import("../src/services/retry");
    const env = makeEnv();

    const r1 = await cancelTransaction(env, "uid-owner", "AGS-MOMO-ANON");
    expect(r1).toEqual({ ref: "AGS-MOMO-ANON", status: "cancelled" });

    const r2 = await cancelTransaction(env, "uid-owner", "AGS-EMAIL-MATCH", "owner@example.com");
    expect(r2).toEqual({ ref: "AGS-EMAIL-MATCH", status: "cancelled" });

    await expect(
      cancelTransaction(env, "uid-other", "AGS-MOMO-ANON", "other@example.com"),
    ).rejects.toThrow(/You can only cancel your own transactions/);

    expect(sets).toHaveLength(2);
    expect(sets[0].fields.status).toBe("cancelled");
  });

  it("marks pending transactions >= 15 minutes old as stalled and leaves fresh ones untouched", async () => {
    const updates: Array<{ path: string; fields: Record<string, unknown>; updateTime?: string }> = [];
    const oldIso = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    const freshIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    vi.doMock("../src/firestore", () => ({
      convertFromFields: (fields: Record<string, Record<string, unknown>>) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if ("stringValue" in v) out[k] = v.stringValue;
        }
        return out;
      },
      convertToFields: (obj: Record<string, unknown>) => obj,
      firestoreQuery: vi.fn(async () => [
        {
          name: "projects/proj/databases/(default)/documents/transactions/OLD_TX",
          updateTime: "2026-01-01T00:00:00Z",
          fields: {
            ref: { stringValue: "OLD_TX" },
            status: { stringValue: "pending" },
            createdAt: { stringValue: oldIso },
          },
        },
        {
          name: "projects/proj/databases/(default)/documents/transactions/FRESH_TX",
          updateTime: "2026-01-01T00:00:00Z",
          fields: {
            ref: { stringValue: "FRESH_TX" },
            status: { stringValue: "pending" },
            createdAt: { stringValue: freshIso },
          },
        },
      ]),
      firestoreUpdateWithPrecondition: vi.fn(
        async (_env: Env, path: string, fields: Record<string, unknown>, updateTime?: string) => {
          updates.push({ path, fields, updateTime });
          return { ok: true, status: 200 };
        },
      ),
      firestoreCommit: vi.fn(),
      firestoreCreateIfAbsent: vi.fn(),
      firestoreDeleteIfExists: vi.fn(),
      firestoreDocumentName: vi.fn(),
      firestoreGet: vi.fn(),
      firestoreSet: vi.fn(),
    }));

    const { expireStalePendingTransactions } = await import("../src/services/webhooks");
    const result = await expireStalePendingTransactions(makeEnv(), 50);

    expect(result).toEqual({ checked: 2, stalled: 1 });
    expect(updates).toHaveLength(1);
    expect(updates[0].path).toBe("transactions/OLD_TX");
    expect(updates[0].fields.status).toBe("stalled");
  });
});
