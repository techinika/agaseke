import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/types";

const mockFirestoreGet = vi.fn();
const mockFirestoreSet = vi.fn();
const mockFirestoreQueryAll = vi.fn();
const mockFirestoreApplyPayment = vi.fn();
const mockAddChatMember = vi.fn();
const mockLogActivity = vi.fn();

vi.mock("../src/firestore", () => ({
  convertFromFields: (fields: Record<string, unknown>) => fields,
  convertToFields: (obj: Record<string, unknown>) => obj,
  firestoreGet: (...args: unknown[]) => mockFirestoreGet(...args),
  firestoreSet: (...args: unknown[]) => mockFirestoreSet(...args),
  firestoreQueryAll: (...args: unknown[]) => mockFirestoreQueryAll(...args),
  firestoreApplyPayment: (...args: unknown[]) => mockFirestoreApplyPayment(...args),
}));

vi.mock("../src/services/members", () => ({
  addChatMember: (...args: unknown[]) => mockAddChatMember(...args),
  updateChatMemberStatus: vi.fn(),
}));

vi.mock("../src/logger", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

import { handlePaymentCallback } from "../src/services/subscriptions";

const env = {} as Env;

describe("community handlePaymentCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestoreApplyPayment.mockResolvedValue("applied");
    mockFirestoreSet.mockResolvedValue({});
    mockAddChatMember.mockResolvedValue(undefined);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("recovers subscription by paymentRef, resolves creatorUid & subscriber userName, and records creatorIncome", async () => {
    mockFirestoreQueryAll.mockResolvedValueOnce([
      {
        name: "projects/test/databases/(default)/documents/communitySubscriptions/SUB-99",
        fields: {
          id: "SUB-99",
          userId: "user-1",
          userEmail: "",
          userName: "",
          tierId: "tier-gold",
          tierName: "Gold",
          creatorId: "creator-uid-1",
          creatorHandle: "aline",
          interval: "monthly",
          currency: "RWF",
          status: "pending",
          paymentRef: "TX-MOMO-99",
        },
      },
    ]);

    mockFirestoreGet.mockImplementation(async (_env: Env, path: string) => {
      if (path === "creators/aline") {
        return { fields: { uid: "creator-uid-1" } };
      }
      if (path === "profiles/user-1") {
        return { fields: { displayName: "Marie Claire", email: "marie@example.com" } };
      }
      return null;
    });

    await handlePaymentCallback(
      env,
      {
        creatorId: "aline",
        currency: "RWF",
        communityInterval: "monthly",
      },
      5000,
      "TX-MOMO-99",
      "momo",
      500,
      4500,
      0,
    );

    expect(mockFirestoreApplyPayment).toHaveBeenCalledTimes(1);
    const applyArgs = mockFirestoreApplyPayment.mock.calls[0];
    const documents = applyArgs[4].documents as Array<{
      path: string;
      fields: Record<string, unknown>;
    }>;
    const creatorIncomeDoc = documents.find((d) =>
      d.path.startsWith("creatorIncome/"),
    );
    expect(creatorIncomeDoc?.fields).toMatchObject({
      creatorUid: "creator-uid-1",
      creatorHandle: "aline",
      amount: 4500,
      currency: "RWF",
      reason: "community_subscription",
      subscriptionId: "SUB-99",
      tierName: "Gold",
    });

    expect(mockFirestoreSet).toHaveBeenCalledWith(
      env,
      "communitySubscriptions/SUB-99",
      expect.objectContaining({
        status: "active",
        userName: "Marie Claire",
        userEmail: "marie@example.com",
        lastPaymentRef: "TX-MOMO-99",
      }),
    );

    expect(mockAddChatMember).toHaveBeenCalledWith(
      env,
      "aline",
      "tier-gold",
      "user-1",
      "Marie Claire",
      "active",
      "Gold",
    );
  });
});
