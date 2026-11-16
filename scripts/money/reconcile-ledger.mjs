#!/usr/bin/env node

import { getFirestore } from "./firebase-admin.mjs";

const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const HANDLE_ARG = process.argv.find((arg) => arg.startsWith("--handle="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 500;
const ONLY_HANDLE = HANDLE_ARG ? HANDLE_ARG.split("=")[1] : undefined;

function fail(message) {
  console.error(`ledger reconcile: ${message}`);
  process.exit(1);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function main() {
  const db = getFirestore();

  const snapshot = ONLY_HANDLE
    ? await db
        .collection("creatorBalances")
        .doc(ONLY_HANDLE)
        .get()
        .then((doc) => ({ docs: doc.exists ? [doc] : [] }))
    : await db.collection("creatorBalances").limit(LIMIT).get();

  let checked = 0;
  let mismatches = 0;
  let missingLedger = 0;

  for (const doc of snapshot.docs) {
    const handle = doc.id;
    const data = doc.data() || {};
    const available = data.available || {};
    const lifetimeEarned = data.lifetimeEarned || {};
    const pendingWithdrawals = data.pendingWithdrawals || {};
    const lifetimeWithdrawn = data.lifetimeWithdrawn || {};

    const entries = await db
      .collection("ledgerEntries")
      .where("creatorHandle", "==", handle)
      .get();

    if (entries.empty) {
      missingLedger += 1;
      console.log(`${handle}: no ledger entries`);
      continue;
    }

    const ledgerAvailable = {};
    const ledgerEarned = {};
    const ledgerPending = {};
    const ledgerWithdrawn = {};
    for (const entryDoc of entries.docs) {
      const entry = entryDoc.data() || {};
      const currency = entry.currency;
      const amount = toNumber(entry.amountMinor);
      if (!currency) continue;

      if (entry.account === "creator_available") {
        ledgerAvailable[currency] = (ledgerAvailable[currency] || 0) + amount;
      }
      if (entry.account === "creator_pending") {
        ledgerPending[currency] = (ledgerPending[currency] || 0) + amount;
      }
      if (
        amount > 0 &&
        (entry.type === "payment_credit" ||
          entry.type === "referral_credit" ||
          (entry.type === "opening_balance" && entry.account === "creator_available"))
      ) {
        ledgerEarned[currency] = (ledgerEarned[currency] || 0) + amount;
      }
      if (entry.type === "withdrawal_settled" && entry.account === "creator_pending") {
        ledgerWithdrawn[currency] = (ledgerWithdrawn[currency] || 0) - amount;
      }
    }

    const currencies = new Set([
      ...Object.keys(available),
      ...Object.keys(lifetimeEarned),
      ...Object.keys(pendingWithdrawals),
      ...Object.keys(lifetimeWithdrawn),
      ...Object.keys(ledgerAvailable),
      ...Object.keys(ledgerEarned),
      ...Object.keys(ledgerPending),
      ...Object.keys(ledgerWithdrawn),
    ]);

    checked += 1;
    let handleMismatch = false;
    for (const currency of currencies) {
      const expectedAvailable = toNumber(available[currency]);
      const actualAvailable = toNumber(ledgerAvailable[currency]);
      const expectedEarned = toNumber(lifetimeEarned[currency]);
      const actualEarned = toNumber(ledgerEarned[currency]);
      const expectedPending = toNumber(pendingWithdrawals[currency]);
      const actualPending = toNumber(ledgerPending[currency]);
      const expectedWithdrawn = toNumber(lifetimeWithdrawn[currency]);
      const actualWithdrawn = toNumber(ledgerWithdrawn[currency]);

      if (
        expectedAvailable !== actualAvailable ||
        expectedEarned !== actualEarned ||
        expectedPending !== actualPending ||
        expectedWithdrawn !== actualWithdrawn
      ) {
        handleMismatch = true;
        console.log(
          `${handle} ${currency}: available ${expectedAvailable} != ${actualAvailable}; lifetimeEarned ${expectedEarned} != ${actualEarned}; pendingWithdrawals ${expectedPending} != ${actualPending}; lifetimeWithdrawn ${expectedWithdrawn} != ${actualWithdrawn}`,
        );
      }
    }

    if (handleMismatch) mismatches += 1;
  }

  console.log("Ledger reconciliation");
  console.log(`  balances scanned: ${snapshot.docs.length}`);
  console.log(`  balances checked: ${checked}`);
  console.log(`  mismatched creators: ${mismatches}`);
  console.log(`  missing ledger entries: ${missingLedger}`);

  if (mismatches > 0 || missingLedger > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
