import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import { fromMajor, MoneyError, toMajor } from "@/lib/money";
import {
  parsePayoutCurrency,
  pendingPayoutField,
  pendingWithdrawalsField,
  type PayoutCurrency,
} from "@/lib/payouts/currency";
import { PayoutRouteError, resolvePayoutRoute } from "@/lib/payouts/rails";
import {
  buildWithdrawalReleaseLedger,
  buildWithdrawalSettlementLedger,
  buildWithdrawalReleaseLedgerPlan,
  buildWithdrawalSettlementLedgerPlan,
  isMoneyLedgerEnabled,
  ledgerEntryDocument,
} from "@/lib/payouts/withdrawalLedger";
import type { WithdrawalConversionPlan } from "@/lib/payouts/withdrawalConversion";

const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof MoneyError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (error instanceof PayoutRouteError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  console.error("Admin withdrawal action failed:", error);
  return NextResponse.json({ error: "Failed to update withdrawal request", code: "INTERNAL" }, { status: 500 });
}

function asPlan(withdrawal: Record<string, unknown>): WithdrawalConversionPlan | null {
  const p = withdrawal.conversionPlan;
  if (!p || typeof p !== "object") return null;
  const plan = p as WithdrawalConversionPlan;
  if (!Array.isArray(plan.sources) || plan.sources.length === 0) return null;
  return plan;
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: {
    requestId?: unknown;
    action?: unknown;
    method?: unknown;
    accountNumber?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!REQUEST_ID.test(requestId)) {
    return NextResponse.json({ error: "A valid requestId is required", code: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject", code: "INVALID_ACTION" }, { status: 400 });
  }

  const ledgerEnabled = isMoneyLedgerEnabled();

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const requestRef = adminDb.collection("withdrawRequests").doc(requestId);
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists) throw new ApiError(404, "WITHDRAWAL_NOT_FOUND", "Withdrawal request not found");

      const withdrawal = (requestSnap.data() || {}) as Record<string, unknown>;
      if (withdrawal.status !== "pending") {
        throw new ApiError(409, "WITHDRAWAL_NOT_PENDING", "Withdrawal request is no longer pending");
      }

      let payoutCurrency: PayoutCurrency;
      try {
        payoutCurrency = parsePayoutCurrency(withdrawal.payoutCurrency ?? withdrawal.currency);
      } catch {
        throw new ApiError(400, "UNSUPPORTED_CURRENCY", "Withdrawal request has an unsupported currency");
      }

      const route = resolvePayoutRoute(payoutCurrency, {
        provider: withdrawal.provider,
        rail: withdrawal.rail,
      });

      const payoutAmount = fromMajor(payoutCurrency, withdrawal.amount as any);
      if (payoutAmount.amountMinor <= 0) {
        throw new ApiError(400, "INVALID_AMOUNT", "Withdrawal request has an invalid amount");
      }

      const creatorHandle = String(withdrawal.handle || "").trim();
      if (!creatorHandle) throw new ApiError(400, "MISSING_CREATOR_HANDLE", "Withdrawal request has no creator handle");

      const creatorRef = adminDb.collection("creators").doc(creatorHandle);
      const creatorSnap = await transaction.get(creatorRef);
      if (!creatorSnap.exists) throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");

      const held = withdrawal.held === true;
      if (ledgerEnabled && action === "approve" && !held) {
        throw new ApiError(409, "LEGACY_WITHDRAWAL", "Ledger settlement requires a held withdrawal; migrate this request first");
      }

      const plan = asPlan(withdrawal);
      const balanceRef = adminDb.collection("creatorBalances").doc(creatorHandle);
      let balanceData: any = null;
      if (ledgerEnabled) {
        const balanceSnap = await transaction.get(balanceRef);
        if (!balanceSnap.exists) throw new ApiError(409, "LEDGER_BALANCE_NOT_FOUND", "Ledger balance is missing for this creator");
        balanceData = balanceSnap.data() || {};
      }

      if (ledgerEnabled && held) {
        if (plan) {
          for (const source of plan.sources) {
            const pendingHeld = Number(balanceData?.pendingWithdrawals?.[source.currency] ?? 0);
            if (!Number.isSafeInteger(pendingHeld) || pendingHeld < source.amountMinor) {
              throw new ApiError(409, "LEDGER_BALANCE_STATE", "Held withdrawal balance does not match the ledger");
            }
          }
        } else {
          const pendingHeld = Number(balanceData?.pendingWithdrawals?.[payoutCurrency] ?? 0);
          if (!Number.isSafeInteger(pendingHeld) || pendingHeld < payoutAmount.amountMinor) {
            throw new ApiError(409, "LEDGER_BALANCE_STATE", "Held withdrawal balance does not match the ledger");
          }
        }
      }

      const now = new Date();
      const requestedMethod = String(body.method || withdrawal.method || "").trim();
      const method = route.rail === "bank_transfer" ? "Bank" : requestedMethod || "MoMo";
      const accountNumber = String(body.accountNumber || withdrawal.accountNumber || "").trim();
      const creatorUid = String(withdrawal.creatorId || "");
      const amountMajor = toMajor(payoutAmount);

      const sourceSummary = plan
        ? plan.sources.map((s) => ({ currency: s.currency, amountMinor: s.amountMinor, amountMajor: s.amountMajor, payoutAmountMinor: s.payoutAmountMinor, payoutAmountMajor: s.payoutAmountMajor, rate: s.effectiveRate, fxRateId: s.fxRateId }))
        : [{ currency: payoutCurrency, amountMinor: payoutAmount.amountMinor, amountMajor, payoutAmountMinor: payoutAmount.amountMinor, payoutAmountMajor: amountMajor, rate: 1, fxRateId: "" }];

      if (action === "approve") {
        const payoutRef = adminDb.collection("payouts").doc();
        const ledgerEntries = ledgerEnabled
          ? plan
            ? buildWithdrawalSettlementLedgerPlan({ requestId, creatorUid, creatorHandle, plan, source: "api/admin/payouts/withdrawals", createdAt: now })
            : buildWithdrawalSettlementLedger({ requestId, creatorUid, creatorHandle, currency: payoutCurrency, amountMinor: payoutAmount.amountMinor, source: "api/admin/payouts/withdrawals", createdAt: now })
          : [];

        transaction.update(requestRef, {
          status: "completed",
          held: false,
          method,
          accountNumber,
          provider: route.provider,
          rail: route.rail,
          reviewedBy: authUser.uid,
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          holdReleasedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(ledgerEnabled ? { ledgerMode: "dual_write_v1", ledgerEntryIds: ledgerEntries.map((e) => e.id) } : {}),
        });

        transaction.set(payoutRef, {
          withdrawalRequestId: requestId,
          creatorId: creatorHandle,
          creatorUid,
          amount: amountMajor,
          amountMinor: payoutAmount.amountMinor,
          currency: payoutCurrency,
          payoutCurrency,
          provider: route.provider,
          rail: route.rail,
          status: "completed",
          approvedBy: authUser.uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          method,
          accountNumber,
          ledgerMode: ledgerEnabled ? "dual_write_v1" : "legacy",
          sourceDebits: sourceSummary,
          fx: plan ? { quoteId: plan.id, sources: plan.sources } : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // decrement per-source pending + held (major units legacy fields)
        const creatorUpdates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        for (const s of sourceSummary) {
          creatorUpdates[pendingPayoutField(s.currency as PayoutCurrency)] = admin.firestore.FieldValue.increment(-s.amountMajor);
          if (held) {
            creatorUpdates[pendingWithdrawalsField(s.currency as PayoutCurrency)] = admin.firestore.FieldValue.increment(-s.amountMajor);
          }
        }
        transaction.update(creatorRef, creatorUpdates);

        if (ledgerEnabled) {
          for (const entry of ledgerEntries) {
            transaction.set(adminDb.collection("ledgerEntries").doc(entry.id), ledgerEntryDocument(entry));
          }
          for (const s of sourceSummary) {
            transaction.update(balanceRef, {
              [`pendingWithdrawals.${s.currency}`]: admin.firestore.FieldValue.increment(-s.amountMinor),
            });
          }
          transaction.update(balanceRef, {
            [`lifetimeWithdrawn.${payoutCurrency}`]: admin.firestore.FieldValue.increment(payoutAmount.amountMinor),
            version: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return { action, requestId, payoutId: payoutRef.id, creatorId: creatorUid, creatorName: String(withdrawal.creatorName || creatorSnap.data()?.name || ""), handle: creatorHandle, amount: amountMajor, currency: payoutCurrency, provider: route.provider, rail: route.rail, method, accountNumber, sourceDebits: sourceSummary };
      }

      // reject
      const releaseEntries = ledgerEnabled && held
        ? plan
          ? buildWithdrawalReleaseLedgerPlan({ requestId, creatorUid, creatorHandle, plan, source: "api/admin/payouts/withdrawals", createdAt: now })
          : buildWithdrawalReleaseLedger({ requestId, creatorUid, creatorHandle, currency: payoutCurrency, amountMinor: payoutAmount.amountMinor, source: "api/admin/payouts/withdrawals", createdAt: now })
        : [];

      transaction.update(requestRef, {
        status: "rejected",
        held: false,
        method,
        accountNumber,
        provider: route.provider,
        rail: route.rail,
        reviewedBy: authUser.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        holdReleasedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(releaseEntries.length > 0 ? { ledgerMode: "dual_write_v1", ledgerEntryIds: releaseEntries.map((e) => e.id) } : {}),
      });

      if (held) {
        const creatorUpdates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        for (const s of sourceSummary) {
          creatorUpdates[pendingWithdrawalsField(s.currency as PayoutCurrency)] = admin.firestore.FieldValue.increment(-s.amountMajor);
        }
        transaction.update(creatorRef, creatorUpdates);

        if (ledgerEnabled) {
          for (const entry of releaseEntries) {
            transaction.set(adminDb.collection("ledgerEntries").doc(entry.id), ledgerEntryDocument(entry));
          }
          for (const s of sourceSummary) {
            transaction.update(balanceRef, {
              [`pendingWithdrawals.${s.currency}`]: admin.firestore.FieldValue.increment(-s.amountMinor),
              [`available.${s.currency}`]: admin.firestore.FieldValue.increment(s.amountMinor),
            });
          }
          transaction.update(balanceRef, {
            version: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return { action, requestId, creatorId: creatorUid, creatorName: String(withdrawal.creatorName || creatorSnap.data()?.name || ""), handle: creatorHandle, amount: amountMajor, currency: payoutCurrency, provider: route.provider, rail: route.rail, method, accountNumber, sourceDebits: sourceSummary };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
