import { describe, expect, it } from "vitest";
import { validateWithdrawalRequest, WithdrawalError } from "@/lib/payouts/withdrawals";

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(WithdrawalError);
    expect((error as WithdrawalError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe("withdrawal validation", () => {
  it("accepts exact USD cents and returns minor units", () => {
    const result = validateWithdrawalRequest({
      currency: "usd",
      amount: "12.34",
      pending: 20,
      held: 5,
      threshold: 10,
    });

    expect(result.currency).toBe("USD");
    expect(result.amount.amountMinor).toBe(1234);
    expect(result.amountMajor).toBe(12.34);
    expect(result.pendingMinor).toBe(2000);
    expect(result.heldMinor).toBe(500);
    expect(result.availableMinor).toBe(1500);
    expect(result.thresholdMinor).toBe(1000);
  });

  it("treats held withdrawals as unavailable", () => {
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "RWF",
          amount: "10",
          pending: 100,
          held: 95,
          threshold: 1,
        }),
      "INSUFFICIENT_AVAILABLE_BALANCE",
    );
  });

  it("enforces the configured per-currency threshold", () => {
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "RWF",
          amount: "9999",
          pending: 10000,
          threshold: 10000,
        }),
      "WITHDRAWAL_BELOW_THRESHOLD",
    );
  });

  it("rejects fractional RWF and unsupported currencies", () => {
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "RWF",
          amount: "1000.5",
          pending: 10000,
          threshold: 1,
        }),
      "INVALID_AMOUNT",
    );
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "EUR",
          amount: "10",
          pending: 10000,
          threshold: 1,
        }),
      "UNSUPPORTED_CURRENCY",
    );
  });

  it("rejects zero, missing and malformed balances", () => {
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "RWF",
          amount: 0,
          pending: 10000,
          threshold: 1,
        }),
      "ZERO_WITHDRAWAL",
    );
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "USD",
          amount: "10",
          pending: 20,
          held: 25,
          threshold: 1,
        }),
      "INVALID_BALANCE_STATE",
    );
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "USD",
          amount: "10",
          pending: "12.345",
          threshold: 1,
        }),
      "INVALID_BALANCE",
    );
    expectCode(
      () =>
        validateWithdrawalRequest({
          currency: "RWF",
          amount: "1000",
          pending: 10000,
          threshold: 0,
        }),
      "INVALID_BALANCE",
    );
  });
});
