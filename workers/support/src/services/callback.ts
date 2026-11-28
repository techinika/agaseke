import type { Env } from "../types";
import {
  extractFirestoreDocument,
  firestoreApplyPayment,
  firestoreGet,
  firestorePatch,
} from "../firestore";
import { logActivity } from "../logger";
import { createNotification } from "../adminNotifications";
import { currencyNumberField, roundCurrencyAmount } from "../money/amount";
import { buildPaymentLedger, isMoneyLedgerEnabled, ledgerMarkerFields } from "../money/ledger";

export async function handleSupportCallback(
  env: Env,
  body: Record<string, unknown>
): Promise<{ received: boolean }> {
  const { txData, totalAmount, paymentRef, paymentMethod, platformShare, creatorShare, referralShare } = body as {
    txData: Record<string, unknown>;
    totalAmount: number;
    paymentRef: string;
    paymentMethod: "momo" | "card";
    platformShare: number;
    creatorShare: number;
    referralShare: number;
  };

  const currency = txData.currency as string;
  if (!currency) {
    throw new Error("Support callback missing currency");
  }
  const payoutField = currency === "RWF" ? "pendingPayout" : `pendingPayout${currency}`;
  const earningsField = currency === "RWF" ? "totalEarnings" : `totalEarnings${currency}`;
  const platformAmount = roundCurrencyAmount(platformShare, currency);
  const creatorAmount = roundCurrencyAmount(creatorShare, currency);
  const referralAmount = roundCurrencyAmount(referralShare, currency);
  const creditedTotal = roundCurrencyAmount(totalAmount, currency);

  const now = new Date().toISOString();
  const safeRef = paymentRef.replace(/[^A-Za-z0-9_-]/g, "_");
  const includeReferral = !!txData.includeReferral;

  const documents: Array<{ path: string; fields: Record<string, unknown> }> = [
    {
      path: `platformIncome/${safeRef}_platform`,
      fields: {
        amount: currencyNumberField(platformAmount, currency),
        currency: { stringValue: currency },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: paymentMethod === "momo" ? "flat_fee" : "card_payment_fee" },
        createdAt: { timestampValue: now },
      },
    },
    {
      path: `creatorIncome/${safeRef}_creator`,
      fields: {
        creatorUid: { stringValue: txData.creatorUid as string },
        amount: currencyNumberField(creatorAmount, currency),
        currency: { stringValue: currency },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "support" },
        createdAt: { timestampValue: now },
      },
    },
  ];

  const increments: Array<{ path: string; fields: Record<string, number> }> = [
    {
      path: `creators/${txData.creatorId}`,
      fields: {
        [earningsField]: creatorAmount,
        totalSupporters: 1,
        [payoutField]: creatorAmount,
      },
    },
  ];

  const supporterId = txData.supporterId as string | undefined;
  const isSignedInSupporter = Boolean(supporterId && supporterId !== "anonymous");
  const isAnonymous = !isSignedInSupporter || Boolean(txData.anonymous);
  const rawSupporterName = String(txData.supporterName || txData.buyerName || "").trim();
  const rawMessage = String(txData.message || "").trim();

  documents.push({
    path: `supportedCreators/${safeRef}_${isSignedInSupporter ? "support" : "anon"}`,
    fields: {
      creatorId: { stringValue: txData.creatorId as string },
      amount: currencyNumberField(creditedTotal, currency),
      supporterId: isSignedInSupporter
        ? { stringValue: supporterId as string }
        : { nullValue: null },
      supporterPhoneNumber: { stringValue: (txData.phone as string) || "" },
      ...(rawSupporterName && !isAnonymous
        ? { supporterName: { stringValue: rawSupporterName } }
        : {}),
      anonymous: { booleanValue: isAnonymous },
      ...(rawMessage ? { message: { stringValue: rawMessage } } : {}),
      txRef: { stringValue: paymentRef },
      currency: { stringValue: currency },
      createdAt: { timestampValue: now },
    },
  });

  if (includeReferral && txData.referralUid && referralShare > 0) {
    documents.push({
      path: `creatorIncome/${safeRef}_referral`,
      fields: {
        creatorUid: { stringValue: txData.referralUid as string },
        amount: currencyNumberField(referralAmount, currency),
        currency: { stringValue: currency },
        txRef: { stringValue: paymentRef },
        reason: { stringValue: "referral_commission" },
        createdAt: { timestampValue: now },
      },
    });

    increments.push({
      path: `creators/${txData.referralId}`,
      fields: { [earningsField]: referralAmount, [payoutField]: referralAmount },
    });
  }

  if (supporterId && supporterId !== "anonymous") {
    increments.push({
      path: `profiles/${supporterId}`,
      fields: { totalSupport: creditedTotal, totalSupportedCreators: 1 },
    });
  }

  const ledger = isMoneyLedgerEnabled(env)
    ? buildPaymentLedger({
        paymentRef,
        source: "support",
        currency,
        totalAmount: creditedTotal,
        creatorUid: txData.creatorUid as string,
        creatorHandle: txData.creatorId as string,
        creatorShare: creatorAmount,
        platformShare: platformAmount,
        referralShare:
          includeReferral && txData.referralUid && referralAmount > 0
            ? referralAmount
            : 0,
        referralUid:
          includeReferral && txData.referralUid
            ? (txData.referralUid as string)
            : undefined,
        referralHandle:
          includeReferral && txData.referralId
            ? (txData.referralId as string)
            : undefined,
        createdAt: now,
      })
    : undefined;

  const credit = await firestoreApplyPayment(
    env,
    paymentRef,
    increments,
    {
      txRef: { stringValue: paymentRef },
      worker: { stringValue: "support" },
      creatorId: { stringValue: txData.creatorId as string },
      creatorShare: currencyNumberField(creatorAmount, currency),
      totalAmount: currencyNumberField(creditedTotal, currency),
      currency: { stringValue: currency },
      status: { stringValue: "applied" },
      appliedAt: { timestampValue: now },
      ...(ledger ? ledgerMarkerFields(ledger) : {}),
    },
    { documents, ledger },
  );

  if (credit === "duplicate") {
    await logActivity(env, "warn", "support", `Support callback duplicate for ref=${paymentRef}`, {
      txRef: paymentRef,
      creatorId: txData.creatorId,
      creatorShare,
    });
    return { received: true };
  }

  if (credit !== "applied") {
    await logActivity(env, "error", "support", `Support callback commit failed for ref=${paymentRef}`, {
      txRef: paymentRef,
      creatorId: txData.creatorId,
      creatorShare,
    });
    throw new Error(`Support payment credit commit failed for ref=${paymentRef}`);
  }

  if (supporterId && supporterId !== "anonymous") {
    await firestorePatch(env, `creators/${txData.creatorId}`, {
      [`supporterUids.${supporterId}`]: { booleanValue: true },
    });
  }

  if (txData.creatorUid) {
    await createNotification(env, {
      userId: txData.creatorUid as string,
      type: "support_received",
      title: "New Support Received!",
      message: `You received ${creditedTotal.toLocaleString()} ${currency} in support${isAnonymous ? " from an anonymous supporter" : ""}`,
      metadata: { txRef: paymentRef, amount: creditedTotal, creatorShare: creatorAmount },
      link: "/creator/supporters",
      actorId: isAnonymous ? undefined : supporterId,
    });
  }

  if (env.COMMS_WORKER_URL && env.INTERNAL_AUTH_SECRET) {
    try {
      let creatorEmail =
        typeof txData.creatorEmail === "string" && txData.creatorEmail.trim()
          ? txData.creatorEmail.trim()
          : "";
      if (!creatorEmail && txData.creatorUid) {
        const profileDoc = await firestoreGet(env, `profiles/${String(txData.creatorUid)}`);
        const profileFields = (profileDoc?.fields as Record<string, unknown> | undefined) || undefined;
        const parsedProfile = profileFields ? extractFirestoreDocument(profileFields) : null;
        if (typeof parsedProfile?.email === "string" && parsedProfile.email.trim()) {
          creatorEmail = parsedProfile.email.trim();
        }
      }
      if (!creatorEmail && txData.creatorId) {
        const creatorDoc = await firestoreGet(env, `creators/${String(txData.creatorId)}`);
        const creatorFields = (creatorDoc?.fields as Record<string, unknown> | undefined) || undefined;
        const parsedCreator = creatorFields ? extractFirestoreDocument(creatorFields) : null;
        if (typeof parsedCreator?.email === "string" && parsedCreator.email.trim()) {
          creatorEmail = parsedCreator.email.trim();
        }
      }

      if (creatorEmail) {
        const emailRes = await fetch(`${env.COMMS_WORKER_URL}/api/emails/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Auth": env.INTERNAL_AUTH_SECRET,
          },
          body: JSON.stringify({
            purpose: "support_received",
            data: {
              creatorEmail,
              amount: `${creditedTotal.toLocaleString()} ${currency}`,
              supporterName: isAnonymous
                ? "An anonymous supporter"
                : rawSupporterName || "A supporter",
              message: rawMessage,
            },
          }),
        });
        if (!emailRes.ok) {
          const text = await emailRes.text().catch(() => "");
          await logActivity(env, "warn", "support", `Support email returned ${emailRes.status}`, {
            txRef: paymentRef,
            status: emailRes.status,
            detail: text.slice(0, 300),
          });
        }
      } else {
        await logActivity(env, "warn", "support", `Skipped support email: creatorEmail missing`, {
          txRef: paymentRef,
          creatorId: txData.creatorId,
        });
      }
    } catch (emailErr) {
      await logActivity(env, "warn", "support", `Failed to send support email for ref=${paymentRef}`, {
        txRef: paymentRef,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }
  }

  await logActivity(env, "info", "support", `Support payment processed for ref=${paymentRef}`, {
    txRef: paymentRef,
    amount: creditedTotal,
    creatorShare: creatorAmount,
    paymentMethod,
    supporter: supporterId || "anonymous",
  });

  return { received: true };
}
