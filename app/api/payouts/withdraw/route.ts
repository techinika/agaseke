import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";
import { MoneyError, fromMajor } from "@/lib/money";
import {
  parsePayoutCurrency,
  pendingPayoutField,
  pendingWithdrawalsField,
  type PayoutCurrency,
} from "@/lib/payouts/currency";
import { validateWithdrawalRequest, WithdrawalError } from "@/lib/payouts/withdrawals";
import { PayoutRouteError, resolvePayoutRoute } from "@/lib/payouts/rails";
import {
  buildWithdrawalHoldLedger,
  buildWithdrawalHoldLedgerPlan,
  isMoneyLedgerEnabled,
  ledgerEntryDocument,
} from "@/lib/payouts/withdrawalLedger";
import {
  isWithdrawalPlanUsable,
  type WithdrawalConversionPlan,
} from "@/lib/payouts/withdrawalConversion";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;

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
  if (error instanceof WithdrawalError) {
    const status = error.code === "INSUFFICIENT_AVAILABLE_BALANCE" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof MoneyError) {
    const status = error.code === "INSUFFICIENT_AVAILABLE_BALANCE" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof PayoutRouteError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  console.error("Withdrawal request failed:", error);
  return NextResponse.json({ error: "Failed to submit withdrawal request", code: "INTERNAL" }, { status: 500 });
}

function availableMinorFor(fresh: Record<string, unknown>, code: PayoutCurrency): number {
  const heldMap = fresh.pendingWithdrawals && typeof fresh.pendingWithdrawals === "object"
    ? (fresh.pendingWithdrawals as Record<string, unknown>) : {};
  const pendingMajor = code === "RWF" ? fresh.pendingPayout : fresh[pendingPayoutField(code)];
  const heldMajor = heldMap[code];
  const pendingMinor = pendingMajor === undefined || pendingMajor === null || pendingMajor === ""
    ? 0 : fromMajor(code, pendingMajor as any).amountMinor;
  const heldMinor = heldMajor === undefined || heldMajor === null || heldMajor === ""
    ? 0 : fromMajor(code, heldMajor as any).amountMinor;
  return pendingMinor - heldMinor;
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: {
    amount?: unknown;
    currency?: unknown;
    payoutCurrency?: unknown;
    quoteId?: unknown;
    idempotencyKey?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return NextResponse.json(
      { error: "idempotencyKey must be 8-128 letters, digits, underscore or hyphen", code: "INVALID_IDEMPOTENCY_KEY" },
      { status: 400 },
    );
  }

  const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";

  let payoutCurrency: PayoutCurrency;
  try {
    payoutCurrency = parsePayoutCurrency(body.payoutCurrency ?? body.currency);
  } catch {
    return NextResponse.json({ error: "Withdrawals do not support this currency", code: "UNSUPPORTED_CURRENCY" }, { status: 400 });
  }

  try {
    const creatorQuery = await adminDb.collection("creators").where("uid", "==", authUser.uid).limit(1).get();
    if (creatorQuery.empty) throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");

    const creatorDoc = creatorQuery.docs[0];
    const creatorRef = creatorDoc.ref;
    const creator = creatorDoc.data() as Record<string, unknown>;

    if (creator.verified !== true) {
      throw new ApiError(403, "CREATOR_NOT_VERIFIED", "Identity verification is required before requesting a withdrawal");
    }
    const accountNumber = String(creator.payoutNumber || "").trim();
    if (!accountNumber) {
      throw new ApiError(400, "PAYOUT_DESTINATION_MISSING", "Add a payout destination before requesting a withdrawal");
    }

    const currencyQuery = await adminDb.collection("currencies").where("code", "==", payoutCurrency).limit(1).get();
    if (currencyQuery.empty) {
      throw new ApiError(400, "CURRENCY_NOT_CONFIGURED", `${payoutCurrency} is not configured for withdrawals`);
    }
    const currencyPolicy = currencyQuery.docs[0].data() as any;
    const threshold = currencyPolicy.payoutThreshold;

    const route = resolvePayoutRoute(payoutCurrency, {
      provider: currencyPolicy.payoutProvider,
      rail: currencyPolicy.payoutRail,
      payoutPreference: creator.payoutPreference,
    });

    const requestRef = adminDb.collection("withdrawRequests").doc(idempotencyKey);
    const quoteRef = quoteId ? adminDb.collection("withdrawalQuotes").doc(quoteId) : null;
    const ledgerEnabled = isMoneyLedgerEnabled();
    let duplicate = false;

    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(requestRef);
      if (existing.exists) {
        if (existing.data()?.creatorId !== authUser.uid) {
          throw new ApiError(409, "IDEMPOTENCY_KEY_CONFLICT", "Idempotency key belongs to another request");
        }
        duplicate = true;
        return;
      }

      const freshSnap = await transaction.get(creatorRef);
      if (!freshSnap.exists) throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");
      const fresh = (freshSnap.data() || {}) as Record<string, unknown>;
      if (fresh.verified !== true) {
        throw new ApiError(403, "CREATOR_NOT_VERIFIED", "Identity verification is required before requesting a withdrawal");
      }
      if (!String(fresh.payoutNumber || "").trim()) {
        throw new ApiError(400, "PAYOUT_DESTINATION_MISSING", "Add a payout destination before requesting a withdrawal");
      }

      const now = new Date();
      let plan: WithdrawalConversionPlan | null = null;
      let amountMajorPayout = 0;
      let amountMinorPayout = 0;

      if (quoteRef) {
        const quoteSnap = await transaction.get(quoteRef);
        if (!quoteSnap.exists) throw new ApiError(404, "QUOTE_NOT_FOUND", "Withdrawal quote not found");
        const q = quoteSnap.data() as any;
        if (q.status !== "active") throw new ApiError(409, "QUOTE_CONSUMED", "Withdrawal quote already used");
        if (q.creatorUid !== authUser.uid) throw new ApiError(403, "QUOTE_OWNER_MISMATCH", "Quote belongs to another account");
        if (q.payoutCurrency !== payoutCurrency) throw new ApiError(400, "QUOTE_MISMATCH", "Quote payout currency mismatch");
        plan = q as WithdrawalConversionPlan;
        if (!isWithdrawalPlanUsable(plan)) throw new ApiError(410, "QUOTE_EXPIRED", "Withdrawal quote expired");

        // revalidate available per source atomically
        for (const source of plan.sources) {
          const avail = availableMinorFor(fresh, source.currency);
          if (avail < source.amountMinor) {
            throw new WithdrawalError("INSUFFICIENT_AVAILABLE_BALANCE", "Insufficient available balance for locked quote");
          }
        }

        // threshold check on payout amount
        const thresholdMinor = threshold === undefined || threshold === null || threshold === ""
          ? 0 : fromMajor(payoutCurrency, threshold as any).amountMinor;
        if (thresholdMinor > 0 && plan.requestedPayoutAmountMinor < thresholdMinor) {
          throw new WithdrawalError("WITHDRAWAL_BELOW_THRESHOLD", `Minimum withdrawal is ${threshold} ${payoutCurrency}`);
        }
        if (thresholdMinor <= 0) {
          throw new WithdrawalError("INVALID_BALANCE", "Withdrawal threshold must be configured");
        }

        amountMajorPayout = plan.requestedPayoutAmountMajor;
        amountMinorPayout = plan.requestedPayoutAmountMinor;

        transaction.update(quoteRef, {
          status: "consumed",
          consumedByRequestId: idempotencyKey,
          consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // legacy single-currency withdrawal in payout currency
        const validated = validateWithdrawalRequest({
          currency: payoutCurrency,
          amount: body.amount,
          pending: fresh[pendingPayoutField(payoutCurrency)],
          held: (fresh.pendingWithdrawals as any)?.[payoutCurrency],
          threshold,
        });
        amountMajorPayout = validated.amountMajor;
        amountMinorPayout = validated.amount.amountMinor;
      }

      const balanceRef = adminDb.collection("creatorBalances").doc(creatorDoc.id);
      const ledgerEntries = ledgerEnabled
        ? plan
          ? buildWithdrawalHoldLedgerPlan({
              requestId: idempotencyKey,
              creatorUid: authUser.uid,
              creatorHandle: creatorDoc.id,
              plan,
              source: "api/payouts/withdraw",
              createdAt: now,
            })
          : buildWithdrawalHoldLedger({
              requestId: idempotencyKey,
              creatorUid: authUser.uid,
              creatorHandle: creatorDoc.id,
              currency: payoutCurrency,
              amountMinor: amountMinorPayout,
              source: "api/payouts/withdraw",
              createdAt: now,
            })
        : [];

      if (ledgerEnabled) {
        const balanceSnap = await transaction.get(balanceRef);
        if (!balanceSnap.exists) {
          throw new ApiError(409, "LEDGER_BALANCE_NOT_FOUND", "Ledger balance is missing for this creator");
        }
        const bal = (balanceSnap.data() || {}) as any;
        if (plan) {
          for (const source of plan.sources) {
            const available = Number(bal?.available?.[source.currency] ?? 0);
            if (!Number.isSafeInteger(available) || available < source.amountMinor) {
              throw new WithdrawalError("INSUFFICIENT_AVAILABLE_BALANCE", "Insufficient ledger balance");
            }
          }
        } else {
          const available = Number(bal?.available?.[payoutCurrency] ?? 0);
          if (!Number.isSafeInteger(available) || available < amountMinorPayout) {
            throw new WithdrawalError("INSUFFICIENT_AVAILABLE_BALANCE", "Insufficient ledger balance");
          }
        }
      }

      transaction.set(requestRef, {
        creatorId: authUser.uid,
        creatorName: String(fresh.name || authUser.email || fresh.handle || ""),
        handle: creatorDoc.id,
        amount: amountMajorPayout,
        amountMinor: amountMinorPayout,
        currency: payoutCurrency,
        payoutCurrency,
        provider: route.provider,
        rail: route.rail,
        status: "pending",
        held: true,
        method: route.rail === "bank_transfer" ? "Bank" : String(fresh.network || "MoMo"),
        accountNumber: String(fresh.payoutNumber || ""),
        idempotencyKey,
        ledgerMode: ledgerEnabled ? "dual_write_v1" : "legacy",
        ledgerEntryIds: ledgerEntries.map((entry) => entry.id),
        ...(plan ? { conversionPlan: plan, quoteId: plan.id, sourceDebits: plan.sources } : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // hold increments per source currency (major units on creator doc for legacy)
      if (plan) {
        for (const source of plan.sources) {
          transaction.update(creatorRef, {
            [pendingWithdrawalsField(source.currency)]: admin.firestore.FieldValue.increment(source.amountMajor),
          });
        }
        transaction.update(creatorRef, { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        transaction.update(creatorRef, {
          [pendingWithdrawalsField(payoutCurrency)]: admin.firestore.FieldValue.increment(amountMajorPayout),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (ledgerEnabled) {
        for (const entry of ledgerEntries) {
          transaction.set(adminDb.collection("ledgerEntries").doc(entry.id), ledgerEntryDocument(entry));
        }

        if (plan) {
          for (const source of plan.sources) {
            transaction.update(balanceRef, {
              [`available.${source.currency}`]: admin.firestore.FieldValue.increment(-source.amountMinor),
              [`pendingWithdrawals.${source.currency}`]: admin.firestore.FieldValue.increment(source.amountMinor),
            });
          }
          transaction.update(balanceRef, {
            version: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.update(balanceRef, {
            [`available.${payoutCurrency}`]: admin.firestore.FieldValue.increment(-amountMinorPayout),
            [`pendingWithdrawals.${payoutCurrency}`]: admin.firestore.FieldValue.increment(amountMinorPayout),
            version: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });

    return NextResponse.json(
      { success: true, requestId: idempotencyKey, duplicate, amount: body.amount, currency: payoutCurrency, provider: route.provider, rail: route.rail, ledger: ledgerEnabled, quoteId: quoteId || null },
      { status: duplicate ? 200 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
