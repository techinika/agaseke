import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";

const UN_CANCELLABLE_STATUSES = new Set([
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
]);

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { orderId?: unknown };
  try {
    body = (await request.json()) as { orderId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    const orderRef = adminDb.collection("storeOrders").doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = (snap.data() || {}) as Record<string, unknown>;
    const buyerId = typeof data.buyerId === "string" ? data.buyerId : "";
    if (!buyerId || buyerId !== authUser.uid) {
      return NextResponse.json(
        { error: "You can only cancel your own orders" },
        { status: 403 },
      );
    }

    const status = String(data.status || "pending").toLowerCase();
    const paymentStatus = String(data.paymentStatus || "").toLowerCase();
    if (UN_CANCELLABLE_STATUSES.has(status) || paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Paid or fulfilled orders cannot be cancelled" },
        { status: 409 },
      );
    }

    if (status === "cancelled" || status === "canceled") {
      return NextResponse.json({ orderId, status: "cancelled" });
    }

    const nowIso = new Date().toISOString();
    await orderRef.update({
      status: "cancelled",
      cancelledAt: nowIso,
      cancelledBy: "buyer",
      updatedAt: nowIso,
    });

    // Also mark any pending transactions linked to this order as cancelled
    const txSnap = await adminDb
      .collection("transactions")
      .where("orderId", "==", orderId)
      .limit(20)
      .get();

    if (!txSnap.empty) {
      const batch = adminDb.batch();
      let hasUpdates = false;
      for (const txDoc of txSnap.docs) {
        const txData = txDoc.data() || {};
        const txStatus = String(txData.status || "pending").toLowerCase();
        if (txStatus === "pending") {
          batch.update(txDoc.ref, {
            status: "cancelled",
            cancelledAt: nowIso,
            cancelledBy: "buyer",
            updatedAt: nowIso,
          });
          hasUpdates = true;
        }
      }
      if (hasUpdates) {
        await batch.commit();
      }
    }

    return NextResponse.json({ orderId, status: "cancelled" });
  } catch (error) {
    console.error("Cancel store order error:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 },
    );
  }
}
