import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/db/firebaseAdmin";
import { requireAdmin } from "@/lib/authMiddleware";
import { isAllowedMediaUrl } from "@/lib/mediaAccess";
import { isBareMediaKey } from "@/lib/mediaKey";
import { mediaTtlSeconds, signMediaKey } from "@/lib/mediaSigning";
import { inferDocumentKind } from "@/lib/verificationSchema";

const UPLOAD_WORKER_URL =
  process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL || "http://localhost:8787";

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { requestId?: unknown; uid?: unknown };
  try {
    body = (await request.json()) as { requestId?: unknown; uid?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";

  if (!requestId && !uid) {
    return NextResponse.json(
      { error: "requestId or uid is required" },
      { status: 400 },
    );
  }
  if (requestId && !REQUEST_ID_RE.test(requestId)) {
    return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
  }

  try {
    let data: Record<string, unknown> | null = null;
    let resolvedRequestId = requestId;

    if (requestId) {
      const snap = await adminDb.collection("verificationRequests").doc(requestId).get();
      if (snap.exists) {
        data = (snap.data() || {}) as Record<string, unknown>;
      }
    }

    if (!data && uid) {
      const snap = await adminDb
        .collection("verificationRequests")
        .where("uid", "==", uid)
        .limit(10)
        .get();
      if (!snap.empty) {
        const sorted = [...snap.docs].sort((a, b) => {
          const aTs = a.data()?.createdAt?.toMillis?.() ?? 0;
          const bTs = b.data()?.createdAt?.toMillis?.() ?? 0;
          return bTs - aTs;
        });
        resolvedRequestId = sorted[0].id;
        data = (sorted[0].data() || {}) as Record<string, unknown>;
      }
    }

    if (!data) {
      return NextResponse.json({
        ok: true,
        hasDocument: false,
        url: null,
        kind: "none",
      });
    }

    const rawKey =
      typeof data.idDocumentKey === "string" && data.idDocumentKey.trim()
        ? data.idDocumentKey.trim()
        : "";
    const rawUrl =
      typeof data.idDocumentUrl === "string" && data.idDocumentUrl.trim()
        ? data.idDocumentUrl.trim()
        : "";
    const rawValue = rawKey || rawUrl;

    if (!rawValue) {
      return NextResponse.json({
        ok: true,
        requestId: resolvedRequestId,
        hasDocument: false,
        url: null,
        kind: "none",
      });
    }

    const mimeType =
      typeof data.idDocumentMimeType === "string" ? data.idDocumentMimeType : "";
    const fileName =
      typeof data.idDocumentName === "string" ? data.idDocumentName : "";
    const kind = inferDocumentKind(rawValue, mimeType, fileName);

    if (isBareMediaKey(rawValue)) {
      try {
        const exp = Math.floor(Date.now() / 1000) + mediaTtlSeconds();
        const sig = signMediaKey(rawValue, exp);
        const signedUrl = `${UPLOAD_WORKER_URL.replace(/\/$/, "")}/private/${encodeURIComponent(rawValue)}?exp=${exp}&sig=${sig}`;
        return NextResponse.json(
          {
            ok: true,
            requestId: resolvedRequestId,
            hasDocument: true,
            url: signedUrl,
            kind,
            fileName,
            mimeType,
            visibility: "private",
            expiresAt: new Date(exp * 1000).toISOString(),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (err) {
        console.error("KYC private document signing failed:", err);
        return NextResponse.json(
          { error: "Private document signing is not configured" },
          { status: 503 },
        );
      }
    }

    if (!isAllowedMediaUrl(rawValue)) {
      return NextResponse.json(
        { error: "Document host is not allowed" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        requestId: resolvedRequestId,
        hasDocument: true,
        url: rawValue,
        kind,
        fileName,
        mimeType,
        visibility: "public",
        expiresAt: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to resolve KYC document:", error);
    return NextResponse.json(
      { error: "Unable to load verification document" },
      { status: 500 },
    );
  }
}
