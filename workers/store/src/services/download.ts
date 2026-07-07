import type { Env } from "../types";
import { firestoreRunQuery, firestoreGet, extractFirestoreDocument } from "../firestore";
import { logActivity } from "../logger";

export async function handleDownload(
  env: Env,
  productId: string,
  uid: string
): Promise<Response> {
  const productSnap = await firestoreGet(env, `storeProducts/${productId}`);
  if (!productSnap) {
    return new Response(JSON.stringify({ error: "Product not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const product = extractFirestoreDocument(productSnap.fields as Record<string, unknown>);
  if (product.type === "physical") {
    return new Response(JSON.stringify({ error: "Physical products cannot be downloaded" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const orders = await firestoreRunQuery(env, "storeOrders", [
    { fieldPath: "productId", op: "EQUAL", value: productId },
    { fieldPath: "buyerId", op: "EQUAL", value: uid },
    { fieldPath: "status", op: "EQUAL", value: "paid" },
  ]);

  if (!orders || orders.length === 0) {
    await logActivity(env, "warn", "store", `Download denied: no paid order for product=${productId}`, {
      uid,
      productId,
    });
    return new Response(JSON.stringify({ error: "Purchase required. You have not paid for this product." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const fileUrl = product.fileUrl as string | undefined;
  const publicId = product.publicId as string | undefined;
  const fileName = (product.fileName as string) || (product.name as string) || "download";

  let storagePath = "";
  if (publicId) {
    storagePath = publicId;
  } else if (fileUrl) {
    const urlObj = new URL(fileUrl);
    storagePath = urlObj.pathname.replace(/^\//, "");
  }

  if (!storagePath) {
    return new Response(JSON.stringify({ error: "Product file not found on storage" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const object = await env.UPLOADS_BUCKET.get(storagePath);
    if (!object) {
      return new Response(JSON.stringify({ error: "Product file not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const contentType = object.httpMetadata?.contentType || object.httpMetadata?.contentType || "application/octet-stream";
    const disposition = `attachment; filename="${fileName}"`;

    await logActivity(env, "info", "store", `Download served for product=${productId}`, {
      uid,
      productId,
      fileName,
    });

    return new Response(object.body, {
      headers: {
        "content-type": contentType,
        "content-disposition": disposition,
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    await logActivity(env, "error", "store", `Download failed for product=${productId}`, {
      uid,
      productId,
      error: String(err),
    });
    return new Response(JSON.stringify({ error: "Download failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
