#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "./firebase-admin.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const HANDLE_ARG = process.argv.find((arg) => arg.startsWith("--handle="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 500;
const ONLY_HANDLE = HANDLE_ARG ? HANDLE_ARG.split("=")[1] : undefined;

function fail(message) {
  console.error(`ledger backfill: ${message}`);
  process.exit(1);
}

function finiteAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function minorAmount(value, minorUnit) {
  return Math.round(value * 10 ** minorUnit);
}

function safeId(value) {
  return String(value)
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 180);
}

function entryFields({
  id,
  account,
  currency,
  amountMinor,
  creatorUid,
  creatorHandle,
  now,
}) {
  return {
    idempotencyKey: id,
    paymentRef: null,
    transactionId: null,
    account,
    type: "opening_balance",
    currency,
    amountMinor,
    creatorUid: creatorUid || null,
    creatorHandle,
    source: "migration",
    createdAt: now,
  };
}

async function main() {
  const db = getFirestore();
  const currencies = JSON.parse(
    await readFile(join(ROOT, "shared/money/currencies.json"), "utf8"),
  ).currencies;
  const minorUnits = Object.fromEntries(
    currencies.map((currency) => [currency.code, currency.minorUnit]),
  );

  const snapshot = ONLY_HANDLE
    ? await db
        .collection("creators")
        .doc(ONLY_HANDLE)
        .get()
        .then((doc) => ({ docs: doc.exists ? [doc] : [] }))
    : await db.collection("creators").limit(LIMIT).get();

  const plans = [];
  let skippedExisting = 0;
  let skippedNoBalance = 0;

  for (const doc of snapshot.docs) {
    const handle = doc.id;
    if (!handle || handle.includes("/")) {
      skippedNoBalance += 1;
      continue;
    }

    const data = doc.data() || {};
    const balanceByCurrency = new Map();
    const rwf = finiteAmount(data.pendingPayout);
    if (rwf > 0) balanceByCurrency.set("RWF", rwf);
    for (const [key, value] of Object.entries(data)) {
      const match = key.match(/^pendingPayout([A-Z]{3})$/);
      if (!match) continue;
      const amount = finiteAmount(value);
      if (amount > 0) balanceByCurrency.set(match[1], amount);
    }
    const balances = [...balanceByCurrency.entries()];

    if (balances.length === 0) {
      skippedNoBalance += 1;
      continue;
    }

    const balanceDoc = await db.collection("creatorBalances").doc(handle).get();
    if (balanceDoc.exists) {
      skippedExisting += 1;
      continue;
    }

    const creatorUid = String(data.uid || data.creatorUid || "");
    const now = new Date();
    const entries = [];
    const available = {};
    const lifetimeEarned = {};

    for (const [currency, amount] of balances) {
      const minorUnit = minorUnits[currency];
      if (minorUnit === undefined) {
        fail(`currency ${currency} is not in shared/money/currencies.json`);
      }
      const amountMinor = minorAmount(amount, minorUnit);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        fail(`invalid ${currency} opening balance for ${handle}`);
      }

      const baseId = `opening_${safeId(handle)}_${currency}`;
      const availableId = `${baseId}:creator_available`;
      const equityId = `${baseId}:opening_equity`;

      const existing = await Promise.all([
        db.collection("ledgerEntries").doc(availableId).get(),
        db.collection("ledgerEntries").doc(equityId).get(),
      ]);
      if (existing.some((entry) => entry.exists)) {
        skippedExisting += 1;
        entries.length = 0;
        break;
      }

      entries.push({
        id: availableId,
        data: entryFields({
          id: availableId,
          account: "creator_available",
          currency,
          amountMinor,
          creatorUid,
          creatorHandle: handle,
          now,
        }),
      });
      entries.push({
        id: equityId,
        data: entryFields({
          id: equityId,
          account: "opening_equity",
          currency,
          amountMinor: -amountMinor,
          creatorUid,
          creatorHandle: handle,
          now,
        }),
      });

      available[currency] = amountMinor;
      lifetimeEarned[currency] = amountMinor;
    }

    if (entries.length === 0) continue;

    plans.push({
      handle,
      creatorUid,
      entries,
      balance: {
        uid: creatorUid,
        handle,
        available,
        pendingWithdrawals: {},
        lifetimeEarned,
        lifetimeWithdrawn: {},
        version: 0,
        updatedAt: now,
      },
    });
  }

  const entryCount = plans.reduce((sum, plan) => sum + plan.entries.length, 0);
  const totals = {};
  for (const plan of plans) {
    for (const [currency, amount] of Object.entries(plan.balance.available)) {
      totals[currency] = (totals[currency] || 0) + amount;
    }
  }

  console.log(`Ledger backfill (${APPLY ? "APPLY" : "dry run"})`);
  console.log(`  creators scanned: ${snapshot.docs.length}`);
  console.log(`  creators planned: ${plans.length}`);
  console.log(`  ledger entries: ${entryCount}`);
  console.log(`  skipped (already migrated): ${skippedExisting}`);
  console.log(`  skipped (no balance): ${skippedNoBalance}`);
  console.log(`  opening balances: ${JSON.stringify(totals)}`);

  if (!APPLY) {
    for (const plan of plans.slice(0, 10)) {
      console.log(`  ${plan.handle}: ${JSON.stringify(plan.balance.available)}`);
    }
    console.log("No writes performed. Re-run with --apply.");
    return;
  }

  for (const plan of plans) {
    const batch = db.batch();
    for (const entry of plan.entries) {
      batch.create(db.collection("ledgerEntries").doc(entry.id), entry.data);
    }
    batch.create(db.collection("creatorBalances").doc(plan.handle), plan.balance);
    await batch.commit();
    console.log(`  wrote ${plan.handle}: ${JSON.stringify(plan.balance.available)}`);
  }

  console.log(`Backfill complete: ${plans.length} creators, ${entryCount} entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
