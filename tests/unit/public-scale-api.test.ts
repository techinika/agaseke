import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
const mockIncrement = vi.fn((n: number) => ({ __increment: n }));

let mockCreatorsDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
let mockPostsDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];

vi.mock("@/db/firebaseAdmin", () => ({
  admin: {
    firestore: {
      FieldValue: {
        increment: (n: number) => mockIncrement(n),
      },
    },
  },
  adminDb: {
    batch: () => ({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    }),
    collection: (name: string) => {
      if (name === "creators") {
        return {
          doc: (id: string) => ({ path: `creators/${id}`, update: mockDocUpdate }),
          select: () => ({
            orderBy: () => ({
              get: async () => ({ docs: mockCreatorsDocs }),
            }),
          }),
        };
      }
      if (name === "creatorContent") {
        const makeQuery = (limitCount?: number) => ({
          where: () => makeQuery(limitCount),
          orderBy: () => makeQuery(limitCount),
          offset: () => makeQuery(limitCount),
          limit: (n: number) => makeQuery(n),
          get: async () => ({
            docs:
              typeof limitCount === "number"
                ? mockPostsDocs.slice(0, limitCount)
                : mockPostsDocs,
          }),
        });
        return {
          doc: (id: string) => ({ path: `creatorContent/${id}`, update: mockDocUpdate }),
          ...makeQuery(),
        };
      }
      return {
        doc: (id: string) => ({ path: `${name}/${id}`, update: mockDocUpdate }),
      };
    },
  },
}));

describe("/api/public/views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues valid view events and rejects empty payloads", async () => {
    const { POST } = await import("@/app/api/public/views/route");

    const badReq = new NextRequest("http://localhost/api/public/views", {
      method: "POST",
      body: "",
    });
    const badRes = await POST(badReq);
    expect(badRes.status).toBe(400);

    const req = new NextRequest("http://localhost/api/public/views", {
      method: "POST",
      body: JSON.stringify({
        items: [
          { type: "creator", id: "aline" },
          { type: "post", id: "post-123" },
          { type: "creator", id: "../invalid" },
        ],
      }),
    });
    const res = await POST(req);
    const json = (await res.json()) as { ok: boolean; queued: number };

    expect(res.status).toBe(202);
    expect(json.ok).toBe(true);
    expect(json.queued).toBe(2);
  });

  it("flushes batched increments via Firestore WriteBatch once batch threshold is met", async () => {
    vi.resetModules();
    const { POST } = await import("@/app/api/public/views/route");

    // 20 items in batch 1 + 5 items in batch 2 reaches MAX_BATCH_KEYS (25)
    const batchOne = Array.from({ length: 20 }, (_, i) => ({
      type: "creator",
      id: `creator_${i}`,
    }));
    const batchTwo = Array.from({ length: 5 }, (_, i) => ({
      type: "post",
      id: `post_${i}`,
    }));

    await POST(
      new NextRequest("http://localhost/api/public/views", {
        method: "POST",
        body: JSON.stringify({ items: batchOne }),
      }),
    );
    expect(mockBatchCommit).not.toHaveBeenCalled();

    await POST(
      new NextRequest("http://localhost/api/public/views", {
        method: "POST",
        body: JSON.stringify({ items: batchTwo }),
      }),
    );

    expect(mockBatchUpdate).toHaveBeenCalledTimes(25);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockIncrement).toHaveBeenCalledWith(1);
  });
});

describe("/api/public/explore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatorsDocs = [
      {
        id: "aline",
        data: () => ({
          uid: "uid-aline",
          name: "Aline Uwase",
          bio: "Visual storyteller in Kigali",
          focus: ["Art", "Culture"],
          verified: true,
        }),
      },
      {
        id: "keza",
        data: () => ({
          uid: "uid-keza",
          name: "Keza Beats",
          bio: "Music producer",
          focus: ["Music"],
          verified: false,
        }),
      },
    ];
    mockPostsDocs = [
      {
        id: "p1",
        data: () => ({
          creatorId: "aline",
          title: "Kigali Sketchbook",
          description: "Notes from Nyamirambo",
          type: "article",
          slug: "kigali-sketchbook",
          status: "published",
          stats: { likes: 12 },
          commentCount: 3,
          views: 44,
        }),
      },
      {
        id: "p2",
        data: () => ({
          creatorId: "aline",
          title: "Unpublished Draft",
          status: "draft",
        }),
      },
    ];
  });

  it("filters creators on the server and excludes draft posts from public explore", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/api/public/explore/route");

    const creatorsRes = await GET(
      new NextRequest("http://localhost/api/public/explore?kind=creators&q=kigali"),
    );
    const creatorsJson = (await creatorsRes.json()) as {
      items: Array<{ handle: string }>;
      total: number;
    };
    expect(creatorsRes.status).toBe(200);
    expect(creatorsJson.items.map((item) => item.handle)).toEqual(["aline"]);
    expect(creatorsJson.total).toBe(1);

    const postsRes = await GET(
      new NextRequest("http://localhost/api/public/explore?kind=posts&limit=10"),
    );
    const postsJson = (await postsRes.json()) as {
      items: Array<{ id: string; likesCount: number; authorName: string }>;
    };
    expect(postsRes.status).toBe(200);
    expect(postsJson.items).toHaveLength(1);
    expect(postsJson.items[0]).toMatchObject({
      id: "p1",
      likesCount: 12,
      authorName: "Aline Uwase",
    });
  });
});
