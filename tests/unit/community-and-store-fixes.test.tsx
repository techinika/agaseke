import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { pauseOtherMediaElements } from "@/lib/media/pauseOtherMedia";
import { QRCode } from "@/components/ui/QRCode";
import { CreatorHeader } from "@/features/creator-page/components/CreatorHeader";
import { CommunityTab } from "@/components/parts/public/CommunityTab";
import { ProductCard } from "@/components/parts/public/store/ProductCard";
import { OrderTrackingModal } from "@/components/parts/public/store/OrderTrackingModal";
import type { Order, Product } from "@/components/parts/public/store/types";

const mockCancelStoreOrder = vi.fn();

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "supporter-1", email: "supporter@example.com", displayName: "Aline" },
    isLoggedIn: true,
    isCreator: false,
  }),
}));

vi.mock("@/lib/communityService", () => ({
  getMySubscriptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/paymentsService", () => ({
  cancelStoreOrder: (...args: unknown[]) => mockCancelStoreOrder(...args),
  cancelTransaction: vi.fn().mockResolvedValue({ ref: "TX-1", status: "cancelled" }),
}));

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return {
    ...actual,
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
  };
});

describe("media mutual exclusion", () => {
  it("pauses all other playing video and audio elements", () => {
    const v1 = document.createElement("video");
    const v2 = document.createElement("video");
    const a1 = document.createElement("audio");
    const v3Paused = document.createElement("video");

    Object.defineProperty(v1, "paused", { value: false, configurable: true });
    Object.defineProperty(v2, "paused", { value: false, configurable: true });
    Object.defineProperty(a1, "paused", { value: false, configurable: true });
    Object.defineProperty(v3Paused, "paused", { value: true, configurable: true });

    const p1 = vi.spyOn(v1, "pause").mockImplementation(() => {});
    const p2 = vi.spyOn(v2, "pause").mockImplementation(() => {});
    const pA = vi.spyOn(a1, "pause").mockImplementation(() => {});
    const p3 = vi.spyOn(v3Paused, "pause").mockImplementation(() => {});

    document.body.append(v1, v2, a1, v3Paused);
    pauseOtherMediaElements(v2);

    expect(p1).toHaveBeenCalledTimes(1);
    expect(pA).toHaveBeenCalledTimes(1);
    expect(p2).not.toHaveBeenCalled();
    expect(p3).not.toHaveBeenCalled();

    v1.remove();
    v2.remove();
    a1.remove();
    v3Paused.remove();
  });
});

describe("QRCode canvas contrast fallback", () => {
  it("renders a canvas element wrapped inside a light surface container", () => {
    const { container } = render(
      <QRCode value="https://agaseke.me/aline" showDownload={false} />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute("role")).toBe("img");
  });
});

describe("Explore Community CTA for existing members", () => {
  it("shows Explore Community in CreatorHeader when viewer is already subscribed", () => {
    const noop = () => undefined;
    const { rerender } = render(
      <CreatorHeader
        displayName="Aline Uwase"
        handle="aline"
        bio="Creator bio"
        socials={{}}
        isLoggedIn
        communityEnabled
        isCommunityMember={false}
        onShare={noop}
        onSupport={noop}
      />,
    );

    expect(screen.getByRole("link", { name: "Community" })).toHaveAttribute(
      "href",
      "/aline/community",
    );

    rerender(
      <CreatorHeader
        displayName="Aline Uwase"
        handle="aline"
        bio="Creator bio"
        socials={{}}
        isLoggedIn
        communityEnabled
        isCommunityMember
        onShare={noop}
        onSupport={noop}
      />,
    );

    expect(screen.getByRole("link", { name: "Explore Community" })).toHaveAttribute(
      "href",
      "/aline/community",
    );
  });

  it("shows Explore Community instead of Join or Open Chat for subscribed tiers in CommunityTab", () => {
    render(
      <CommunityTab
        publicPosts={[]}
        privatePosts={[]}
        isSupporter={false}
        name="Aline Uwase"
        username="aline"
        uid="creator-1"
        communityEnabled
        activeCommunityTierIds={["tier-1"]}
        communityTiers={[
          {
            id: "tier-1",
            name: "Gold",
            description: "All access",
            price: 5000,
            currency: "RWF",
            interval: "monthly",
            benefits: ["Chat access"],
          },
          {
            id: "tier-2",
            name: "Platinum",
            description: "VIP",
            price: 10000,
            currency: "RWF",
            interval: "monthly",
            benefits: ["1-on-1"],
          },
        ]}
      />,
    );

    const exploreLinks = screen.getAllByRole("link", { name: "Explore Community" });
    expect(exploreLinks.length).toBeGreaterThanOrEqual(2);
    expect(exploreLinks[0]).toHaveAttribute("href", "/aline/community/chat/tier-1");
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
  });
});

describe("Store product detail link & order cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelStoreOrder.mockResolvedValue({ status: "cancelled" });
  });

  it("links ProductCard directly to the dedicated product page", () => {
    const product: Product = {
      id: "prod-1",
      creatorId: "creator-1",
      creatorUid: "creator-1",
      name: "Signed Poster",
      description: "Limited edition print",
      price: 8000,
      currency: "RWF",
      type: "physical",
      stock: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
    };

    render(
      <ProductCard
        product={product}
        creatorHandle="aline"
        onAddToCart={() => undefined}
        onSelectProduct={() => undefined}
        isLoggedIn
        isPurchased={false}
      />,
    );

    const titleLink = screen.getByRole("link", { name: /Signed Poster/i });
    expect(titleLink).toHaveAttribute("href", "/aline/store/prod-1");
  });

  it("allows buyers to cancel a pending order on OrderTrackingModal", async () => {
    const onOrderCancelled = vi.fn();
    const pendingOrder: Order = {
      id: "ord-1",
      buyerId: "supporter-1",
      buyerName: "Aline",
      buyerEmail: "supporter@example.com",
      creatorId: "aline",
      items: [
        {
          productId: "prod-1",
          productName: "Signed Poster",
          quantity: 1,
          price: 8000,
        },
      ],
      subtotal: 8000,
      discount: 0,
      total: 8800,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <OrderTrackingModal
        orders={[pendingOrder]}
        products={[]}
        uid="supporter-1"
        onOrderCancelled={onOrderCancelled}
        onClose={() => undefined}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel Order" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockCancelStoreOrder).toHaveBeenCalledWith("ord-1");
      expect(onOrderCancelled).toHaveBeenCalledWith("ord-1");
    });
  });
});
