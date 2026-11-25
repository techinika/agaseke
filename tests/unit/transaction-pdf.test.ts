import { describe, expect, it, vi } from "vitest";
import type { UserTransaction } from "@/lib/paymentsService";
import {
  BRAND_SUBTITLE,
  BRAND_WORDMARK,
  buildSuccessfulTransactionsPdf,
  prepareSuccessfulSummaryData,
} from "@/lib/payments/transactionPdf";

function makeTx(overrides: Partial<UserTransaction> = {}): UserTransaction {
  return {
    ref: "TX-100",
    type: "support",
    status: "successful",
    currency: "RWF",
    sourceCurrency: "",
    sourceAmountMinor: 0,
    fxRate: 0,
    paymentMethod: "momo",
    amount: 5000,
    createdAt: "2026-11-20T10:00:00.000Z",
    successfulAt: "2026-11-20T10:02:00.000Z",
    message: "",
    creatorId: "alice",
    creatorUid: "uid-alice",
    creatorName: "Alice Creator",
    productId: "",
    productName: "",
    quantity: 0,
    selectedSize: "",
    bookingId: "",
    gatheringId: "",
    attendeeName: "",
    communityTierId: "",
    communityInterval: "",
    communitySubscriptionId: "",
    ...overrides,
  };
}

describe("Transaction PDF summary", () => {
  it("filters only successful transactions, resolves creator names, and calculates currency totals", () => {
    const items: UserTransaction[] = [
      makeTx({
        ref: "TX-PENDING",
        status: "pending",
        amount: 99000,
        creatorId: "ignored",
        creatorName: "Ignored",
      }),
      makeTx({
        ref: "TX-FAILED",
        status: "failed",
        amount: 50000,
        creatorId: "ignored2",
        creatorName: "Ignored 2",
      }),
      makeTx({
        ref: "TX-RWF-1",
        status: "successful",
        currency: "RWF",
        amount: 10000,
        creatorId: "alice",
        creatorName: "Alice Creator",
        successfulAt: "2026-11-21T12:00:00.000Z",
      }),
      makeTx({
        ref: "AGS-CARD-USD-1",
        status: "success",
        type: "store",
        productName: "Creator Guide",
        paymentMethod: "card",
        currency: "USD",
        amount: 12.5,
        creatorId: "bob",
        creatorName: "",
        successfulAt: "2026-11-24T09:30:00.000Z",
      }),
      makeTx({
        ref: "TX-RWF-2",
        status: "successful",
        currency: "RWF",
        amount: 5000,
        creatorId: "carol",
        creatorName: "",
        successfulAt: "2026-11-19T08:00:00.000Z",
      }),
    ];

    const summary = prepareSuccessfulSummaryData(items, {
      supporterName: "Jane Supporter",
      supporterEmail: "jane@example.com",
      creatorNames: { bob: "Bob Studio" },
      generatedAt: new Date("2026-11-25T09:00:00.000Z"),
    });

    expect(summary.count).toBe(3);
    expect(summary.supporterLabel).toBe("Jane Supporter (jane@example.com)");
    expect(summary.rows.map((r) => r.ref)).toEqual([
      "AGS-CARD-USD-1",
      "TX-RWF-1",
      "TX-RWF-2",
    ]);
    expect(summary.rows[0].recipientName).toBe("Bob Studio (@bob)");
    expect(summary.rows[0].amountFormatted).toBe("12.50 USD");
    expect(summary.rows[1].recipientName).toBe("Alice Creator (@alice)");
    expect(summary.rows[1].amountFormatted).toBe("10,000 RWF");
    expect(summary.rows[2].recipientName).toBe("@carol");
    expect(summary.totalsByCurrency).toEqual([
      { currency: "USD", totalAmount: 12.5, count: 1, formatted: "12.50 USD" },
      { currency: "RWF", totalAmount: 15000, count: 2, formatted: "15,000 RWF" },
    ]);
  });

  it("throws when there are no successful transactions", () => {
    expect(() =>
      prepareSuccessfulSummaryData([
        makeTx({ status: "pending" }),
        makeTx({ status: "failed" }),
      ]),
    ).toThrow("No successful transactions found to export");
  });

  it("builds a valid multi-page PDF containing brand name, creator name, amount, and date", async () => {
    const manyTxs = Array.from({ length: 32 }, (_, idx) =>
      makeTx({
        ref: `AGS-CARD-${idx + 1}`,
        paymentMethod: "card",
        currency: idx % 2 === 0 ? "RWF" : "USD",
        amount: idx % 2 === 0 ? 7500 : 15,
        creatorId: `creator${idx + 1}`,
        creatorName: `Creator Name ${idx + 1}`,
        successfulAt: `2026-11-${String((idx % 20) + 1).padStart(2, "0")}T10:00:00.000Z`,
      }),
    );

    const summary = prepareSuccessfulSummaryData(manyTxs, {
      supporterName: "Sam Supporter",
      generatedAt: new Date("2026-11-25T10:00:00.000Z"),
    });

    const blob = await buildSuccessfulTransactionsPdf(summary, {
      logoDataUrl: null,
    });

    expect(blob.type).toBe("application/pdf");
    const rawPdf = new TextDecoder("latin1").decode(await blob.arrayBuffer());
    expect(rawPdf.startsWith("%PDF-")).toBe(true);
    expect(rawPdf).toContain(BRAND_WORDMARK);
    expect(rawPdf).toContain(BRAND_SUBTITLE);
    expect(rawPdf).toContain("Successful Transactions Summary");
    expect(rawPdf).toContain("Creator Name 1");
    expect(rawPdf).toContain("7,500 RWF");
    expect(rawPdf).toContain("Nov 1, 2026");
    expect(rawPdf).toContain("Page 2 of 2");
  });

  it("triggers browser PDF download on downloadSuccessfulTransactionsPdf", async () => {
    vi.resetModules();
    const clickMock = vi.fn();
    const createObjectUrl = vi.fn(() => "blob:mock-pdf");
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));

    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = createObjectUrl;
    URL.revokeObjectURL = revokeObjectUrl;

    const createElementSpy = vi.spyOn(document, "createElement");
    createElementSpy.mockImplementation(((tag: string) => {
      const el = Document.prototype.createElement.call(document, tag);
      if (tag === "a") {
        el.click = clickMock;
      }
      return el;
    }) as typeof document.createElement);

    const { downloadSuccessfulTransactionsPdf } = await import(
      "@/lib/payments/transactionPdf"
    );
    const result = await downloadSuccessfulTransactionsPdf([makeTx()]);

    expect(result.count).toBe(1);
    expect(result.filename).toMatch(/^agaseke-successful-transactions-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    createElementSpy.mockRestore();
  });
});
