import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

describe("100 MB video upload & multipart chunking", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("exposes 100 MB video max limit and rejects files exceeding limits upfront", async () => {
    vi.doMock("@/db/firebase", () => ({
      auth: { currentUser: { getIdToken: async () => "tok" } },
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { uploadFile, MAX_VIDEO_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES } = await import(
      "@/lib/uploadService"
    );

    expect(MAX_VIDEO_SIZE_BYTES).toBe(100 * 1024 * 1024);

    const oversizedVideo = {
      name: "clip.mp4",
      type: "video/mp4",
      size: MAX_VIDEO_SIZE_BYTES + 1,
    } as File;
    await expect(uploadFile(oversizedVideo, "post_video", "alice")).rejects.toThrow(/100\s*MB/i);

    const oversizedImage = {
      name: "photo.png",
      type: "image/png",
      size: MAX_IMAGE_SIZE_BYTES + 1,
    } as File;
    await expect(uploadFile(oversizedImage, "post_image", "alice")).rejects.toThrow(/20\s*MB/i);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.doUnmock("@/db/firebase");
  });

  it("uploads videos larger than 15 MB via multipart endpoints and reports progress", async () => {
    vi.doMock("@/db/firebase", () => ({
      auth: { currentUser: { getIdToken: async () => "tok-upload" } },
    }));

    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith("/multipart/init")) {
          return new Response(
            JSON.stringify({ uploadId: "up-1", key: "videos/alice/clip.mp4" }),
            { status: 200 },
          );
        }
        if (url.includes("/multipart/part")) {
          const partNum = Number(new URL(url).searchParams.get("partNumber") || "1");
          return new Response(
            JSON.stringify({ partNumber: partNum, etag: `etag-${partNum}` }),
            { status: 200 },
          );
        }
        if (url.endsWith("/multipart/complete")) {
          return new Response(
            JSON.stringify({
              url: "https://cdn.agaseke.me/videos/alice/clip.mp4",
              key: "videos/alice/clip.mp4",
              visibility: "public",
              publicId: "videos/alice/clip.mp4",
              assetType: "post_video",
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const { uploadFile, MULTIPART_THRESHOLD_BYTES } = await import("@/lib/uploadService");
    const size = MULTIPART_THRESHOLD_BYTES + 2 * 1024 * 1024; // 17 MB -> 3 parts (8 + 8 + 1)
    const videoFile = new File([new Uint8Array(size)], "demo.mp4", { type: "video/mp4" });
    const progressEvents: number[] = [];

    const result = await uploadFile(
      videoFile,
      "post_video",
      "alice",
      undefined,
      "public",
      {
        onProgress: (p) => progressEvents.push(p),
      },
    );

    expect(result.url).toBe("https://cdn.agaseke.me/videos/alice/clip.mp4");
    expect(calls[0]).toMatch(/\/multipart\/init$/);
    expect(calls.filter((u) => u.includes("/multipart/part"))).toHaveLength(3);
    expect(calls[calls.length - 1]).toMatch(/\/multipart\/complete$/);
    expect(progressEvents[0]).toBe(0);
    expect(progressEvents[progressEvents.length - 1]).toBe(100);

    vi.doUnmock("@/db/firebase");
  });

  it("aborts multipart upload if a chunk upload fails", async () => {
    vi.doMock("@/db/firebase", () => ({
      auth: { currentUser: { getIdToken: async () => "tok-upload" } },
    }));

    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith("/multipart/init")) {
          return new Response(
            JSON.stringify({ uploadId: "up-abort", key: "videos/alice/bad.mp4" }),
            { status: 200 },
          );
        }
        if (url.includes("/multipart/part")) {
          return new Response(JSON.stringify({ error: "Part failed" }), { status: 500 });
        }
        if (url.endsWith("/multipart/abort")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const { uploadFile, MULTIPART_THRESHOLD_BYTES } = await import("@/lib/uploadService");
    const size = MULTIPART_THRESHOLD_BYTES + 1024 * 1024;
    const videoFile = new File([new Uint8Array(size)], "bad.mp4", { type: "video/mp4" });

    await expect(uploadFile(videoFile, "post_video", "alice")).rejects.toThrow(/Part failed/);
    expect(calls.some((u) => u.endsWith("/multipart/abort"))).toBe(true);

    vi.doUnmock("@/db/firebase");
  });
});

describe("Transaction ownership, cancel fallback, and 15-minute stalled recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("allows cancelling own transaction when supporterId is 'anonymous' and initiatedBy matches uid", async () => {
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const docs: Record<string, Record<string, unknown>> = {
      "AGS-MOMO-ANON": {
        ref: "AGS-MOMO-ANON",
        status: "pending",
        supporterId: "anonymous",
        initiatedBy: "uid-owner",
        createdAt: new Date().toISOString(),
      },
      "AGS-EMAIL-ONLY": {
        ref: "AGS-EMAIL-ONLY",
        status: "pending",
        supporterId: "anonymous",
        initiatedBy: "anonymous",
        buyerEmail: "Owner@Example.com",
        createdAt: new Date().toISOString(),
      },
    };

    const mockDb = {
      collection: () => ({
        doc: (id: string) => ({
          get: async () =>
            docs[id]
              ? { exists: true, id, data: () => docs[id] }
              : { exists: false },
          update: async (data: Record<string, unknown>) => {
            updates.push({ id, data });
          },
        }),
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      }),
    };

    vi.doMock("@/db/firebaseAdmin", () => ({ adminDb: mockDb }));
    const { cancelUserTransaction } = await import("@/lib/payments/transactionRecovery");

    const res1 = await cancelUserTransaction({ uid: "uid-owner", ref: "AGS-MOMO-ANON" });
    expect(res1.status).toBe("cancelled");

    const res2 = await cancelUserTransaction({
      uid: "uid-owner",
      userEmail: "owner@example.com",
      ref: "AGS-EMAIL-ONLY",
    });
    expect(res2.status).toBe("cancelled");

    await expect(
      cancelUserTransaction({
        uid: "uid-stranger",
        userEmail: "stranger@example.com",
        ref: "AGS-MOMO-ANON",
      }),
    ).rejects.toThrow(/You can only cancel your own transactions/);

    expect(updates).toHaveLength(2);
    expect(updates[0].data.status).toBe("cancelled");
    vi.doUnmock("@/db/firebaseAdmin");
  });

  it("forces a fresh checkout link on stalled (>= 15 min) pending card transaction", async () => {
    const batchSets: Array<Record<string, unknown>> = [];
    const oldTs = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const mockDb = {
      batch: () => ({
        set: vi.fn((_ref: unknown, data: Record<string, unknown>) => {
          batchSets.push(data);
        }),
        update: vi.fn(),
        commit: vi.fn(async () => {}),
      }),
      collection: (name: string) => ({
        doc: (id: string) => ({
          path: `${name}/${id}`,
          get: async () => {
            if (name === "transactions" && id === "AGS-CARD-STALLED") {
              return {
                exists: true,
                id: "AGS-CARD-STALLED",
                data: () => ({
                  ref: "AGS-CARD-STALLED",
                  type: "support",
                  status: "pending",
                  paymentMethod: "card",
                  amount: 10,
                  currency: "USD",
                  creatorId: "alice",
                  supporterId: "anonymous",
                  initiatedBy: "uid-supporter",
                  redirectUrl: "https://pay.pesapal.com/old-stale-link",
                  redirectUrlGeneratedAt: oldTs,
                  createdAt: oldTs,
                }),
              };
            }
            return { exists: false };
          },
        }),
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      }),
    };

    process.env.PESAPAL_URL = "https://pesapal.example.com";
    process.env.PESAPAL_CONSUMER_KEY = "ck";
    process.env.PESAPAL_CONSUMER_SECRET = "cs";
    process.env.PESAPAL_IPN_ID = "ipn";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/Auth/RequestToken")) {
          return new Response(JSON.stringify({ token: "pesapal_tok" }), { status: 200 });
        }
        if (url.includes("/Transactions/SubmitOrderRequest")) {
          return new Response(
            JSON.stringify({
              redirect_url: "https://pay.pesapal.com/new-regenerated",
              order_tracking_id: "track-new",
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );

    vi.doMock("@/db/firebaseAdmin", () => ({ adminDb: mockDb }));
    const { recoverUserTransaction } = await import("@/lib/payments/transactionRecovery");

    const res = await recoverUserTransaction({
      uid: "uid-supporter",
      userEmail: "supporter@example.com",
      ref: "AGS-CARD-STALLED",
      allowPending: true,
    });

    expect(res.redirect_url).toBe("https://pay.pesapal.com/new-regenerated");
    expect(batchSets).toHaveLength(1);
    expect(batchSets[0].supporterId).toBe("uid-supporter");
    vi.doUnmock("@/db/firebaseAdmin");
  });

  it("falls back to Next.js cancel route when worker returns 403", async () => {
    vi.doMock("@/db/firebase", () => ({
      auth: { currentUser: { getIdToken: async () => "tok" } },
    }));

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/payments/transactions/cancel") && url.startsWith("http")) {
        return new Response(
          JSON.stringify({ error: "You can only cancel your own transactions" }),
          { status: 403 },
        );
      }
      if (url === "/api/payments/transactions/cancel") {
        return new Response(
          JSON.stringify({ ref: "AGS-MOMO-1", status: "cancelled" }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { cancelTransaction } = await import("@/lib/paymentsService");
    const result = await cancelTransaction("AGS-MOMO-1");
    expect(result).toEqual({ ref: "AGS-MOMO-1", status: "cancelled" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.doUnmock("@/db/firebase");
  });
});

describe("Admin all-transactions API route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("rejects non-admin requests with 403 and paginates/filters transactions for admins", async () => {
    const staleDate = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const freshDate = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const txDocs = [
      {
        id: "AGS-1",
        data: () => ({
          ref: "AGS-1",
          type: "support",
          status: "successful",
          paymentMethod: "momo",
          amount: 5000,
          currency: "RWF",
          creatorId: "alice",
          buyerEmail: "fan1@example.com",
          createdAt: freshDate,
        }),
      },
      {
        id: "AGS-2",
        data: () => ({
          ref: "AGS-2",
          type: "store",
          status: "pending",
          paymentMethod: "card",
          amount: 25,
          currency: "USD",
          creatorId: "bob",
          productName: "Sample Pack",
          buyerEmail: "fan2@example.com",
          createdAt: staleDate,
        }),
      },
      {
        id: "AGS-3",
        data: () => ({
          ref: "AGS-3",
          type: "support",
          status: "pending",
          paymentMethod: "momo",
          amount: 1000,
          currency: "RWF",
          creatorId: "alice",
          createdAt: freshDate,
        }),
      },
    ];

    const mockDb = {
      collection: (name: string) => {
        if (name === "transactions") {
          return {
            orderBy: () => ({ get: async () => ({ docs: txDocs }) }),
            get: async () => ({ docs: txDocs }),
          };
        }
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: id === "alice" || id === "bob",
              data: () => ({ name: id === "alice" ? "Alice Creator" : "Bob Maker" }),
            }),
          }),
        };
      },
    };

    const requireAdminMock = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      )
      .mockResolvedValue({ uid: "admin-1", email: "admin@agaseke.me", isAdmin: true });

    vi.doMock("@/db/firebaseAdmin", () => ({ adminDb: mockDb }));
    vi.doMock("@/lib/authMiddleware", () => ({ requireAdmin: requireAdminMock }));

    const { GET } = await import("@/app/api/admin/transactions/route");

    const denied = await GET(new NextRequest("http://localhost/api/admin/transactions"));
    expect(denied.status).toBe(403);

    const pagedRes = await GET(
      new NextRequest("http://localhost/api/admin/transactions?page=1&pageSize=2"),
    );
    expect(pagedRes.status).toBe(200);
    const pagedJson = (await pagedRes.json()) as {
      transactions: Array<{ ref: string; status: string; creatorName: string }>;
      total: number;
      totalPages: number;
      counts: Record<string, number>;
    };
    expect(pagedJson.total).toBe(3);
    expect(pagedJson.totalPages).toBe(2);
    expect(pagedJson.transactions).toHaveLength(2);
    expect(pagedJson.counts.stalled).toBe(1);
    expect(pagedJson.counts.pending).toBe(1);
    expect(pagedJson.counts.successful).toBe(1);

    const stalledRes = await GET(
      new NextRequest(
        "http://localhost/api/admin/transactions?status=stalled&search=Sample",
      ),
    );
    const stalledJson = (await stalledRes.json()) as typeof pagedJson;
    expect(stalledJson.total).toBe(1);
    expect(stalledJson.transactions[0].ref).toBe("AGS-2");
    expect(stalledJson.transactions[0].status).toBe("stalled");
    expect(stalledJson.transactions[0].creatorName).toBe("Bob Maker");

    vi.doUnmock("@/db/firebaseAdmin");
    vi.doUnmock("@/lib/authMiddleware");
  });
});
