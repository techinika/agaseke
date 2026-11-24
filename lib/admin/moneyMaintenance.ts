import { adminDb } from "@/db/firebaseAdmin";
import {
  CURRENCY_LIST,
  PAYMENT_RAIL_PROVIDER_LIST,
  isSnapshotFresh,
  parseFxSnapshot,
} from "@/lib/money";
import {
  PRE_MULTI_CURRENCY_CUTOFF_ISO,
  PRE_MULTI_CURRENCY_CUTOFF_MS,
  getRecordTimestampMs,
  normalizeValidCurrency,
} from "@/lib/money/historicalCurrency";

export const BACKFILL_COLLECTIONS = [
  "platformIncome",
  "creatorIncome",
  "transactions",
  "supportedCreators",
  "sales",
  "storeOrders",
  "storeProducts",
  "bookingRequests",
  "creatorGatherings",
  "ticketSales",
  "gatheringsAttendance",
  "payouts",
  "withdrawRequests",
] as const;

export type BackfillCollectionName = (typeof BACKFILL_COLLECTIONS)[number];

export const BACKFILL_COLLECTION_SET = new Set<string>(BACKFILL_COLLECTIONS);

export interface MaintenanceDocRecord extends Record<string, unknown> {
  id: string;
}

export interface CurrencyBackfillUpdate {
  id: string;
  currency: string;
  source: "transaction_ref" | "pre_cutoff_rwf" | "creator_currency" | "payout_currency";
  txRef?: string;
}

export interface CollectionCurrencyBackfillPlan {
  collection: string;
  scanned: number;
  alreadyStamped: number;
  updates: CurrencyBackfillUpdate[];
  unresolved: string[];
  byCurrency: Record<string, number>;
}

const VALID_CREATOR_HANDLE_RE = /^[A-Za-z0-9_.-]{1,100}$/;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function extractTxRef(doc: Record<string, unknown>): string {
  for (const key of ["txRef", "paymentRef", "transactionId", "ref"]) {
    const val = doc[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

/**
 * Pure planner: computes currency stamps for any allowlisted collection.
 * NEVER overwrites a document that already has a valid currency (e.g. USD).
 */
export function planCollectionCurrencyBackfill(
  collectionName: string,
  docs: MaintenanceDocRecord[],
  transactionsByRef: Map<string, Record<string, unknown>>,
  cutoffMs = PRE_MULTI_CURRENCY_CUTOFF_MS,
): CollectionCurrencyBackfillPlan {
  const updates: CurrencyBackfillUpdate[] = [];
  const unresolved: string[] = [];
  let alreadyStamped = 0;

  for (const doc of docs) {
    const explicit = normalizeValidCurrency(doc.currency);
    if (explicit) {
      alreadyStamped += 1;
      continue;
    }

    const payoutExplicit = normalizeValidCurrency(doc.payoutCurrency);
    if (payoutExplicit && (collectionName === "withdrawRequests" || collectionName === "payouts")) {
      updates.push({
        id: doc.id,
        currency: payoutExplicit,
        source: "payout_currency",
      });
      continue;
    }

    const txRef = extractTxRef(doc);
    const linkedTx = txRef ? transactionsByRef.get(txRef) : undefined;
    const txCurrency = normalizeValidCurrency(linkedTx?.currency);
    if (txCurrency) {
      updates.push({
        id: doc.id,
        currency: txCurrency,
        source: "transaction_ref",
        txRef,
      });
      continue;
    }

    const tsMs = getRecordTimestampMs(doc) ?? getRecordTimestampMs(linkedTx);
    if (tsMs === null || tsMs < cutoffMs) {
      updates.push({
        id: doc.id,
        currency: "RWF",
        source: "pre_cutoff_rwf",
        ...(txRef ? { txRef } : {}),
      });
      continue;
    }

    unresolved.push(doc.id);
  }

  const byCurrency: Record<string, number> = {};
  for (const update of updates) {
    byCurrency[update.currency] = (byCurrency[update.currency] || 0) + 1;
  }

  return {
    collection: collectionName,
    scanned: docs.length,
    alreadyStamped,
    updates,
    unresolved,
    byCurrency,
  };
}

async function loadTransactionsByRef(
  refs: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const byRef = new Map<string, Record<string, unknown>>();
  const unique = [...new Set(refs.filter(Boolean))];
  if (unique.length === 0) return byRef;

  for (const group of chunks(unique, 200)) {
    const snapshots = await adminDb.getAll(
      ...group.map((ref) => adminDb.collection("transactions").doc(ref)),
    );
    for (const snap of snapshots) {
      if (snap.exists) {
        byRef.set(snap.id, snap.data() as Record<string, unknown>);
      }
    }
  }

  const missing = unique.filter((ref) => !byRef.has(ref));
  for (const group of chunks(missing, 10)) {
    const snap = await adminDb
      .collection("transactions")
      .where("ref", "in", group)
      .get();
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const ref = typeof data.ref === "string" ? data.ref : "";
      if (ref) byRef.set(ref, data);
    }
  }

  return byRef;
}

export async function runCurrencyBackfill(params: {
  apply: boolean;
  limit: number;
  collections: BackfillCollectionName[];
}) {
  const collectionsReport: Array<
    Omit<CollectionCurrencyBackfillPlan, "updates"> & {
      updatesPlanned: number;
      written: number;
      sampleUpdates: CurrencyBackfillUpdate[];
    }
  > = [];

  let totalScanned = 0;
  let totalAlreadyStamped = 0;
  let totalUpdatesPlanned = 0;
  let totalWritten = 0;
  let totalUnresolved = 0;

  for (const name of params.collections) {
    const snap = await adminDb.collection(name).limit(params.limit).get();
    const docs: MaintenanceDocRecord[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    const refsToResolve = docs
      .filter((d) => !normalizeValidCurrency(d.currency))
      .map((d) => extractTxRef(d))
      .filter(Boolean);
    const txMap =
      name === "transactions"
        ? new Map<string, Record<string, unknown>>()
        : await loadTransactionsByRef(refsToResolve);

    const plan = planCollectionCurrencyBackfill(
      name,
      docs,
      txMap,
      PRE_MULTI_CURRENCY_CUTOFF_MS,
    );

    let written = 0;
    if (params.apply && plan.updates.length > 0) {
      for (const group of chunks(plan.updates, 400)) {
        const batch = adminDb.batch();
        for (const update of group) {
          batch.update(adminDb.collection(name).doc(update.id), {
            currency: update.currency,
          });
        }
        await batch.commit();
        written += group.length;
      }
    }

    totalScanned += plan.scanned;
    totalAlreadyStamped += plan.alreadyStamped;
    totalUpdatesPlanned += plan.updates.length;
    totalWritten += written;
    totalUnresolved += plan.unresolved.length;

    collectionsReport.push({
      collection: name,
      scanned: plan.scanned,
      alreadyStamped: plan.alreadyStamped,
      updatesPlanned: plan.updates.length,
      written,
      unresolved: plan.unresolved.slice(0, 20),
      byCurrency: plan.byCurrency,
      sampleUpdates: plan.updates.slice(0, 15),
    });
  }

  return {
    script: "currency_backfill" as const,
    applied: params.apply,
    cutoffIso: PRE_MULTI_CURRENCY_CUTOFF_ISO,
    totals: {
      scanned: totalScanned,
      alreadyStamped: totalAlreadyStamped,
      updatesPlanned: totalUpdatesPlanned,
      written: totalWritten,
      unresolved: totalUnresolved,
    },
    collections: collectionsReport,
  };
}

function finiteAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 180);
}

export async function runLedgerBackfill(params: {
  apply: boolean;
  limit: number;
  handle?: string;
}) {
  const minorUnits = Object.fromEntries(
    CURRENCY_LIST.map((c) => [c.code, c.minorUnit]),
  );

  const docs = params.handle
    ? VALID_CREATOR_HANDLE_RE.test(params.handle)
      ? await adminDb
          .collection("creators")
          .doc(params.handle)
          .get()
          .then((d) => (d.exists ? [d] : []))
      : []
    : (await adminDb.collection("creators").limit(params.limit).get()).docs;

  let skippedExisting = 0;
  let skippedNoBalance = 0;
  let plannedCreators = 0;
  let plannedEntries = 0;
  let writtenCreators = 0;
  let writtenEntries = 0;
  const totalsByCurrency: Record<string, number> = {};
  const sampleCreators: Array<{ handle: string; currencies: Record<string, number> }> = [];

  for (const creatorDoc of docs) {
    const handle = creatorDoc.id;
    if (!handle || handle.includes("/")) {
      skippedNoBalance += 1;
      continue;
    }

    const data = (creatorDoc.data() || {}) as Record<string, unknown>;
    const balanceByCurrency = new Map<string, number>();
    const rwf = finiteAmount(data.pendingPayout);
    if (rwf > 0) balanceByCurrency.set("RWF", rwf);

    for (const [key, value] of Object.entries(data)) {
      const match = key.match(/^pendingPayout([A-Z]{3})$/);
      if (!match) continue;
      const amount = finiteAmount(value);
      if (amount > 0) balanceByCurrency.set(match[1], amount);
    }

    if (balanceByCurrency.size === 0) {
      skippedNoBalance += 1;
      continue;
    }

    const existingBalance = await adminDb.collection("creatorBalances").doc(handle).get();
    if (existingBalance.exists) {
      skippedExisting += 1;
      continue;
    }

    const creatorUid = String(data.uid || data.creatorUid || "");
    const now = new Date();
    const entries: Array<{ id: string; data: Record<string, unknown> }> = [];
    const available: Record<string, number> = {};
    const lifetimeEarned: Record<string, number> = {};
    let conflict = false;

    for (const [currency, amount] of balanceByCurrency.entries()) {
      const minorUnit = minorUnits[currency];
      if (minorUnit === undefined) continue;
      const amountMinor = Math.round(amount * 10 ** minorUnit);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) continue;

      const baseId = `opening_${safeId(handle)}_${currency}`;
      const availableId = `${baseId}:creator_available`;
      const equityId = `${baseId}:opening_equity`;

      const [aSnap, eSnap] = await Promise.all([
        adminDb.collection("ledgerEntries").doc(availableId).get(),
        adminDb.collection("ledgerEntries").doc(equityId).get(),
      ]);
      if (aSnap.exists || eSnap.exists) {
        conflict = true;
        break;
      }

      const common = {
        paymentRef: null,
        transactionId: null,
        type: "opening_balance",
        currency,
        creatorUid: creatorUid || null,
        creatorHandle: handle,
        source: "migration",
        createdAt: now,
      };
      entries.push({
        id: availableId,
        data: {
          ...common,
          idempotencyKey: availableId,
          account: "creator_available",
          amountMinor,
        },
      });
      entries.push({
        id: equityId,
        data: {
          ...common,
          idempotencyKey: equityId,
          account: "opening_equity",
          amountMinor: -amountMinor,
        },
      });

      available[currency] = amountMinor;
      lifetimeEarned[currency] = amountMinor;
    }

    if (conflict || entries.length === 0) {
      skippedExisting += 1;
      continue;
    }

    plannedCreators += 1;
    plannedEntries += entries.length;
    for (const [cur, minor] of Object.entries(available)) {
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + minor;
    }
    if (sampleCreators.length < 15) {
      sampleCreators.push({ handle, currencies: available });
    }

    if (params.apply) {
      const batch = adminDb.batch();
      for (const entry of entries) {
        batch.create(adminDb.collection("ledgerEntries").doc(entry.id), entry.data);
      }
      batch.create(adminDb.collection("creatorBalances").doc(handle), {
        uid: creatorUid,
        handle,
        available,
        pendingWithdrawals: {},
        lifetimeEarned,
        lifetimeWithdrawn: {},
        version: 0,
        updatedAt: now,
      });
      await batch.commit();
      writtenCreators += 1;
      writtenEntries += entries.length;
    }
  }

  return {
    script: "ledger_backfill" as const,
    applied: params.apply,
    scanned: docs.length,
    plannedCreators,
    plannedEntries,
    writtenCreators,
    writtenEntries,
    skippedExisting,
    skippedNoBalance,
    totalsMinorByCurrency: totalsByCurrency,
    sampleCreators,
  };
}

export async function runLedgerReconcile(params: { limit: number; handle?: string }) {
  const docs = params.handle
    ? VALID_CREATOR_HANDLE_RE.test(params.handle)
      ? await adminDb
          .collection("creatorBalances")
          .doc(params.handle)
          .get()
          .then((d) => (d.exists ? [d] : []))
      : []
    : (await adminDb.collection("creatorBalances").limit(params.limit).get()).docs;

  let checked = 0;
  let mismatches = 0;
  let missingLedger = 0;
  const mismatchDetails: Array<{
    handle: string;
    currency: string;
    available: [number, number];
    lifetimeEarned: [number, number];
    pendingWithdrawals: [number, number];
    lifetimeWithdrawn: [number, number];
  }> = [];
  const missingLedgerHandles: string[] = [];

  for (const balanceDoc of docs) {
    const handle = balanceDoc.id;
    const data = (balanceDoc.data() || {}) as Record<string, unknown>;
    const available = (data.available || {}) as Record<string, unknown>;
    const lifetimeEarned = (data.lifetimeEarned || {}) as Record<string, unknown>;
    const pendingWithdrawals = (data.pendingWithdrawals || {}) as Record<string, unknown>;
    const lifetimeWithdrawn = (data.lifetimeWithdrawn || {}) as Record<string, unknown>;

    const entriesSnap = await adminDb
      .collection("ledgerEntries")
      .where("creatorHandle", "==", handle)
      .get();

    if (entriesSnap.empty) {
      missingLedger += 1;
      if (missingLedgerHandles.length < 20) missingLedgerHandles.push(handle);
      continue;
    }

    const ledgerAvailable: Record<string, number> = {};
    const ledgerEarned: Record<string, number> = {};
    const ledgerPending: Record<string, number> = {};
    const ledgerWithdrawn: Record<string, number> = {};

    for (const entryDoc of entriesSnap.docs) {
      const entry = entryDoc.data() as Record<string, unknown>;
      const currency = String(entry.currency || "");
      const amount = Number(entry.amountMinor || 0);
      if (!currency || !Number.isFinite(amount)) continue;

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
      const expectedAvailable = Number(available[currency] || 0);
      const actualAvailable = Number(ledgerAvailable[currency] || 0);
      const expectedEarned = Number(lifetimeEarned[currency] || 0);
      const actualEarned = Number(ledgerEarned[currency] || 0);
      const expectedPending = Number(pendingWithdrawals[currency] || 0);
      const actualPending = Number(ledgerPending[currency] || 0);
      const expectedWithdrawn = Number(lifetimeWithdrawn[currency] || 0);
      const actualWithdrawn = Number(ledgerWithdrawn[currency] || 0);

      if (
        expectedAvailable !== actualAvailable ||
        expectedEarned !== actualEarned ||
        expectedPending !== actualPending ||
        expectedWithdrawn !== actualWithdrawn
      ) {
        handleMismatch = true;
        if (mismatchDetails.length < 25) {
          mismatchDetails.push({
            handle,
            currency,
            available: [expectedAvailable, actualAvailable],
            lifetimeEarned: [expectedEarned, actualEarned],
            pendingWithdrawals: [expectedPending, actualPending],
            lifetimeWithdrawn: [expectedWithdrawn, actualWithdrawn],
          });
        }
      }
    }

    if (handleMismatch) mismatches += 1;
  }

  return {
    script: "ledger_reconcile" as const,
    ok: mismatches === 0 && missingLedger === 0,
    balancesScanned: docs.length,
    balancesChecked: checked,
    mismatchedCreators: mismatches,
    missingLedgerEntries: missingLedger,
    missingLedgerHandles,
    mismatchDetails,
  };
}

export async function runMoneyEnablementCheck() {
  const [policiesSnap, fxSnap] = await Promise.all([
    adminDb.collection("currencies").get(),
    adminDb.collection("fxRates").doc("latest").get(),
  ]);

  const policyByCode = new Map<string, Record<string, unknown>>();
  for (const d of policiesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const code = normalizeValidCurrency(data.code || d.id);
    if (code) policyByCode.set(code, data);
  }

  let fxStatus: "fresh" | "stale" | "missing" | "invalid" = "missing";
  let fxCurrencies: string[] = [];
  if (fxSnap.exists) {
    try {
      const parsed = parseFxSnapshot(fxSnap.data() as Record<string, unknown>);
      const maxAgeMinutes = Math.max(
        1,
        Math.trunc(Number(process.env.FX_RATE_MAX_AGE_MINUTES || 24 * 60)),
      );
      fxStatus = isSnapshotFresh(parsed, new Date(), maxAgeMinutes) ? "fresh" : "stale";
      fxCurrencies = Object.keys(parsed.rates).sort();
    } catch {
      fxStatus = "invalid";
    }
  }

  const currencies = CURRENCY_LIST.map((def) => {
    const policy = policyByCode.get(def.code);
    const rails = PAYMENT_RAIL_PROVIDER_LIST.filter((p) =>
      p.currencies.includes(def.code),
    ).map((p) => `${p.id} (${p.methods.join("/")})`);
    return {
      code: def.code,
      name: def.name,
      minorUnit: def.minorUnit,
      countries: def.countries,
      rails,
      policyConfigured: Boolean(policy),
      policyEnabled: policy ? policy.enabled !== false : null,
      payoutThreshold: policy ? Number(policy.payoutThreshold || 0) : null,
      hasFxRate: def.code === "USD" || fxCurrencies.includes(def.code),
    };
  });

  return {
    script: "enablement_check" as const,
    registeredCurrencyCount: CURRENCY_LIST.length,
    providerCount: PAYMENT_RAIL_PROVIDER_LIST.length,
    fxStatus,
    fxRateCount: fxCurrencies.length,
    currencies,
  };
}
