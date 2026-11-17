import { describe, expect, it } from "vitest";
import {
  planIncomeCurrencyDocs,
  summarizeIncomeCurrencyUpdates,
} from "../../scripts/money/incomeCurrencyPlan.mjs";

describe("income currency backfill planning", () => {
  it("stamps missing docs from their transaction currency and is idempotent", () => {
    const transactions = new Map<string, { currency?: string }>([
      ["AGS-1", { currency: "USD" }],
      ["AGS-2", { currency: "rwf" }],
    ]);
    const plan = planIncomeCurrencyDocs(
      [
        { id: "income-1", txRef: "AGS-1" },
        { id: "income-2", txRef: "AGS-2" },
        { id: "income-3", txRef: "AGS-1", currency: "USD" },
        { id: "income-4", txRef: "MISSING" },
        { id: "income-5" },
      ],
      transactions,
    );

    expect(plan.updates).toEqual([
      { id: "income-1", txRef: "AGS-1", currency: "USD" },
      { id: "income-2", txRef: "AGS-2", currency: "RWF" },
    ]);
    expect(plan.alreadyStamped).toBe(1);
    expect(plan.unresolved).toEqual(["income-4", "income-5"]);
    expect(summarizeIncomeCurrencyUpdates(plan.updates)).toEqual({ USD: 1, RWF: 1 });
  });

  it("ignores malformed currencies instead of defaulting to RWF", () => {
    const transactions = new Map<string, { currency?: string }>([
      ["AGS-1", { currency: "US" }],
      ["AGS-2", {}],
    ]);
    const plan = planIncomeCurrencyDocs(
      [
        { id: "income-1", txRef: "AGS-1" },
        { id: "income-2", txRef: "AGS-2" },
      ],
      transactions,
    );

    expect(plan.updates).toEqual([]);
    expect(plan.unresolved).toEqual(["income-1", "income-2"]);
  });
});
