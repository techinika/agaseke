import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  MoneyError,
  createLedgerTransaction,
  createOpeningBalance,
  createPaymentCredit,
  createWithdrawalHold,
  createWithdrawalRelease,
  createWithdrawalSettlement,
  ledgerAccountBalances,
  ledgerBalance,
  money,
  netLedgerBalance,
  reconcileLedgerBalance,
  type LedgerEntry,
} from "@/lib/money";

const NOW = new Date("2026-11-15T12:00:00.000Z");

function entriesOf(...transactions: Array<{ entries: readonly LedgerEntry[] }>) {
  return transactions.flatMap((transaction) => transaction.entries);
}

describe("worker ledger dual-write copies", () => {
  it("keeps every worker copy identical to the support reference", () => {
    const root = process.cwd();
    const reference = readFileSync(
      join(root, "workers/support/src/money/ledger.ts"),
      "utf8",
    );

    for (const worker of ["store", "bookings", "community", "payments"]) {
      expect(
        readFileSync(join(root, `workers/${worker}/src/money/ledger.ts`), "utf8"),
      ).toBe(reference);
    }
  });
});

describe("ledger transaction foundation", () => {
  it("splits a payment credit into balanced creator, platform and referral postings", () => {
    const transaction = createPaymentCredit({
      idempotencyKey: "payment_tx_1",
      currency: "USD",
      creatorShareMinor: 9000,
      platformShareMinor: 900,
      referralShareMinor: 100,
      creatorUid: "uid_1",
      creatorHandle: "alice",
      paymentRef: "tx_1",
      createdAt: NOW,
    });

    expect(transaction.entries).toHaveLength(4);
    expect(netLedgerBalance(transaction.entries, "USD")).toEqual(money("USD", 0));
    expect(
      ledgerBalance(transaction.entries, {
        account: "creator_available",
        currency: "USD",
        creatorHandle: "alice",
      }),
    ).toEqual(money("USD", 9000));
    expect(
      ledgerBalance(transaction.entries, { account: "platform_income", currency: "USD" }),
    ).toEqual(money("USD", 900));
    expect(
      ledgerBalance(transaction.entries, {
        account: "referral_available",
        currency: "USD",
      }),
    ).toEqual(money("USD", 100));
    expect(
      ledgerBalance(transaction.entries, {
        account: "provider_clearing",
        currency: "USD",
      }),
    ).toEqual(money("USD", -10000));
  });

  it("omits zero-value accounts and uses deterministic, Firestore-safe IDs", () => {
    const input = {
      idempotencyKey: "payment_tx_2",
      currency: "RWF" as const,
      creatorShareMinor: 1000,
      platformShareMinor: 0,
      createdAt: NOW,
    };

    const first = createPaymentCredit(input);
    const second = createPaymentCredit(input);

    expect(first).toEqual(second);
    expect(first.entries.map((entry) => entry.id)).toEqual([
      "payment_tx_2:creator_available",
      "payment_tx_2:provider_clearing",
    ]);
    expect(first.entries.every((entry) => entry.amountMinor !== 0)).toBe(true);
  });

  it("rejects invalid keys, currencies, shares and timestamps", () => {
    const base = {
      idempotencyKey: "payment_tx_3",
      currency: "USD" as const,
      creatorShareMinor: 100,
      platformShareMinor: 0,
      createdAt: NOW,
    };

    expect(() => createPaymentCredit({ ...base, idempotencyKey: "bad/key" })).toThrow(
      MoneyError,
    );
    expect(() => createPaymentCredit({ ...base, idempotencyKey: ".." })).toThrow(
      MoneyError,
    );
    expect(() => createPaymentCredit({ ...base, currency: "ZZZ" as never })).toThrow(
      MoneyError,
    );
    expect(() => createPaymentCredit({ ...base, creatorShareMinor: -1 })).toThrow(
      MoneyError,
    );
    expect(() =>
      createPaymentCredit({
        ...base,
        creatorShareMinor: 0,
        platformShareMinor: 0,
      }),
    ).toThrow(MoneyError);
    expect(() => createPaymentCredit({ ...base, createdAt: "not-a-date" })).toThrow(
      MoneyError,
    );
    expect(() =>
      createPaymentCredit({
        ...base,
        creatorShareMinor: Number.MAX_SAFE_INTEGER,
        platformShareMinor: 1,
      }),
    ).toThrow(MoneyError);
  });

  it("rejects unbalanced and duplicate-account transactions", () => {
    const base = {
      idempotencyKey: "adjustment_1",
      currency: "USD" as const,
      createdAt: NOW,
    };

    expect(() =>
      createLedgerTransaction(base, "adjustment", [
        { account: "creator_available", amountMinor: 100 },
        { account: "provider_clearing", amountMinor: -99 },
      ]),
    ).toThrow(MoneyError);
    expect(() =>
      createLedgerTransaction(base, "adjustment", [
        { account: "creator_available", amountMinor: 100 },
        { account: "creator_available", amountMinor: -100 },
      ]),
    ).toThrow(MoneyError);
    expect(() =>
      createLedgerTransaction(base, "adjustment", [
        { account: "creator_available", amountMinor: 0 },
        { account: "provider_clearing", amountMinor: 0 },
      ]),
    ).toThrow(MoneyError);
  });

  it("records a migration opening balance against opening equity", () => {
    const transaction = createOpeningBalance({
      idempotencyKey: "opening_alice_RWF",
      currency: "RWF",
      amountMinor: 12500,
      creatorUid: "uid_alice",
      creatorHandle: "alice",
      createdAt: NOW,
    });

    expect(netLedgerBalance(transaction.entries, "RWF")).toEqual(money("RWF", 0));
    expect(
      ledgerBalance(transaction.entries, {
        account: "creator_available",
        currency: "RWF",
        creatorHandle: "alice",
      }),
    ).toEqual(money("RWF", 12500));
    expect(
      ledgerBalance(transaction.entries, { account: "opening_equity", currency: "RWF" }),
    ).toEqual(money("RWF", -12500));
  });

  it("moves funds from available to pending on hold and releases them on rejection", () => {
    const credit = createPaymentCredit({
      idempotencyKey: "payment_tx_4",
      currency: "USD",
      creatorShareMinor: 10000,
      platformShareMinor: 0,
      creatorHandle: "alice",
      createdAt: NOW,
    });
    const hold = createWithdrawalHold({
      idempotencyKey: "withdrawal_1:hold",
      currency: "USD",
      amountMinor: 2500,
      creatorHandle: "alice",
      withdrawalId: "withdrawal_1",
      createdAt: NOW,
    });
    const release = createWithdrawalRelease({
      idempotencyKey: "withdrawal_1:release",
      currency: "USD",
      amountMinor: 2500,
      creatorHandle: "alice",
      withdrawalId: "withdrawal_1",
      createdAt: NOW,
    });

    const afterHold = entriesOf(credit, hold);
    expect(
      ledgerBalance(afterHold, {
        account: "creator_available",
        currency: "USD",
        creatorHandle: "alice",
      }),
    ).toEqual(money("USD", 7500));
    expect(
      ledgerBalance(afterHold, {
        account: "creator_pending",
        currency: "USD",
        creatorHandle: "alice",
      }),
    ).toEqual(money("USD", 2500));
    expect(netLedgerBalance(afterHold, "USD")).toEqual(money("USD", 0));

    const afterRelease = entriesOf(credit, hold, release);
    expect(
      ledgerBalance(afterRelease, {
        account: "creator_available",
        currency: "USD",
        creatorHandle: "alice",
      }),
    ).toEqual(money("USD", 10000));
    expect(
      ledgerBalance(afterRelease, {
        account: "creator_pending",
        currency: "USD",
        creatorHandle: "alice",
      }),
    ).toEqual(money("USD", 0));
  });

  it("settles a held withdrawal without changing available again", () => {
    const credit = createPaymentCredit({
      idempotencyKey: "payment_tx_5",
      currency: "USD",
      creatorShareMinor: 10000,
      platformShareMinor: 0,
      createdAt: NOW,
    });
    const hold = createWithdrawalHold({
      idempotencyKey: "withdrawal_2:hold",
      currency: "USD",
      amountMinor: 2500,
      withdrawalId: "withdrawal_2",
      createdAt: NOW,
    });
    const settlement = createWithdrawalSettlement({
      idempotencyKey: "withdrawal_2:settle",
      currency: "USD",
      amountMinor: 2500,
      withdrawalId: "withdrawal_2",
      createdAt: NOW,
    });

    const entries = entriesOf(credit, hold, settlement);
    expect(
      ledgerBalance(entries, { account: "creator_available", currency: "USD" }),
    ).toEqual(money("USD", 7500));
    expect(
      ledgerBalance(entries, { account: "creator_pending", currency: "USD" }),
    ).toEqual(money("USD", 0));
    expect(
      ledgerBalance(entries, { account: "provider_clearing", currency: "USD" }),
    ).toEqual(money("USD", -7500));
  });

  it("groups balances by account and reconciles a projection", () => {
    const credit = createPaymentCredit({
      idempotencyKey: "payment_tx_6",
      currency: "KES",
      creatorShareMinor: 9000,
      platformShareMinor: 900,
      referralShareMinor: 100,
      creatorHandle: "alice",
      createdAt: NOW,
    });

    const balances = ledgerAccountBalances(credit.entries, "KES");
    expect(balances.creator_available).toEqual(money("KES", 9000));
    expect(balances.platform_income).toEqual(money("KES", 900));
    expect(balances.referral_available).toEqual(money("KES", 100));
    expect(balances.creator_pending).toEqual(money("KES", 0));
    expect(balances.opening_equity).toEqual(money("KES", 0));

    const filter = {
      account: "creator_available" as const,
      currency: "KES" as const,
      creatorHandle: "alice",
    };
    expect(reconcileLedgerBalance(money("KES", 9000), credit.entries, filter)).toEqual({
      expected: money("KES", 9000),
      actual: money("KES", 9000),
      difference: money("KES", 0),
      reconciled: true,
    });
    expect(
      reconcileLedgerBalance(money("KES", 8000), credit.entries, filter).reconciled,
    ).toBe(false);
  });

  it("does not mix creators or currencies when computing a balance", () => {
    const alice = createPaymentCredit({
      idempotencyKey: "payment_tx_7",
      currency: "USD",
      creatorShareMinor: 100,
      platformShareMinor: 0,
      creatorHandle: "alice",
      createdAt: NOW,
    });
    const bob = createPaymentCredit({
      idempotencyKey: "payment_tx_8",
      currency: "USD",
      creatorShareMinor: 200,
      platformShareMinor: 0,
      creatorHandle: "bob",
      createdAt: NOW,
    });

    const entries = entriesOf(alice, bob);
    expect(
      ledgerBalance(entries, {
        account: "creator_available",
        currency: "USD",
        creatorHandle: "alice",
      }),
    ).toEqual(money("USD", 100));
    expect(
      ledgerBalance(entries, {
        account: "creator_available",
        currency: "USD",
        creatorHandle: "bob",
      }),
    ).toEqual(money("USD", 200));
  });

  it("conserves every minor unit for arbitrary credit splits", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("RWF" as const, "USD" as const, "KES" as const, "UGX" as const),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (currency, creator, platform, referral) => {
          const total = creator + platform + referral;
          fc.pre(total > 0);

          const transaction = createPaymentCredit({
            idempotencyKey: `payment_${currency}_${total}`,
            currency,
            creatorShareMinor: creator,
            platformShareMinor: platform,
            referralShareMinor: referral,
            createdAt: NOW,
          });

          expect(netLedgerBalance(transaction.entries, currency)).toEqual(
            money(currency, 0),
          );
          expect(
            ledgerBalance(transaction.entries, {
              account: "creator_available",
              currency,
            }),
          ).toEqual(money(currency, creator));
          expect(
            ledgerBalance(transaction.entries, {
              account: "platform_income",
              currency,
            }),
          ).toEqual(money(currency, platform));
          expect(
            ledgerBalance(transaction.entries, {
              account: "referral_available",
              currency,
            }),
          ).toEqual(money(currency, referral));
          expect(
            ledgerBalance(transaction.entries, {
              account: "provider_clearing",
              currency,
            }),
          ).toEqual(money(currency, -total));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("keeps available, pending and clearing consistent across hold/settle/release", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (creator, platform, referral, rawHold, rawSplit) => {
          const total = creator + platform + referral;
          const holdAmount = rawHold % (creator + 1);
          const settleAmount = holdAmount === 0 ? 0 : rawSplit % (holdAmount + 1);
          const releaseAmount = holdAmount - settleAmount;

          const credit = createPaymentCredit({
            idempotencyKey: `payment_prop_${total}`,
            currency: "USD",
            creatorShareMinor: creator,
            platformShareMinor: platform,
            referralShareMinor: referral,
            createdAt: NOW,
          });
          const transactions = [credit];

          if (holdAmount > 0) {
            transactions.push(
              createWithdrawalHold({
                idempotencyKey: `withdrawal_prop_${holdAmount}:hold`,
                currency: "USD",
                amountMinor: holdAmount,
                createdAt: NOW,
              }),
            );
          }
          if (settleAmount > 0) {
            transactions.push(
              createWithdrawalSettlement({
                idempotencyKey: `withdrawal_prop_${holdAmount}:settle`,
                currency: "USD",
                amountMinor: settleAmount,
                createdAt: NOW,
              }),
            );
          }
          if (releaseAmount > 0) {
            transactions.push(
              createWithdrawalRelease({
                idempotencyKey: `withdrawal_prop_${holdAmount}:release`,
                currency: "USD",
                amountMinor: releaseAmount,
                createdAt: NOW,
              }),
            );
          }

          const entries = entriesOf(...transactions);
          expect(netLedgerBalance(entries, "USD")).toEqual(money("USD", 0));
          expect(
            ledgerBalance(entries, {
              account: "creator_available",
              currency: "USD",
            }),
          ).toEqual(money("USD", creator - holdAmount + releaseAmount));
          expect(
            ledgerBalance(entries, {
              account: "creator_pending",
              currency: "USD",
            }),
          ).toEqual(money("USD", 0));
          expect(
            ledgerBalance(entries, {
              account: "provider_clearing",
              currency: "USD",
            }),
          ).toEqual(money("USD", -total + settleAmount));
        },
      ),
      { numRuns: 300 },
    );
  });
});
