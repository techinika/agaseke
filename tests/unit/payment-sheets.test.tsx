import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { CheckoutSheet, checkoutPlatformFee } from "@/features/store";
import { PaidRsvpSheet } from "@/features/gatherings";
import { CommunityJoinSheet } from "@/features/community";
import type { CartItem } from "@/features/store/types";

vi.mock("@/lib/paymentsService", () => ({
  initiateMomoPayment: vi.fn().mockRejectedValue(new Error("Network down")),
  initiateCardPayment: vi.fn().mockRejectedValue(new Error("Network down")),
}));

vi.mock("@/lib/communityService", () => ({
  initiateSubscription: vi.fn().mockRejectedValue(new Error("Community worker down")),
}));

const noop = () => undefined;

const USER = {
  uid: "supporter-1",
  email: "supporter@example.com",
  displayName: "Aline Supporter",
} as unknown as User;

function cartItem(overrides: Partial<CartItem["product"]> = {}): CartItem {
  return {
    product: {
      id: "product-1",
      creatorId: "creator-1",
      creatorUid: "creator-1",
      name: "Limited print",
      description: "Signed print",
      price: 5000,
      currency: "RWF",
      type: "physical",
      stock: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      platformFeePayer: "buyer",
      ...overrides,
    },
    quantity: 2,
    selectedSize: "A3",
  };
}

const getItemPrice = (item: CartItem) => item.product.price * item.quantity;

describe("checkout sheet", () => {
  it("computes the buyer-paid platform fee once per line total", () => {
    const result = checkoutPlatformFee([cartItem()], getItemPrice);
    expect(result.buyerPaysMore).toBe(true);
    expect(result.fee).toBe(1500);
  });

  it("moves from review to shipping and payment", () => {
    const cart = [cartItem()];
    render(
      <CheckoutSheet
        open
        onClose={noop}
        cart={cart}
        creatorId="creator-1"
        creatorName="Aline Uwase"
        creatorHandle="aline"
        creatorVerified
        getItemPrice={getItemPrice}
        total={12000}
        currentUser={USER}
      />,
    );

    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByText("2× Limited print")).toBeInTheDocument();
    expect(screen.getByText("12,000 RWF")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Aline Supporter" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "078 123 4567" },
    });
    fireEvent.change(screen.getByLabelText("Street address"), {
      target: { value: "KG 1 Ave" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Kigali" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Place order" })).toBeInTheDocument();
  });

  it("shows a retryable failure when payment cannot start", async () => {
    const cart = [cartItem({ type: "digital" })];
    render(
      <CheckoutSheet
        open
        onClose={noop}
        cart={cart}
        creatorId="creator-1"
        creatorName="Aline Uwase"
        creatorHandle="aline"
        getItemPrice={getItemPrice}
        total={10000}
        currentUser={USER}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Mobile money number"), {
      target: { value: "078 123 4567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => {
      expect(screen.getByText("Order not completed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
  });
});

describe("paid event ticket sheet", () => {
  const gathering = {
    id: "gathering-1",
    title: "Kigali Listening Session",
    date: "Sat, 22 Nov 2026",
    time: "18:00",
    location: "Kimihurura, Kigali",
    ticketPrice: 5000,
    currency: "RWF",
  };

  it("shows price, host and payment choices", () => {
    render(
      <PaidRsvpSheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        creatorVerified
        creatorHandle="aline"
        gathering={gathering}
        user={USER}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ticket for Kigali Listening Session" }),
    ).toBeInTheDocument();
    expect(screen.getByText("5,000 RWF")).toBeInTheDocument();
    expect(screen.getByText("Hosted by Aline Uwase")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MTN MoMo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay 5,000 RWF" })).toBeInTheDocument();
  });

  it("shows a retryable failure when payment cannot start", async () => {
    render(
      <PaidRsvpSheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        creatorHandle="aline"
        gathering={gathering}
        user={USER}
        defaultPhone="078 123 4567"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pay 5,000 RWF" }));

    await waitFor(() => {
      expect(screen.getByText("Ticket not completed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
  });
});

describe("community join sheet", () => {
  const tiers = [
    {
      id: "insider",
      name: "Insider",
      description: "Monthly notes",
      price: 5000,
      currency: "RWF",
      interval: "monthly" as const,
      benefits: ["Private posts", "Member chat"],
    },
  ];

  it("shows tiers, benefits and the selected price", () => {
    render(
      <CommunityJoinSheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        creatorVerified
        creatorHandle="aline"
        creatorUid="creator-1"
        tiers={tiers}
        initialTierId="insider"
        user={USER}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Join the community" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Insider")).toBeInTheDocument();
    expect(screen.getByText("Private posts")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join for 5,000 RWF" }),
    ).toBeInTheDocument();
  });

  it("shows a retryable failure when the subscription cannot start", async () => {
    render(
      <CommunityJoinSheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        creatorHandle="aline"
        creatorUid="creator-1"
        tiers={tiers}
        initialTierId="insider"
        user={USER}
        defaultPhone="078 123 4567"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Join for 5,000 RWF" }));

    await waitFor(() => {
      expect(screen.getByText("Membership not completed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
  });
});
