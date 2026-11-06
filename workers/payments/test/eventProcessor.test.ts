import { describe, expect, it } from "vitest";
import {
  processPaymentEvent,
  type PaymentEventStore,
} from "../src/services/eventProcessor";

class MemoryStore implements PaymentEventStore {
  events = new Set<string>();
  credits = new Set<string>();
  outboxes = new Map<string, Record<string, unknown>>();
  dispatchMarks: Array<{ paymentRef: string; status: string }> = [];
  state = "pending";
  dispatches = 0;
  conflictNext = false;

  async recordEventOnce(eventId: string): Promise<boolean> {
    if (this.events.has(eventId)) return false;
    this.events.add(eventId);
    return true;
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.events.delete(eventId);
  }

  async commitSuccess(args: {
    fields: Record<string, unknown>;
    paymentRef: string;
    outboxFields?: Record<string, unknown>;
  }) {
    if (this.conflictNext) {
      this.conflictNext = false;
      return { ok: false, alreadyCredited: false, conflict: true };
    }
    this.state = "successful";
    if (this.credits.has(args.paymentRef)) {
      return { ok: true, alreadyCredited: true, conflict: false };
    }
    this.credits.add(args.paymentRef);
    if (args.outboxFields) {
      this.outboxes.set(args.paymentRef, { status: "pending", ...args.outboxFields });
    }
    return { ok: true, alreadyCredited: false, conflict: false };
  }

  async markDispatch(args: { paymentRef: string; status: "delivered" | "failed"; error?: string }) {
    this.dispatchMarks.push({ paymentRef: args.paymentRef, status: args.status });
    const box = this.outboxes.get(args.paymentRef);
    if (box) box.status = args.status;
  }

  async updateState(args: { fields: Record<string, unknown> }) {
    if (this.conflictNext) {
      this.conflictNext = false;
      return { ok: false, conflict: true };
    }
    this.state = String(args.fields.status);
    return { ok: true, conflict: false };
  }
}

function event(
  overrides: Partial<Parameters<typeof processPaymentEvent>[1]> = {},
) {
  return {
    eventId: "paypack:ref-1:successful",
    docId: "ref-1",
    txData: { ref: "ref-1", status: "pending", amount: 1000 },
    nextState: "successful" as const,
    paymentRef: "ref-1",
    provider: "paypack",
    ...overrides,
  };
}

describe("payment event processor", () => {
  it("credits once and dispatches once", async () => {
    const store = new MemoryStore();
    const first = await processPaymentEvent(
      store,
      event({ dispatch: async () => { store.dispatches += 1; } }),
    );

    expect(first).toMatchObject({
      applied: true,
      credited: true,
      duplicate: false,
      state: "successful",
    });
    expect(store.dispatches).toBe(1);

    const duplicate = await processPaymentEvent(
      store,
      event({ dispatch: async () => { store.dispatches += 1; } }),
    );

    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.credited).toBe(false);
    expect(store.dispatches).toBe(1);
  });

  it("does not re-credit when the marker already exists", async () => {
    const store = new MemoryStore();
    store.credits.add("ref-1");

    const result = await processPaymentEvent(
      store,
      event({ eventId: "paypack:ref-1:successful:2" }),
    );

    expect(result.applied).toBe(true);
    expect(result.credited).toBe(false);
  });

  it("ignores transitions from a terminal state", async () => {
    const store = new MemoryStore();
    store.state = "successful";

    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:failed",
        txData: { ref: "ref-1", status: "successful" },
        nextState: "failed",
      }),
    );

    expect(result.applied).toBe(false);
    expect(result.state).toBe("successful");
  });

  it("applies a pending to failed transition", async () => {
    const store = new MemoryStore();
    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:failed",
        nextState: "failed",
      }),
    );

    expect(result.applied).toBe(true);
    expect(result.state).toBe("failed");
    expect(store.state).toBe("failed");
  });

  it("ignores backward transitions", async () => {
    const store = new MemoryStore();
    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:pending",
        txData: { ref: "ref-1", status: "processing" },
        nextState: "pending",
      }),
    );

    expect(result.applied).toBe(false);
  });

  it("ignores unknown provider statuses without recording them", async () => {
    const store = new MemoryStore();
    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:what",
        nextState: "unknown",
      }),
    );

    expect(result.applied).toBe(false);
    expect(store.events.size).toBe(0);
  });

  it("keeps a pending event non-terminal", async () => {
    const store = new MemoryStore();
    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:pending",
        txData: { ref: "ref-1", status: "initiated" },
        nextState: "pending",
      }),
    );

    expect(result.applied).toBe(true);
    expect(result.state).toBe("pending");
    expect(store.state).toBe("pending");
  });

  it("does not fail a payment on a pending event", async () => {
    const store = new MemoryStore();
    await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:processing",
        txData: { ref: "ref-1", status: "pending" },
        nextState: "processing",
      }),
    );

    const pending = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:pending-2",
        txData: { ref: "ref-1", status: "processing" },
        nextState: "pending",
      }),
    );

    expect(pending.applied).toBe(false);
    expect(pending.state).toBe("processing");
    expect(store.state).toBe("processing");
  });

  it("does not overwrite a terminal failure with a late success", async () => {
    const store = new MemoryStore();
    store.state = "failed";

    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:successful-late",
        txData: { ref: "ref-1", status: "failed" },
        nextState: "successful",
      }),
    );

    expect(result.applied).toBe(false);
    expect(result.state).toBe("failed");
  });

  it("releases the event marker when the compare-and-swap conflicts", async () => {
    const store = new MemoryStore();
    store.conflictNext = true;

    const result = await processPaymentEvent(
      store,
      event({ dispatch: async () => { store.dispatches += 1; } }),
    );

    expect(result.applied).toBe(false);
    expect(result.credited).toBe(false);
    expect(store.dispatches).toBe(0);
    expect(store.events.size).toBe(0);

    const retried = await processPaymentEvent(
      store,
      event({ dispatch: async () => { store.dispatches += 1; } }),
    );

    expect(retried.applied).toBe(true);
    expect(retried.credited).toBe(true);
    expect(store.dispatches).toBe(1);
  });

  it("releases the event marker when a non-success write conflicts", async () => {
    const store = new MemoryStore();
    store.conflictNext = true;

    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-1:failed",
        nextState: "failed",
      }),
    );

    expect(result.applied).toBe(false);
    expect(store.events.size).toBe(0);
  });
});


  it("records a durable outbox and marks dispatch delivered (AGA-PAY-004)", async () => {
    const store = new MemoryStore();
    const result = await processPaymentEvent(
      store,
      event({
        outboxFields: { txType: "support", totalAmount: 1000 },
        dispatch: async () => { store.dispatches += 1; return true; },
      }),
    );

    expect(result.credited).toBe(true);
    expect(store.outboxes.get("ref-1")?.status).toBe("delivered");
    expect(store.dispatchMarks).toEqual([{ paymentRef: "ref-1", status: "delivered" }]);
  });

  it("keeps the verified credit when dispatch fails and records the outbox for retry (AGA-PAY-004)", async () => {
    const store = new MemoryStore();
    const result = await processPaymentEvent(
      store,
      event({
        eventId: "paypack:ref-fail:successful",
        paymentRef: "ref-fail",
        outboxFields: { txType: "store", totalAmount: 1000 },
        dispatch: async () => { throw new Error("domain worker down"); },
      }),
    );

    expect(result.applied).toBe(true);
    expect(result.credited).toBe(true);
    expect(result.state).toBe("successful");
    expect(store.state).toBe("successful");
    expect(store.credits.has("ref-fail")).toBe(true);
    expect(store.outboxes.get("ref-fail")?.status).toBe("failed");
    expect(store.dispatchMarks).toEqual([{ paymentRef: "ref-fail", status: "failed" }]);
  });
