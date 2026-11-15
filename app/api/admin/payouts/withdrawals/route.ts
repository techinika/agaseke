import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import { fromMajor, MoneyError, toMajor } from "@/lib/money";
import {
  parsePayoutCurrency,
  pendingPayoutField,
  pendingWithdrawalsField,
} from "@/lib/payouts/currency";
import {
  buildWithdrawalReleaseLedger,
  buildWithdrawalSettlementLedger,
  isMoneyLedgerEnabled,
  ledgerEntryDocument,
} from "@/lib/payouts/withdrawalLedger";

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
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof MoneyError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }

  console.error("Admin withdrawal action failed:", error);
  return NextResponse.json(
    { error: "Failed to update withdrawal request", code: "INTERNAL" },
    { status: 500 },
  );
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
    return NextResponse.json(
      { error: "A valid requestId is required", code: "INVALID_REQUEST_ID" },
      { status: 400 },
    );
  }

  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be approve or reject", code: "INVALID_ACTION" },
      { status: 400 },
    );
  }

  const ledgerEnabled = isMoneyLedgerEnabled();

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const requestRef = adminDb.collection("withdrawRequests").doc(requestId);
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists) {
        throw new ApiError(404, "WITHDRAWAL_NOT_FOUND", "Withdrawal request not found");
      }

      const withdrawal = requestSnap.data() || {};
      if (withdrawal.status !== "pending") {
        throw new ApiError(
          409,
          "WITHDRAWAL_NOT_PENDING",
          "Withdrawal request is no longer pending",
        );
      }

      let currency;
      try {
        currency = parsePayoutCurrency(withdrawal.currency);
      } catch {
        throw new ApiError(
          400,
          "UNSUPPORTED_CURRENCY",
          "Withdrawal request has an unsupported currency",
        );
      }

      const amount = fromMajor(currency, withdrawal.amount);
      if (amount.amountMinor <= 0) {
        throw new ApiError(
          400,
          "INVALID_AMOUNT",
          "Withdrawal request has an invalid amount",
        );
      }

      const creatorHandle = String(withdrawal.handle || "").trim();
      if (!creatorHandle) {
        throw new ApiError(
          400,
          "MISSING_CREATOR_HANDLE",
          "Withdrawal request has no creator handle",
        );
      }

      const creatorRef = adminDb.collection("creators").doc(creatorHandle);
      const creatorSnap = await transaction.get(creatorRef);
      if (!creatorSnap.exists) {
        throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");
      }

      const held = withdrawal.held === true;
      if (ledgerEnabled && action === "approve" && !held) {
        throw new ApiError(
          409,
          "LEGACY_WITHDRAWAL",
          "Ledger settlement requires a held withdrawal; migrate this request first",
        );
      }

      const balanceRef = adminDb.collection("creatorBalances").doc(creatorHandle);
      let balanceSnap: FirebaseFirestore.DocumentSnapshot | null = null;
      if (ledgerEnabled) {
        balanceSnap = await transaction.get(balanceRef);
        if (!balanceSnap.exists) {
          throw new ApiError(
            409,
            "LEDGER_BALANCE_NOT_FOUND",
            "Ledger balance is missing for this creator",
          );
        }
      }

      if (ledgerEnabled && held) {
        const pending = Number(balanceSnap?.data()?.pendingWithdrawals?.[currency] ?? 0);
        if (!Number.isSafeInteger(pending) || pending < amount.amountMinor) {
          throw new ApiError(
            409,
            "LEDGER_BALANCE_STATE",
            "Held withdrawal balance does not match the ledger",
          );
        }
      }

      const now = new Date();
      const method = String(body.method || withdrawal.method || "MoMo").trim();
      const accountNumber = String(
        body.accountNumber || withdrawal.accountNumber || "",
      ).trim();
      const creatorUid = String(withdrawal.creatorId || "");
      const amountMajor = toMajor(amount);

      if (action === "approve") {
        const payoutRef = adminDb.collection("payouts").doc();
        const ledgerEntries = ledgerEnabled
          ? buildWithdrawalSettlementLedger({
              requestId,
              creatorUid,
              creatorHandle,
              currency,
              amountMinor: amount.amountMinor,
              source: "api/admin/payouts/withdrawals",
              createdAt: now,
            })
          : [];

        transaction.update(requestRef, {
          status: "completed",
          held: false,
          method,
          accountNumber,
          reviewedBy: authUser.uid,
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          holdReleasedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(ledgerEnabled
            ? {
                ledgerMode: "dual_write_v1",
                ledgerEntryIds: ledgerEntries.map((entry) => entry.id),
              }
            : {}),
        });

        transaction.set(payoutRef, {
          withdrawalRequestId: requestId,
          creatorId: creatorHandle,
          creatorUid,
          amount: amountMajor,
          amountMinor: amount.amountMinor,
          currency,
          status: "completed",
          approvedBy: authUser.uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          method,
          accountNumber,
          ledgerMode: ledgerEnabled ? "dual_write_v1" : "legacy",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(creatorRef, {
          [pendingPayoutField(currency)]:
            admin.firestore.FieldValue.increment(-amountMajor),
          ...(held
            ? {
                [pendingWithdrawalsField(currency)]:
                  admin.firestore.FieldValue.increment(-amountMajor),
              }
            : {}),
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
            [`pendingWithdrawals.${currency}`]: admin.firestore.FieldValue.increment(
              -amount.amountMinor,
            ),
            [`lifetimeWithdrawn.${currency}`]: admin.firestore.FieldValue.increment(
              amount.amountMinor,
            ),
            version: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return {
          action,
          requestId,
          payoutId: payoutRef.id,
          creatorId: creatorUid,
          creatorName: String(withdrawal.creatorName || creatorSnap.data()?.name || ""),
          handle: creatorHandle,
          amount: amountMajor,
          currency,
          method,
          accountNumber,
        };
      }

      const releaseEntries =
        ledgerEnabled && held
          ? buildWithdrawalReleaseLedger({
              requestId,
              creatorUid,
              creatorHandle,
              currency,
              amountMinor: amount.amountMinor,
              source: "api/admin/payouts/withdrawals",
              createdAt: now,
            })
          : [];

      transaction.update(requestRef, {
        status: "rejected",
        held: false,
        method,
        accountNumber,
        reviewedBy: authUser.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        holdReleasedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(releaseEntries.length > 0
          ? {
              ledgerMode: "dual_write_v1",
              ledgerEntryIds: releaseEntries.map((entry) => entry.id),
            }
          : {}),
      });

      if (held) {
        transaction.update(creatorRef, {
          [pendingWithdrawalsField(currency)]:
            admin.firestore.FieldValue.increment(-amountMajor),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (ledgerEnabled) {
          for (const entry of releaseEntries) {
            transaction.set(
              adminDb.collection("ledgerEntries").doc(entry.id),
              ledgerEntryDocument(entry),
            );
          }

          transaction.update(balanceRef, {
            [`pendingWithdrawals.${currency}`]: admin.firestore.FieldValue.increment(
              -amount.amountMinor,
            ),
            [`available.${currency}`]: admin.firestore.FieldValue.increment(
              amount.amountMinor,
            ),
            version: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return {
        action,
        requestId,
        creatorId: creatorUid,
        creatorName: String(withdrawal.creatorName || creatorSnap.data()?.name || ""),
        handle: creatorHandle,
        amount: amountMajor,
        currency,
        method,
        accountNumber,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
