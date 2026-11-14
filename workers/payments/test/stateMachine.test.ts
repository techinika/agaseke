import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  isTerminalState,
  normalizePaymentState,
} from "../src/services/stateMachine";

describe("payment state machine", () => {
  it("normalises legacy statuses", () => {
    expect(normalizePaymentState("success")).toBe("successful");
    expect(normalizePaymentState("COMPLETED")).toBe("successful");
    expect(normalizePaymentState("paid")).toBe("successful");
    expect(normalizePaymentState("cancelled")).toBe("failed");
    expect(normalizePaymentState("reversed")).toBe("failed");
    expect(normalizePaymentState("nonsense")).toBe("unknown");
    expect(normalizePaymentState(undefined)).toBe("unknown");
  });

  it("only allows forward transitions", () => {
    expect(canTransition("pending", "processing")).toBe(true);
    expect(canTransition("pending", "successful")).toBe(true);
    expect(canTransition("pending", "failed")).toBe(true);
    expect(canTransition("processing", "pending")).toBe(false);
    expect(canTransition("successful", "failed")).toBe(false);
    expect(canTransition("pending", "pending")).toBe(false);
    expect(canTransition("unknown", "pending")).toBe(false);
  });

  it("marks terminal states and exposes transitions", () => {
    expect(isTerminalState("successful")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
    expect(isTerminalState("expired")).toBe(true);
    expect(isTerminalState("pending")).toBe(false);
    expect(allowedTransitions("initiated")).toContain("pending");
    expect(allowedTransitions("successful")).toEqual([]);
  });

  it("throws on illegal transitions", () => {
    expect(() => assertTransition("successful", "failed")).toThrow(
      /Illegal payment state transition/,
    );
  });

  it("enforces the full transition matrix", () => {
    const states = [
      "initiated",
      "pending",
      "processing",
      "successful",
      "failed",
      "expired",
    ] as const;
    const allowed = new Set([
      "initiated:pending",
      "initiated:processing",
      "initiated:successful",
      "initiated:failed",
      "initiated:expired",
      "pending:processing",
      "pending:successful",
      "pending:failed",
      "pending:expired",
      "processing:successful",
      "processing:failed",
      "processing:expired",
    ]);

    for (const from of states) {
      for (const to of states) {
        expect(canTransition(from, to)).toBe(allowed.has(`${from}:${to}`));
      }
    }
  });

  it("never overwrites a terminal state with a late event", () => {
    const terminal = ["successful", "failed", "expired"] as const;
    for (const from of terminal) {
      expect(isTerminalState(from)).toBe(true);
      expect(allowedTransitions(from)).toEqual([]);
      for (const to of [
        "pending",
        "processing",
        "successful",
        "failed",
        "expired",
      ] as const) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });
});
