#!/usr/bin/env node

import { getFirestore } from "./firebase-admin.mjs";
import {
  planIncomeCurrencyDocs,
  summarizeIncomeCurrencyUpdates,
} from "./incomeCurrencyPlan.mjs";

const APPLY = process.argv.includes("--apply");
const JSON_OUTPUT = process.argv.includes("--json");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const COLLECTION_ARG = process.argv.find((arg) => arg.startsWith("--collection="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 1000;
const COLLECTIONS = COLLECTION_ARG
  ? COLLECTION_ARG.split("=")[1].split(",").map((name) => name.trim())
  : ["platformIncome", "creatorIncome"];

const ALLOWED_COLLECTIONS = new Set(["platformIncome", "creatorIncome"]);

function fail(message) {
  console.error(`income currency backfill: ${message}`);
  process.exit(1);
}

function chunks(list, size) {
  const result = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

async function loadTransactionsByRef(db, refs) {
  const byRef = new Map();
  const unique = [...new Set(refs.filter(Boolean))];

  for (const chunk of chunks(unique, 300)) {
    const snapshots = await db.getAll(
      ...chunk.map((ref) => db.collection("transactions").doc(ref)),
    );
    for (const snapshot of snapshots) {
      if (snapshot.exists) byRef.set(snapshot.id, snapshot.data());
    }
  }

  const missing = unique.filter((ref) => !byRef.has(ref));
  for (const chunk of chunks(missing, 10)) {
    const snapshot = await db
      .collection("transactions")
      .where("ref", "in", chunk)
      .get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const ref = typeof data.ref === "string" ? data.ref : "";
      if (ref) byRef.set(ref, data);
    }
  }

  return byRef;
}

async function main() {
  for (const name of COLLECTIONS) {
    if (!ALLOWED_COLLECTIONS.has(name)) {
      fail(`unsupported collection ${name}`);
    }
  }

  const db = getFirestore();
  const report = {};

  for (const name of COLLECTIONS) {
    const snapshot = await db.collection(name).limit(LIMIT).get();
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const missingCurrency = docs.filter((doc) => !doc.currency);
    const transactions = await loadTransactionsByRef(
      db,
      missingCurrency.map((doc) => doc.txRef).filter((ref) => typeof ref === "string"),
    );
    const plan = planIncomeCurrencyDocs(docs, transactions, {
      preCutoffRwfFallback: true,
    });
    const byCurrency = summarizeIncomeCurrencyUpdates(plan.updates);

    report[name] = {
      scanned: docs.length,
      alreadyStamped: plan.alreadyStamped,
      updates: plan.updates.length,
      unresolved: plan.unresolved.length,
      byCurrency,
    };

    console.log(`${name} (${APPLY ? "APPLY" : "dry run"})`);
    console.log(`  scanned: ${docs.length}`);
    console.log(`  already have currency: ${plan.alreadyStamped}`);
    console.log(`  updates planned: ${plan.updates.length}`);
    console.log(`  unresolved (no matching transaction currency): ${plan.unresolved.length}`);
    console.log(`  planned currencies: ${JSON.stringify(byCurrency)}`);

    if (!APPLY) {
      for (const update of plan.updates.slice(0, 10)) {
        console.log(`  ${update.id} -> ${update.currency} (${update.txRef})`);
      }
      if (plan.unresolved.length > 0) {
        console.log(`  unresolved ids (first 10): ${plan.unresolved.slice(0, 10).join(", ")}`);
      }
      continue;
    }

    for (const chunk of chunks(plan.updates, 400)) {
      const batch = db.batch();
      for (const update of chunk) {
        batch.update(db.collection(name).doc(update.id), { currency: update.currency });
      }
      await batch.commit();
    }
    console.log(`  wrote ${plan.updates.length} currency fields`);
  }

  if (!APPLY) {
    console.log("No writes performed. Re-run with --apply.");
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ applied: APPLY, collections: report }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
