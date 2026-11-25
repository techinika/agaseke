import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_ADMIN_EMAIL,
  resolveAdminNotificationEmail,
} from "@/lib/comms/adminEmail";
import {
  filterPendingVerificationQueue,
  normalizeVerificationRequest,
  resolveVerificationBadgeState,
} from "@/lib/verificationSchema";
import { resolveAdminRecipient } from "../../workers/comms/src/services/adminRecipient";

describe("admin email recipient routing", () => {
  it("routes verification and withdrawal alerts to agasekeforcreators@gmail.com and blocks songa@agaseke.me", () => {
    expect(resolveAdminNotificationEmail(undefined)).toBe(DEFAULT_ADMIN_EMAIL);
    expect(resolveAdminNotificationEmail("")).toBe(DEFAULT_ADMIN_EMAIL);
    expect(resolveAdminNotificationEmail("songa@agaseke.me")).toBe(
      "agasekeforcreators@gmail.com",
    );
    expect(resolveAdminNotificationEmail("SONGA@AGASEKE.ME")).toBe(
      "agasekeforcreators@gmail.com",
    );

    expect(
      resolveAdminRecipient({ adminEmail: "songa@agaseke.me" }, undefined),
    ).toBe("agasekeforcreators@gmail.com");
    expect(
      resolveAdminRecipient(
        { adminEmail: "songa@agaseke.me" },
        { ADMIN_EMAIL: "songa@agaseke.me" },
      ),
    ).toBe("agasekeforcreators@gmail.com");
    expect(
      resolveAdminRecipient(
        { adminEmail: "songa@agaseke.me" },
        { ADMIN_EMAIL: "agasekeforcreators@gmail.com" },
      ),
    ).toBe("agasekeforcreators@gmail.com");
  });

  it("uses resolved recipient in comms verification & withdrawal services", () => {
    const verificationSrc = readFileSync(
      join(process.cwd(), "workers/comms/src/services/verification.ts"),
      "utf8",
    );
    const withdrawalSrc = readFileSync(
      join(process.cwd(), "workers/comms/src/services/withdrawal.ts"),
      "utf8",
    );

    expect(verificationSrc).toContain("resolveAdminRecipient(data, env)");
    expect(withdrawalSrc).toContain("resolveAdminRecipient(data, env)");
    expect(verificationSrc).not.toContain("songa@agaseke.me");
    expect(withdrawalSrc).not.toContain("songa@agaseke.me");
  });
});

describe("verification schema normalization & pending queue filtering", () => {
  it("keeps requestId intact when merging legacy v1 verification request with creator doc", () => {
    const normalized = normalizeVerificationRequest(
      "req_legacy_001",
      {
        uid: "uid-alice",
        country: "Rwanda",
        bankName: "MTN",
        accountName: "Alice Creator",
        accountNumber: "0780000000",
        swiftCode: "N/A",
        payoutPreference: "momo",
        status: "pending",
        idDocumentUrl: "https://assets.agaseke.me/verification_document/id.jpg",
      },
      {
        id: "alice",
        name: "Alice C.",
        verified: false,
        verificationStatus: "pending",
        phoneVerified: true,
      },
      { email: "alice@example.com" },
    );

    expect(normalized.requestId).toBe("req_legacy_001");
    expect(normalized.creatorHandle).toBe("alice");
    expect(normalized.creatorName).toBe("Alice C.");
    expect(normalized.email).toBe("alice@example.com");
    expect(normalized.idDocumentKind).toBe("image");
    expect(normalized.creatorVerified).toBe(false);
  });

  it("excludes already-verified creators even if a stale pending verificationRequests doc exists", () => {
    const staleVerified = normalizeVerificationRequest(
      "req_stale_verified",
      {
        uid: "uid-verified",
        status: "pending",
        createdAt: "2026-11-20T00:00:00.000Z",
      },
      {
        id: "verified_creator",
        name: "Already Verified",
        verified: true,
        verificationStatus: "approved",
      },
    );

    const statusApprovedOnly = normalizeVerificationRequest(
      "req_approved_status",
      {
        uid: "uid-approved-status",
        status: "pending",
        createdAt: "2026-11-20T00:00:00.000Z",
      },
      {
        id: "approved_creator",
        name: "Approved Status",
        verified: false,
        verificationStatus: "approved",
      },
    );

    const olderPending = normalizeVerificationRequest(
      "req_pending_old",
      {
        uid: "uid-pending",
        status: "pending",
        createdAt: "2026-11-18T00:00:00.000Z",
      },
      {
        id: "pending_creator",
        name: "Pending Creator",
        verified: false,
        verificationStatus: "pending",
      },
    );

    const newerPending = normalizeVerificationRequest(
      "req_pending_new",
      {
        uid: "uid-pending",
        status: "pending",
        createdAt: "2026-11-22T00:00:00.000Z",
      },
      {
        id: "pending_creator",
        name: "Pending Creator",
        verified: false,
        verificationStatus: "pending",
      },
    );

    const queue = filterPendingVerificationQueue([
      staleVerified,
      statusApprovedOnly,
      olderPending,
      newerPending,
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0].requestId).toBe("req_pending_new");
    expect(queue[0].creatorHandle).toBe("pending_creator");
  });

  it("resolves user verification badge states accurately", () => {
    expect(resolveVerificationBadgeState({ verified: true }, null)).toBe("verified");
    expect(
      resolveVerificationBadgeState({ verified: false }, { status: "pending" }),
    ).toBe("pending");
    expect(
      resolveVerificationBadgeState({ verificationStatus: "rejected" }, null),
    ).toBe("rejected");
    expect(resolveVerificationBadgeState(null, null)).toBe("unverified");
  });
});

describe("admin verification & fx API handlers", () => {
  it("approves pending verification and updates creator + all pending requests via /api/admin/verification/review", async () => {
    vi.resetModules();
    const updates: Array<{ path: string; data: Record<string, unknown> }> = [];
    const sets: Array<{ path: string; data: Record<string, unknown> }> = [];

    const requestRef = { path: "verificationRequests/req_1234" };
    const siblingRef = { path: "verificationRequests/req_old" };
    const creatorRef = { path: "creators/alice" };

    const mockBatch = {
      update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
        updates.push({ path: ref.path, data });
      }),
      set: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
        sets.push({ path: ref.path, data });
      }),
      commit: vi.fn(async () => {}),
    };

    const mockDb = {
      batch: () => mockBatch,
      collection: (name: string) => ({
        doc: (id?: string) => {
          const docId = id || `${name}_auto`;
          return {
            id: docId,
            path: `${name}/${docId}`,
            ref: name === "creators" ? creatorRef : requestRef,
            get: async () => {
              if (name === "verificationRequests" && id === "req_1234") {
                return {
                  exists: true,
                  id: "req_1234",
                  ref: requestRef,
                  data: () => ({
                    uid: "uid-alice",
                    creatorHandle: "alice",
                    creatorName: "Alice",
                    accountNumber: "0780000001",
                    payoutPreference: "momo",
                    bankName: "MTN",
                    status: "pending",
                  }),
                };
              }
              if (name === "creators" && id === "alice") {
                return {
                  exists: true,
                  id: "alice",
                  ref: creatorRef,
                  data: () => ({
                    uid: "uid-alice",
                    name: "Alice",
                    verified: false,
                  }),
                };
              }
              if (name === "profiles" && id === "uid-alice") {
                return {
                  exists: true,
                  id: "uid-alice",
                  data: () => ({ email: "alice@example.com" }),
                };
              }
              return { exists: false };
            },
          };
        },
        where: () => ({
          where: () => ({
            get: async () => ({
              empty: false,
              docs: [
                { id: "req_1234", ref: requestRef, data: () => ({ status: "pending" }) },
                { id: "req_old", ref: siblingRef, data: () => ({ status: "pending" }) },
              ],
            }),
          }),
        }),
      }),
    };

    vi.doMock("@/db/firebaseAdmin", () => ({
      admin: { firestore: { FieldValue: { serverTimestamp: () => "TS" } } },
      adminDb: mockDb,
      adminAuth: { getUser: vi.fn() },
    }));
    vi.doMock("@/lib/authMiddleware", () => ({
      requireAdmin: vi.fn(async () => ({
        uid: "admin-1",
        email: "admin@agaseke.me",
        isAdmin: true,
      })),
    }));

    const { POST } = await import("@/app/api/admin/verification/review/route");
    const req = new NextRequest("http://localhost/api/admin/verification/review", {
      method: "POST",
      body: JSON.stringify({ requestId: "req_1234", action: "approve" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.verified).toBe(true);
    expect(json.email).toBe("alice@example.com");
    expect(updates.some((u) => u.path === "creators/alice" && u.data.verified === true)).toBe(
      true,
    );
    expect(
      updates.filter((u) => u.path.startsWith("verificationRequests/")).length,
    ).toBe(2);
    expect(sets.length).toBeGreaterThanOrEqual(2);

    vi.doUnmock("@/db/firebaseAdmin");
    vi.doUnmock("@/lib/authMiddleware");
  });

  it("rejects unauthorized document access cleanly via /api/admin/verification/document", async () => {
    vi.resetModules();
    vi.doMock("@/lib/authMiddleware", () => ({
      requireAdmin: vi.fn(async () =>
        NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      ),
    }));

    const { POST } = await import("@/app/api/admin/verification/document/route");
    const req = new NextRequest("http://localhost/api/admin/verification/document", {
      method: "POST",
      body: JSON.stringify({ requestId: "req_1234" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    vi.doUnmock("@/lib/authMiddleware");
  });
});
