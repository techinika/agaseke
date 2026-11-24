export const PRE_MULTI_CURRENCY_CUTOFF_MS = Date.parse("2026-12-01T00:00:00.000Z");

function normalizeCurrency(value) {
  if (typeof value !== "string") return "";
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function parseTsMs(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      const ms = value.toMillis();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value.toDate === "function") {
      const d = value.toDate();
      if (d instanceof Date && Number.isFinite(d.getTime())) return d.getTime();
    }
    if (typeof value.seconds === "number") return value.seconds * 1000;
    if (typeof value._seconds === "number") return value._seconds * 1000;
  }
  return null;
}

function recordTsMs(doc) {
  if (!doc || typeof doc !== "object") return null;
  return (
    parseTsMs(doc.createdAt) ??
    parseTsMs(doc.successfulAt) ??
    parseTsMs(doc.appliedAt) ??
    parseTsMs(doc.updatedAt) ??
    null
  );
}

export function planIncomeCurrencyDocs(docs, transactionsByRef, options = {}) {
  const updates = [];
  const unresolved = [];
  let alreadyStamped = 0;
  const preCutoffRwfFallback = Boolean(options.preCutoffRwfFallback);
  const cutoffMs =
    typeof options.cutoffMs === "number" ? options.cutoffMs : PRE_MULTI_CURRENCY_CUTOFF_MS;

  for (const doc of docs) {
    // Existing explicit currency (e.g. USD) must NEVER be overwritten.
    if (normalizeCurrency(doc.currency)) {
      alreadyStamped += 1;
      continue;
    }

    const txRef = typeof doc.txRef === "string" ? doc.txRef : "";
    const transaction = txRef ? transactionsByRef.get(txRef) : undefined;
    let currency = normalizeCurrency(transaction?.currency);

    if (!currency && preCutoffRwfFallback) {
      const tsMs = recordTsMs(doc) ?? recordTsMs(transaction);
      if (tsMs === null || tsMs < cutoffMs) {
        currency = "RWF";
      }
    }

    if (!currency) {
      unresolved.push(doc.id);
      continue;
    }

    updates.push({ id: doc.id, txRef, currency });
  }

  return { updates, unresolved, alreadyStamped };
}

export function summarizeIncomeCurrencyUpdates(updates) {
  const totals = {};
  for (const update of updates) {
    totals[update.currency] = (totals[update.currency] || 0) + 1;
  }
  return totals;
}
