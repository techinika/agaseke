function normalizeCurrency(value) {
  if (typeof value !== "string") return "";
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

export function planIncomeCurrencyDocs(docs, transactionsByRef) {
  const updates = [];
  const unresolved = [];
  let alreadyStamped = 0;

  for (const doc of docs) {
    if (normalizeCurrency(doc.currency)) {
      alreadyStamped += 1;
      continue;
    }

    const txRef = typeof doc.txRef === "string" ? doc.txRef : "";
    const transaction = txRef ? transactionsByRef.get(txRef) : undefined;
    const currency = normalizeCurrency(transaction?.currency);

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
