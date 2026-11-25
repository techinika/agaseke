import { NextRequest, NextResponse } from "next/server";
import { admin, adminAuth, adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;
const HANDLE_RE = /^[A-Za-z0-9_.-]{1,100}$/;

function cleanString(value: unknown, maxLen = 1000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: {
    requestId?: unknown;
    uid?: unknown;
    handle?: unknown;
    action?: unknown;
    reason?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be approve or reject" },
      { status: 400 },
    );
  }

  const requestId = cleanString(body.requestId, 128);
  const rawUid = cleanString(body.uid, 128);
  const rawHandle = cleanString(body.handle, 100);
  const rejectionReason =
    action === "reject" ? cleanString(body.reason, 1000) : "";

  if (requestId && !REQUEST_ID_RE.test(requestId)) {
    return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
  }
  if (rawHandle && !HANDLE_RE.test(rawHandle)) {
    return NextResponse.json({ error: "Invalid creator handle" }, { status: 400 });
  }
  if (!requestId && !rawUid && !rawHandle) {
    return NextResponse.json(
      { error: "requestId, uid, or handle is required" },
      { status: 400 },
    );
  }

  try {
    const isApprove = action === "approve";
    let targetRequestSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (requestId) {
      const snap = await adminDb.collection("verificationRequests").doc(requestId).get();
      if (!snap.exists) {
        return NextResponse.json(
          { error: "Verification request not found" },
          { status: 404 },
        );
      }
      targetRequestSnap = snap;
    }

    const requestData = (targetRequestSnap?.data() || {}) as Record<string, unknown>;
    let targetUid = rawUid || cleanString(requestData.uid, 128);
    let targetHandle =
      rawHandle ||
      cleanString(requestData.creatorHandle, 100) ||
      cleanString(requestData.handle, 100);

    let creatorSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (targetHandle) {
      const snap = await adminDb.collection("creators").doc(targetHandle).get();
      if (snap.exists) {
        creatorSnap = snap;
        if (!targetUid) targetUid = cleanString(snap.data()?.uid, 128);
      }
    }
    if (!creatorSnap && targetUid) {
      const byUid = await adminDb
        .collection("creators")
        .where("uid", "==", targetUid)
        .limit(1)
        .get();
      if (!byUid.empty) {
        creatorSnap = byUid.docs[0];
        targetHandle = creatorSnap.id;
      }
    }

    if (!creatorSnap && !targetRequestSnap) {
      return NextResponse.json(
        { error: "Creator or verification request not found" },
        { status: 404 },
      );
    }

    const creatorData = (creatorSnap?.data() || {}) as Record<string, unknown>;
    const creatorName =
      cleanString(creatorData.name, 200) ||
      cleanString(requestData.creatorName, 200) ||
      cleanString(requestData.accountName, 200) ||
      targetHandle ||
      "Creator";

    const pendingSnap = targetUid
      ? await adminDb
          .collection("verificationRequests")
          .where("uid", "==", targetUid)
          .where("status", "==", "pending")
          .get()
      : null;

    const fallbackPendingDoc = !targetRequestSnap?.exists ? pendingSnap?.docs[0] ?? null : null;
    const effectiveRequestData = (
      targetRequestSnap?.exists
        ? requestData
        : (fallbackPendingDoc?.data() || {})
    ) as Record<string, unknown>;

    const resolvedCreatorName =
      cleanString(creatorData.name, 200) ||
      cleanString(effectiveRequestData.creatorName, 200) ||
      cleanString(effectiveRequestData.accountName, 200) ||
      targetHandle ||
      creatorName;

    const batch = adminDb.batch();
    const requestRefsToUpdate = new Map<string, FirebaseFirestore.DocumentReference>();
    if (targetRequestSnap?.exists && requestData.status === "pending") {
      requestRefsToUpdate.set(targetRequestSnap.id, targetRequestSnap.ref);
    }
    if (pendingSnap) {
      for (const docSnap of pendingSnap.docs) {
        requestRefsToUpdate.set(docSnap.id, docSnap.ref);
      }
    }

    const reviewTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const nextStatus = isApprove ? "approved" : "rejected";

    for (const ref of requestRefsToUpdate.values()) {
      batch.update(ref, {
        status: nextStatus,
        reviewedBy: authUser.uid,
        reviewedAt: reviewTimestamp,
        updatedAt: reviewTimestamp,
        rejectionReason,
        ...(targetHandle ? { creatorHandle: targetHandle, handle: targetHandle } : {}),
        ...(resolvedCreatorName ? { creatorName: resolvedCreatorName } : {}),
      });
    }

    if (creatorSnap?.exists) {
      const creatorUpdates: Record<string, unknown> = {
        verified: isApprove,
        verificationStatus: nextStatus,
        verificationSubmitted: true,
        verificationReviewedBy: authUser.uid,
        verificationReviewedAt: reviewTimestamp,
        verificationRejectionReason: rejectionReason,
        updatedAt: reviewTimestamp,
      };

      const resolvedRequestId = requestId || targetRequestSnap?.id || fallbackPendingDoc?.id || "";
      if (resolvedRequestId) {
        creatorUpdates.verificationRequestId = resolvedRequestId;
      }

      if (isApprove) {
        const reqPref = cleanString(effectiveRequestData.payoutPreference, 40).toLowerCase();
        const reqAccountNum = cleanString(effectiveRequestData.accountNumber, 80);
        const reqAccountName = cleanString(effectiveRequestData.accountName, 200);
        const reqBank = cleanString(effectiveRequestData.bankName, 120);
        const reqSwift = cleanString(effectiveRequestData.swiftCode, 40);

        if (reqPref) {
          creatorUpdates.payoutPreference = reqPref;
          creatorUpdates.verifiedPayoutPreference = reqPref;
        }
        if (reqAccountNum) {
          creatorUpdates.payoutNumber = reqAccountNum;
          creatorUpdates.verifiedAccountNumber = reqAccountNum;
        }
        if (reqAccountName) {
          creatorUpdates.verifiedAccountName = reqAccountName;
        }
        if (reqBank) {
          creatorUpdates.network = reqBank;
          creatorUpdates.verifiedBankName = reqBank;
        }
        if (reqSwift) {
          creatorUpdates.verifiedSwiftCode = reqSwift;
        }
      }

      batch.update(creatorSnap.ref, creatorUpdates);
    }

    let creatorEmail = cleanString(requestData.email, 254);
    if (!creatorEmail && targetUid) {
      try {
        const profileSnap = await adminDb.collection("profiles").doc(targetUid).get();
        creatorEmail = cleanString(profileSnap.data()?.email, 254);
      } catch {
        // ignore profile lookup error
      }
      if (!creatorEmail) {
        try {
          const userRecord = await adminAuth.getUser(targetUid);
          creatorEmail = userRecord.email || "";
        } catch {
          // ignore auth lookup error
        }
      }
    }

    if (targetUid) {
      const notifRef = adminDb.collection("notifications").doc();
      batch.set(notifRef, {
        userId: targetUid,
        type: isApprove ? "verification_approved" : "verification_rejected",
        title: isApprove ? "Verification Approved" : "Verification Needs Attention",
        message: isApprove
          ? "Your creator account is verified! Payouts are now unlocked."
          : rejectionReason
            ? `Your verification request was not approved: ${rejectionReason}`
            : "Your verification request was not approved. Please review your details and resubmit.",
        link: "/creator/settings?tab=verification",
        read: false,
        createdAt: reviewTimestamp,
      });
    }

    const logRef = adminDb.collection("activityLogs").doc();
    batch.set(logRef, {
      level: isApprove ? "success" : "warning",
      category: "verification",
      message: `Verification ${action}: ${creatorName}${targetHandle ? ` (@${targetHandle})` : ""}`,
      creatorId: targetUid || null,
      creatorHandle: targetHandle || null,
      actorUid: authUser.uid,
      actorEmail: authUser.email ?? null,
      requestId: requestId || null,
      updatedRequestCount: requestRefsToUpdate.size,
      createdAt: reviewTimestamp,
    });

    await batch.commit();

    return NextResponse.json({
      ok: true,
      action,
      verified: isApprove,
      verificationStatus: nextStatus,
      requestId: requestId || targetRequestSnap?.id || null,
      updatedRequests: [...requestRefsToUpdate.keys()],
      uid: targetUid,
      handle: targetHandle,
      creatorName,
      email: creatorEmail,
    });
  } catch (error) {
    console.error("Admin verification review failed:", error);
    return NextResponse.json(
      { error: "Failed to review verification request" },
      { status: 500 },
    );
  }
}
