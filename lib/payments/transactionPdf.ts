import { getCurrencyDefinition, type CurrencyCode } from "@/lib/money/registry.generated";
import { resolveHistoricalCurrency } from "@/lib/money/historicalCurrency";
import type { UserTransaction } from "@/lib/paymentsService";

export const BRAND_NAME = "Agaseke";
export const BRAND_WORDMARK = "AGASEKE";
export const BRAND_SUBTITLE = "Agaseke for Creators";
export const BRAND_LOGO_PATH = "/agaseke.png";

export interface SuccessfulTransactionPdfRow {
  ref: string;
  dateFormatted: string;
  dateIso: string;
  recipientName: string;
  creatorHandle: string;
  details: string;
  methodLabel: string;
  amount: number;
  currency: string;
  amountFormatted: string;
}

export interface CurrencyTotalSummary {
  currency: string;
  totalAmount: number;
  count: number;
  formatted: string;
}

export interface SuccessfulTransactionsSummaryData {
  generatedAtIso: string;
  generatedAtFormatted: string;
  supporterLabel: string;
  count: number;
  rows: SuccessfulTransactionPdfRow[];
  totalsByCurrency: CurrencyTotalSummary[];
}

export function isSuccessfulStatus(status: string): boolean {
  const normalized = (status || "").trim().toLowerCase();
  return normalized === "successful" || normalized === "success";
}

function sanitizePdfText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export function formatPdfAmount(amount: number, currency: string): string {
  const safeCurrency = (currency || "RWF").trim().toUpperCase();
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  let decimals = 0;
  try {
    decimals = getCurrencyDefinition(safeCurrency as CurrencyCode).minorUnit;
  } catch {
    decimals = Number.isInteger(safeAmount) ? 0 : 2;
  }
  const formattedNumber = safeAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimals > 0 ? decimals : 0,
    maximumFractionDigits: decimals,
  });
  return `${formattedNumber} ${safeCurrency}`;
}

function formatPdfDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPdfDateTime(d: Date): string {
  if (!Number.isFinite(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}, ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function describeTransaction(tx: UserTransaction): string {
  switch (tx.type) {
    case "store":
      return tx.productName
        ? sanitizePdfText(`Store: ${tx.productName}`)
        : "Store purchase";
    case "community":
      return tx.communityInterval
        ? sanitizePdfText(`Subscription (${tx.communityInterval})`)
        : "Community subscription";
    case "gathering":
      return "Gathering ticket";
    case "booking":
      return "Booking payment";
    case "gift":
      return "Gift support";
    default:
      return "Creator support";
  }
}

export function resolveRecipientCreatorName(
  tx: UserTransaction,
  creatorNames?: Record<string, string>,
): string {
  const handle = sanitizePdfText(tx.creatorId || "");
  const name = sanitizePdfText(
    tx.creatorName || (handle && creatorNames?.[handle]) || "",
  );
  if (name && handle) {
    if (name.toLowerCase() === handle.toLowerCase()) return name;
    return `${name} (@${handle})`;
  }
  if (name) return name;
  if (handle) return `@${handle}`;
  return "Agaseke Creator";
}

export function prepareSuccessfulSummaryData(
  transactions: UserTransaction[],
  options: {
    supporterName?: string;
    supporterEmail?: string;
    creatorNames?: Record<string, string>;
    generatedAt?: Date;
  } = {},
): SuccessfulTransactionsSummaryData {
  const generatedAt = options.generatedAt ?? new Date();
  const successful = transactions
    .filter((tx) => isSuccessfulStatus(tx.status))
    .slice()
    .sort((a, b) => {
      const aMs = Date.parse(a.successfulAt || a.createdAt || "") || 0;
      const bMs = Date.parse(b.successfulAt || b.createdAt || "") || 0;
      return bMs - aMs;
    });

  if (successful.length === 0) {
    throw new Error("No successful transactions found to export");
  }

  const currencyAggregates = new Map<string, { totalAmount: number; count: number }>();

  const rows: SuccessfulTransactionPdfRow[] = successful.map((tx) => {
    const dateIso = tx.successfulAt || tx.createdAt || "";
    const currency = resolveHistoricalCurrency(
      tx as unknown as Record<string, unknown>,
    );
    const amount = Number.isFinite(tx.amount) ? tx.amount : 0;
    const prev = currencyAggregates.get(currency) ?? { totalAmount: 0, count: 0 };
    currencyAggregates.set(currency, {
      totalAmount: prev.totalAmount + amount,
      count: prev.count + 1,
    });

    const isCard =
      tx.paymentMethod === "card" ||
      (tx.ref || "").startsWith("AGS-CARD-") ||
      Boolean(tx.redirectUrl);

    return {
      ref: sanitizePdfText(tx.ref || "—"),
      dateFormatted: formatPdfDate(dateIso),
      dateIso,
      recipientName: resolveRecipientCreatorName(tx, options.creatorNames),
      creatorHandle: sanitizePdfText(tx.creatorId || ""),
      details: describeTransaction(tx),
      methodLabel: isCard ? "Card" : tx.paymentMethod ? "MoMo" : "—",
      amount,
      currency,
      amountFormatted: formatPdfAmount(amount, currency),
    };
  });

  const totalsByCurrency: CurrencyTotalSummary[] = Array.from(
    currencyAggregates.entries(),
  ).map(([currency, agg]) => ({
    currency,
    totalAmount: agg.totalAmount,
    count: agg.count,
    formatted: formatPdfAmount(agg.totalAmount, currency),
  }));

  const supporterName = sanitizePdfText(options.supporterName || "");
  const supporterEmail = sanitizePdfText(options.supporterEmail || "");
  const supporterLabel =
    supporterName && supporterEmail
      ? `${supporterName} (${supporterEmail})`
      : supporterName || supporterEmail || "Agaseke Supporter";

  return {
    generatedAtIso: generatedAt.toISOString(),
    generatedAtFormatted: formatPdfDateTime(generatedAt),
    supporterLabel,
    count: rows.length,
    rows,
    totalsByCurrency,
  };
}

export async function loadBrandLogoDataUrl(
  logoPath: string = BRAND_LOGO_PATH,
): Promise<string | null> {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  try {
    const res = await fetch(logoPath, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildSuccessfulTransactionsPdf(
  summary: SuccessfulTransactionsSummaryData,
  options: {
    logoDataUrl?: string | null;
    title?: string;
  } = {},
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 18;

  const brandRed: [number, number, number] = [196, 0, 0];
  const inkDark: [number, number, number] = [23, 23, 23];
  const inkMuted: [number, number, number] = [95, 111, 132];
  const surfaceRaised: [number, number, number] = [248, 250, 252];
  const borderLine: [number, number, number] = [226, 232, 240];
  const successGreen: [number, number, number] = [20, 108, 67];

  const documentTitle =
    options.title ||
    (summary.count === 1
      ? "Successful Transaction Receipt"
      : "Successful Transactions Summary");

  const drawHeader = (isContinuation = false) => {
    let cursorY = 14;
    if (options.logoDataUrl) {
      try {
        doc.addImage(options.logoDataUrl, "PNG", marginX, cursorY, 11, 11);
      } catch {
        doc.setFillColor(...brandRed);
        doc.roundedRect(marginX, cursorY, 11, 11, 2.5, 2.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("a", marginX + 3.9, cursorY + 7.7);
      }
    } else {
      doc.setFillColor(...brandRed);
      doc.roundedRect(marginX, cursorY, 11, 11, 2.5, 2.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("a", marginX + 3.9, cursorY + 7.7);
    }

    doc.setTextColor(...inkDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(BRAND_WORDMARK, marginX + 14, cursorY + 5);

    doc.setTextColor(...inkMuted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(BRAND_SUBTITLE, marginX + 14, cursorY + 9.5);

    doc.setTextColor(...inkDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(
      isContinuation ? `${documentTitle} (cont.)` : documentTitle,
      pageWidth - marginX,
      cursorY + 5,
      { align: "right" },
    );

    doc.setTextColor(...inkMuted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Generated ${summary.generatedAtFormatted}`,
      pageWidth - marginX,
      cursorY + 9.5,
      { align: "right" },
    );

    cursorY += 14;
    doc.setDrawColor(...brandRed);
    doc.setLineWidth(0.7);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);

    return cursorY + 6;
  };

  let y = drawHeader(false);

  // Summary card
  const totalsText = summary.totalsByCurrency.map((t) => t.formatted).join("  |  ");
  const totalsLines = doc.splitTextToSize(totalsText || "—", contentWidth / 2 - 8);
  const summaryHeight = Math.max(22, 13 + totalsLines.length * 4.5);

  doc.setFillColor(...surfaceRaised);
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentWidth, summaryHeight, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...inkMuted);
  doc.text("ACCOUNT", marginX + 4, y + 5.5);
  doc.text("SUCCESSFUL PAYMENTS", marginX + 4, y + 14);
  doc.text("TOTAL AMOUNT", marginX + contentWidth / 2 + 4, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...inkDark);
  const supporterLines = doc.splitTextToSize(summary.supporterLabel, contentWidth / 2 - 8);
  doc.text(supporterLines[0] || "Agaseke Supporter", marginX + 4, y + 9.8);
  doc.text(String(summary.count), marginX + 4, y + 18.5);

  doc.setTextColor(...successGreen);
  doc.setFontSize(10.5);
  doc.text(totalsLines, marginX + contentWidth / 2 + 4, y + 10.5);

  y += summaryHeight + 7;

  // Table layout (total = 182mm)
  const cols = {
    dateX: marginX + 3,
    creatorX: marginX + 33,
    detailsX: marginX + 83,
    amountRightX: marginX + 153,
    refX: marginX + 157,
  };

  const drawTableHeader = (topY: number) => {
    doc.setFillColor(...brandRed);
    doc.rect(marginX, topY, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DATE", cols.dateX, topY + 5.3);
    doc.text("RECIPIENT CREATOR", cols.creatorX, topY + 5.3);
    doc.text("PAYMENT DETAILS", cols.detailsX, topY + 5.3);
    doc.text("AMOUNT", cols.amountRightX, topY + 5.3, { align: "right" });
    doc.text("REFERENCE", cols.refX, topY + 5.3);
    return topY + 8;
  };

  y = drawTableHeader(y);

  for (let idx = 0; idx < summary.rows.length; idx++) {
    const row = summary.rows[idx];
    const creatorLines = doc.splitTextToSize(row.recipientName, 47);
    const detailsText =
      row.methodLabel && row.methodLabel !== "—"
        ? `${row.details} (${row.methodLabel})`
        : row.details;
    const detailsLines = doc.splitTextToSize(detailsText, 41);
    const shortRef = row.ref.length > 16 ? `${row.ref.slice(0, 14)}..` : row.ref;
    const lineCount = Math.max(creatorLines.length, detailsLines.length, 1);
    const rowHeight = Math.max(9.5, 4.5 + lineCount * 4.2);

    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = drawHeader(true);
      y = drawTableHeader(y);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(...surfaceRaised);
      doc.rect(marginX, y, contentWidth, rowHeight, "F");
    }

    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.2);
    doc.line(marginX, y + rowHeight, marginX + contentWidth, y + rowHeight);

    const textY = y + 5.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...inkDark);
    doc.text(row.dateFormatted, cols.dateX, textY);

    doc.setFont("helvetica", "bold");
    doc.text(creatorLines, cols.creatorX, textY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...inkMuted);
    doc.text(detailsLines, cols.detailsX, textY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...inkDark);
    doc.text(row.amountFormatted, cols.amountRightX, textY, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...inkMuted);
    doc.text(shortRef, cols.refX, textY);

    y += rowHeight;
  }

  // Page numbers footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...inkMuted);
    doc.text(
      `${BRAND_WORDMARK} · ${BRAND_SUBTITLE} · Verified Successful Payments`,
      marginX,
      pageHeight - 8.5,
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 8.5, {
      align: "right",
    });
  }

  return doc.output("blob");
}

function buildSafeFilename(prefix: string): string {
  const safe = prefix.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-");
  return `${safe}.pdf`;
}

export async function downloadSuccessfulTransactionsPdf(
  transactions: UserTransaction[],
  options: {
    supporterName?: string;
    supporterEmail?: string;
    creatorNames?: Record<string, string>;
    title?: string;
    filenamePrefix?: string;
  } = {},
): Promise<{ count: number; filename: string }> {
  const summary = prepareSuccessfulSummaryData(transactions, options);
  const logoDataUrl = await loadBrandLogoDataUrl(BRAND_LOGO_PATH);
  const pdfBlob = await buildSuccessfulTransactionsPdf(summary, {
    logoDataUrl,
    title: options.title,
  });

  const dateStamp = summary.generatedAtIso.slice(0, 10);
  const filename = buildSafeFilename(
    options.filenamePrefix || `agaseke-successful-transactions-${dateStamp}`,
  );

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const objectUrl = URL.createObjectURL(pdfBlob);
    try {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }

  return { count: summary.count, filename };
}
