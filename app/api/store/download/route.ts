import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
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

      const hasAccess = ordersSnap.docs.some((d) => {
        const s = d.data().status;
        return s === "paid" || s === "processing" || s === "shipped" || s === "delivered";
      });

      if (!hasAccess) {
        return NextResponse.json({ error: "Not purchased" }, { status: 403 });
      }
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
    }

    const blob = await fileRes.blob();
    const fileName =
      product.fileName ||
      product.name?.replace(/\s+/g, "_") ||
      `download_${productId}`;

    const ext = fileName.includes(".") ? "" : ".pdf";

    return new NextResponse(blob, {
      headers: {
        "Content-Type": fileRes.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}${ext}"`,
        "Content-Length": String(blob.size),
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
