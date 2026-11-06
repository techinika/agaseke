import {
  canTransition,
  isTerminalState,
  normalizePaymentState,
  type PaymentState,
} from "./stateMachine";

/**
 * Applies a verified provider event through the forward-only state machine.
 * The store abstraction lets the same logic run against Firestore in production
 * and an in-memory fake in tests (AGA-PAY-003 / A5, A6).
 */

export interface SuccessCommitResult {
  ok: boolean;
  alreadyCredited: boolean;
  conflict: boolean;
}

export interface StateUpdateResult {
  ok: boolean;
  conflict: boolean;
}

export interface PaymentEventStore {
  /** Returns true only when this event ID has not been seen before. */
  recordEventOnce(
    eventId: string,
    data: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * Remove a previously recorded event so a lost compare-and-swap can be
   * retried by the provider instead of being swallowed as a duplicate.
   */
  deleteEvent(eventId: string): Promise<void>;

  /**
   * Atomically set the successful state, create the credit marker, and (when
   * this is the first credit) create a durable dispatch outbox record. The
   * outbox lets a failed domain callback be retried without re-crediting
   * (AGA-PAY-004).
   */
  commitSuccess(args: {
    docId: string;
    updateTime?: string;
    fields: Record<string, unknown>;
    paymentRef: string;
    outboxFields?: Record<string, unknown>;
  }): Promise<SuccessCommitResult>;

  /** Update a non-terminal state with an optional updateTime precondition. */
  updateState(args: {
    docId: string;
    updateTime?: string;
    fields: Record<string, unknown>;
  }): Promise<StateUpdateResult>;

  /** Mark a dispatch outbox record delivered/failed (best-effort). */
  markDispatch?(args: {
    paymentRef: string;
    status: "delivered" | "failed";
    error?: string;
  }): Promise<void>;
}

export interface PaymentEventInput {
  eventId: string;
  docId: string;
  updateTime?: string;
  txData: Record<string, unknown>;
  nextState: PaymentState | "unknown";
  extraFields?: Record<string, unknown>;
  paymentRef: string;
  provider: string;
  providerStatus?: string;
  /** Payload persisted to the durable outbox when the success is first credited. */
  outboxFields?: Record<string, unknown>;
  /** Returns true when the domain dispatch completed; false when it failed but was recorded for retry. */
  dispatch?: () => Promise<boolean | void>;
}

export interface PaymentEventResult {
  received: true;
  duplicate: boolean;
  applied: boolean;
  credited: boolean;
  state: PaymentState | "unknown";
}

export async function processPaymentEvent(
  store: PaymentEventStore,
  event: PaymentEventInput,
): Promise<PaymentEventResult> {
  const normalized = normalizePaymentState(event.txData.status);
  const current: PaymentState = normalized === "unknown" ? "initiated" : normalized;

  if (event.nextState === "unknown") {
    return {
      received: true,
      duplicate: false,
      applied: false,
      credited: false,
      state: current,
    };
  }

  const nextState: PaymentState = event.nextState;

  const firstSeen = await store.recordEventOnce(event.eventId, {
    provider: event.provider,
    providerStatus: event.providerStatus ?? nextState,
    paymentRef: event.paymentRef,
    docId: event.docId,
    createdAt: new Date().toISOString(),
  });

  if (!firstSeen) {
    return {
      received: true,
      duplicate: true,
      applied: false,
      credited: false,
      state: current,
    };
  }

  if (isTerminalState(current)) {
    return {
      received: true,
      duplicate: false,
      applied: false,
      credited: false,
      state: current,
    };
  }

  if (!canTransition(current, nextState)) {
    // Same-state updates (e.g. pending -> pending) and backward moves are no-ops.
    return {
      received: true,
      duplicate: false,
      applied: false,
      credited: false,
      state: current,
    };
  }

  const now = new Date().toISOString();
  const fields: Record<string, unknown> = {
    ...event.txData,
    ...event.extraFields,
    status: nextState,
    updatedAt: now,
  };

  if (nextState === "successful") {
    fields.successfulAt = now;
    const result = await store.commitSuccess({
      docId: event.docId,
      updateTime: event.updateTime,
      fields,
      paymentRef: event.paymentRef,
      outboxFields: event.outboxFields,
    });

    if (result.conflict) {
      await store.deleteEvent(event.eventId);
      return {
        received: true,
        duplicate: false,
        applied: false,
        credited: false,
        state: current,
      };
    }

    if (!result.ok) {
      await store.deleteEvent(event.eventId);
      throw new Error(
        `Failed to commit successful payment ${event.paymentRef}`,
      );
    }

    if (result.alreadyCredited) {
      return {
        received: true,
        duplicate: false,
        applied: true,
        credited: false,
        state: "successful",
      };
    }

    let dispatchOk = true;
    if (event.dispatch) {
      try {
        const r = await event.dispatch();
        dispatchOk = r !== false;
      } catch {
        dispatchOk = false;
      }
      if (store.markDispatch) {
        await store.markDispatch({
          paymentRef: event.paymentRef,
          status: dispatchOk ? "delivered" : "failed",
        }).catch(() => {});
      }
    }

    return {
      received: true,
      duplicate: false,
      applied: true,
      credited: true,
      state: "successful",
    };
  }

  const result = await store.updateState({
    docId: event.docId,
    updateTime: event.updateTime,
    fields,
  });

  if (result.conflict) {
    await store.deleteEvent(event.eventId);
  }

  return {
    received: true,
    duplicate: false,
    applied: result.ok,
    credited: false,
    state: result.ok ? nextState : current,
  };
}
