import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";
import { MoneyError } from "@/lib/money";
import {
  parsePayoutCurrency,
  PAYOUT_CURRENCIES,
  pendingPayoutField,
  pendingWithdrawalsField,
} from "@/lib/payouts/currency";
import { validateWithdrawalRequest, WithdrawalError } from "@/lib/payouts/withdrawals";
import {
  buildWithdrawalHoldLedger,
  isMoneyLedgerEnabled,
  ledgerEntryDocument,
} from "@/lib/payouts/withdrawalLedger";

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
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof WithdrawalError) {
    const status = error.code === "INSUFFICIENT_AVAILABLE_BALANCE" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  if (error instanceof MoneyError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }

  console.error("Withdrawal request failed:", error);
  return NextResponse.json(
    { error: "Failed to submit withdrawal request", code: "INTERNAL" },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: {
    amount?: unknown;
    currency?: unknown;
    idempotencyKey?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return NextResponse.json(
      {
        error: "idempotencyKey must be 8-128 letters, digits, underscore or hyphen",
        code: "INVALID_IDEMPOTENCY_KEY",
      },
      { status: 400 },
    );
  }

  let currency;
  try {
    currency = parsePayoutCurrency(body.currency);
  } catch {
    return NextResponse.json(
      {
        error: `Withdrawals support ${PAYOUT_CURRENCIES.join(" and ")} only`,
        code: "UNSUPPORTED_CURRENCY",
      },
      { status: 400 },
    );
  }

  try {
    const creatorQuery = await adminDb
      .collection("creators")
      .where("uid", "==", authUser.uid)
      .limit(1)
      .get();
    if (creatorQuery.empty) {
      throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");
    }

    const creatorDoc = creatorQuery.docs[0];
    const creatorRef = creatorDoc.ref;
    const creator = creatorDoc.data();

    if (creator.verified !== true) {
      throw new ApiError(
        403,
        "CREATOR_NOT_VERIFIED",
        "Identity verification is required before requesting a withdrawal",
      );
    }

    const accountNumber = String(creator.payoutNumber || "").trim();
    if (!accountNumber) {
      throw new ApiError(
        400,
        "PAYOUT_DESTINATION_MISSING",
        "Add a payout destination before requesting a withdrawal",
      );
    }

    const currencyQuery = await adminDb
      .collection("currencies")
      .where("code", "==", currency)
      .limit(1)
      .get();
    if (currencyQuery.empty) {
      throw new ApiError(
        400,
        "CURRENCY_NOT_CONFIGURED",
        `${currency} is not configured for withdrawals`,
      );
    }
    const threshold = currencyQuery.docs[0].data().payoutThreshold;

    validateWithdrawalRequest({
      currency,
      amount: body.amount,
      pending: creator[pendingPayoutField(currency)],
      held: creator.pendingWithdrawals?.[currency],
      threshold,
    });

    const requestRef = adminDb.collection("withdrawRequests").doc(idempotencyKey);
    const ledgerEnabled = isMoneyLedgerEnabled();
    let duplicate = false;

    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(requestRef);
      if (existing.exists) {
        if (existing.data()?.creatorId !== authUser.uid) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_KEY_CONFLICT",
            "Idempotency key belongs to another request",
          );
        }
        duplicate = true;
        return;
      }

      const freshSnap = await transaction.get(creatorRef);
      if (!freshSnap.exists) {
        throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");
      }
      const fresh = freshSnap.data() || {};
      if (fresh.verified !== true) {
        throw new ApiError(
          403,
          "CREATOR_NOT_VERIFIED",
          "Identity verification is required before requesting a withdrawal",
        );
      }
      if (!String(fresh.payoutNumber || "").trim()) {
        throw new ApiError(
          400,
          "PAYOUT_DESTINATION_MISSING",
          "Add a payout destination before requesting a withdrawal",
        );
      }

      const validated = validateWithdrawalRequest({
        currency,
        amount: body.amount,
        pending: fresh[pendingPayoutField(currency)],
        held: fresh.pendingWithdrawals?.[currency],
        threshold,
      });

      const now = new Date();
      const balanceRef = adminDb.collection("creatorBalances").doc(creatorDoc.id);
      const ledgerEntries = ledgerEnabled
        ? buildWithdrawalHoldLedger({
            requestId: idempotencyKey,
            creatorUid: authUser.uid,
            creatorHandle: creatorDoc.id,
            currency,
            amountMinor: validated.amount.amountMinor,
            source: "api/payouts/withdraw",
            createdAt: now,
          })
        : [];

      if (ledgerEnabled) {
        const balanceSnap = await transaction.get(balanceRef);
        if (!balanceSnap.exists) {
          throw new ApiError(
            409,
            "LEDGER_BALANCE_NOT_FOUND",
            "Ledger balance is missing for this creator",
          );
        }
        const available = Number(balanceSnap.data()?.available?.[currency] ?? 0);
        if (
          !Number.isSafeInteger(available) ||
          available < validated.amount.amountMinor
        ) {
          throw new WithdrawalError(
            "INSUFFICIENT_AVAILABLE_BALANCE",
            "Insufficient ledger balance",
          );
        }
      }

      transaction.set(requestRef, {
        creatorId: authUser.uid,
        creatorName: String(fresh.name || authUser.email || fresh.handle || ""),
        handle: creatorDoc.id,
        amount: validated.amountMajor,
        amountMinor: validated.amount.amountMinor,
        currency,
        status: "pending",
        held: true,
        method: String(fresh.network || "MoMo"),
        accountNumber: String(fresh.payoutNumber || ""),
        idempotencyKey,
        ledgerMode: ledgerEnabled ? "dual_write_v1" : "legacy",
        ledgerEntryIds: ledgerEntries.map((entry) => entry.id),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(creatorRef, {
        [pendingWithdrawalsField(currency)]: admin.firestore.FieldValue.increment(
          validated.amountMajor,
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (ledgerEnabled) {
        for (const entry of ledgerEntries) {
          transaction.set(
            adminDb.collection("ledgerEntries").doc(entry.id),
            ledgerEntryDocument(entry),
          );
        }

        transaction.update(balanceRef, {
          [`available.${currency}`]: admin.firestore.FieldValue.increment(
            -validated.amount.amountMinor,
          ),
          [`pendingWithdrawals.${currency}`]: admin.firestore.FieldValue.increment(
            validated.amount.amountMinor,
          ),
          version: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        requestId: idempotencyKey,
        duplicate,
        amount: body.amount,
        currency,
        ledger: ledgerEnabled,
      },
      { status: duplicate ? 200 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
