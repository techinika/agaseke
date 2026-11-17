import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";
import { FxError, MoneyError, fromMajor } from "@/lib/money";
import { parsePayoutCurrency, type PayoutCurrency } from "@/lib/payouts/currency";
import {
  loadFxSnapshot,
  planWithdrawalConversion,
  type WithdrawalConversionPlan,
} from "@/lib/payouts/withdrawalConversion";

class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof FxError || error instanceof MoneyError) {
    const status = (error as any).code === "INSUFFICIENT_AVAILABLE_BALANCE" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("Withdrawal quote failed:", error);
  return NextResponse.json({ error: "Failed to create withdrawal quote", code: "INTERNAL" }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { amount?: unknown; payoutCurrency?: unknown; currency?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let payoutCurrency: PayoutCurrency;
  try {
    payoutCurrency = parsePayoutCurrency(body.payoutCurrency ?? body.currency);
  } catch {
    return NextResponse.json({ error: "Unsupported payout currency", code: "UNSUPPORTED_CURRENCY" }, { status: 400 });
  }

  try {
    const creatorQuery = await adminDb.collection("creators").where("uid", "==", authUser.uid).limit(1).get();
    if (creatorQuery.empty) throw new ApiError(404, "CREATOR_NOT_FOUND", "Creator profile not found");
    const creatorDoc = creatorQuery.docs[0];
    const creator = creatorDoc.data() as Record<string, unknown>;

    if (creator.verified !== true) {
      throw new ApiError(403, "CREATOR_NOT_VERIFIED", "Identity verification is required before requesting a withdrawal");
    }

    const requestedAmount = fromMajor(payoutCurrency, body.amount as any);
    if (requestedAmount.amountMinor <= 0) {
      throw new ApiError(400, "INVALID_AMOUNT", "Amount must be greater than zero");
    }

    const held = creator.pendingWithdrawals && typeof creator.pendingWithdrawals === "object"
      ? (creator.pendingWithdrawals as Record<string, unknown>) : {};

    const availableMinorByCurrency: Partial<Record<PayoutCurrency, number>> = {};
    for (const code of Object.keys({ ...held }) as PayoutCurrency[]) {
      // collect known currencies from held/pending fields below
    }
    // derive from creator pending/held fields
    const currencies = new Set<PayoutCurrency>([payoutCurrency]);
    for (const key of Object.keys(creator)) {
      const m = key.match(/^pendingPayout([A-Z]{3})$/);
      if (m) currencies.add(m[1] as PayoutCurrency);
    }
    if (creator.pendingPayout !== undefined) currencies.add("RWF" as PayoutCurrency);
    for (const [k] of Object.entries(held)) currencies.add(k as PayoutCurrency);

    for (const code of currencies) {
      try {
        const pendingMajor = code === "RWF" ? creator.pendingPayout : creator[`pendingPayout${code}`];
        const heldMajor = (held as any)[code];
        const pendingMinor = pendingMajor === undefined || pendingMajor === null || pendingMajor === ""
          ? 0 : fromMajor(code, pendingMajor as any).amountMinor;
        const heldMinor = heldMajor === undefined || heldMajor === null || heldMajor === ""
          ? 0 : fromMajor(code, heldMajor as any).amountMinor;
        const avail = pendingMinor - heldMinor;
        if (avail > 0) availableMinorByCurrency[code] = avail;
      } catch {
        // ignore invalid legacy field
      }
    }

    const snapshot = await loadFxSnapshot();
    const spreadBps = Math.max(0, Math.min(9999, Math.trunc(Number(process.env.FX_WITHDRAWAL_SPREAD_BPS || process.env.FX_SPREAD_BPS || 150))));

    const plan = planWithdrawalConversion({
      creatorUid: authUser.uid,
      creatorHandle: creatorDoc.id,
      payoutCurrency,
      requestedPayoutAmountMinor: requestedAmount.amountMinor,
      availableMinorByCurrency,
      snapshot,
      spreadBps,
    });

    // persist quote for atomic consumption
    await adminDb.collection("withdrawalQuotes").doc(plan.id).set({
      ...plan,
      status: "active",
      createdAtServer: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, quote: plan });
  } catch (error) {
    return errorResponse(error);
  }
}
