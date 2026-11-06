/**
 * Forward-only payment state machine (AGA-PAY-003 / A5).
 *
 * Legacy transaction documents use `success`, `completed`, `cancelled` and
 * `reversed`; those are normalised before any transition decision so old data
 * keeps working.
 */

export type PaymentState =
  | "initiated"
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "expired";

const ALLOWED_TRANSITIONS: Record<PaymentState, readonly PaymentState[]> = {
  initiated: ["pending", "processing", "successful", "failed", "expired"],
  pending: ["processing", "successful", "failed", "expired"],
  processing: ["successful", "failed", "expired"],
  successful: [],
  failed: [],
  expired: [],
};

export function normalizePaymentState(raw: unknown): PaymentState | "unknown" {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  switch (value) {
    case "initiated":
      return "initiated";
    case "pending":
      return "pending";
    case "processing":
      return "processing";
    case "successful":
    case "success":
    case "completed":
    case "paid":
      return "successful";
    case "failed":
    case "failure":
    case "cancelled":
    case "canceled":
    case "reversed":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "unknown";
  }
}

export function isTerminalState(state: PaymentState): boolean {
  return state === "successful" || state === "failed" || state === "expired";
}

export function canTransition(
  from: PaymentState | "unknown",
  to: PaymentState,
): boolean {
  if (from === "unknown") return false;
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: PaymentState | "unknown",
  to: PaymentState,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal payment state transition: ${from} -> ${to}`);
  }
}

export function allowedTransitions(
  from: PaymentState,
): readonly PaymentState[] {
  return ALLOWED_TRANSITIONS[from];
}
