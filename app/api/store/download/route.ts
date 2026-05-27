import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const uid = searchParams.get("uid");

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const productSnap = await adminDb.collection("storeProducts").doc(productId).get();
    if (!productSnap.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productSnap.data()!;
    const fileUrl = product.fileUrl;
    if (!fileUrl) {
      return NextResponse.json({ error: "No file available for this product" }, { status: 404 });
    }

    if (uid) {
      const ordersSnap = await adminDb
        .collection("storeOrders")
        .where("buyerId", "==", uid)
        .where("productId", "==", productId)
        .get();

      if (ordersSnap.empty) {
        return NextResponse.json(
          { error: "You have not purchased this product" },
          { status: 403 },
        );
      }

      const order = ordersSnap.docs[0].data();
      const status = order.status;

      if (status === "pending") {
        return NextResponse.json(
          { error: "Your order is still pending. Please complete payment first.", orderId: ordersSnap.docs[0].id },
          { status: 403 },
        );
      }

      if (status === "cancelled") {
        return NextResponse.json(
          { error: "This order was cancelled." },
          { status: 403 },
        );
      }

      if (status !== "paid" && status !== "processing" && status !== "shipped" && status !== "delivered") {
        return NextResponse.json(
          { error: "Your order has not been completed yet." },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ fileUrl });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
