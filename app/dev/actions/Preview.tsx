"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { CalendarDays, CreditCard, Gift, ReceiptText, Ticket, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  CheckoutModal,
  type CartItem as LegacyCartItem,
} from "@/components/parts/public/store";
import { CheckoutSheet } from "@/features/store";
import { FreeRsvpSheet, PaidRsvpSheet } from "@/features/gatherings";
import { GiveawayEntrySheet } from "@/features/giveaways";
import { SupportSheet } from "@/features/support";
import { CommunityJoinSheet } from "@/features/community";

const CREATOR = {
  uid: "preview-creator",
  name: "Aline Uwase",
  handle: "aline",
  photoURL: null,
  verified: true,
  currency: "RWF",
};

const MOCK_USER = {
  uid: "preview-supporter",
  email: "supporter@example.com",
  displayName: "Aline Supporter",
} as unknown as User;

const PAID_GATHERING = {
  id: "gathering-preview",
  title: "Kigali Listening Session",
  date: "Sat, 22 Nov 2026",
  time: "18:00",
  location: "Kimihurura, Kigali",
  ticketPrice: 5000,
  currency: "RWF",
};

const CART: LegacyCartItem[] = [
  {
    product: {
      id: "product-print",
      creatorId: CREATOR.uid,
      creatorUid: CREATOR.uid,
      name: "Agaseke print — limited",
      description: "Signed A3 print from the Kigali series.",
      price: 18000,
      currency: "RWF",
      type: "physical",
      stock: 12,
      sizes: ["A3"],
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      platformFeePayer: "buyer",
    },
    quantity: 1,
    selectedSize: "A3",
  },
  {
    product: {
      id: "product-album",
      creatorId: CREATOR.uid,
      creatorUid: CREATOR.uid,
      name: "Live session album",
      description: "Digital download of the live session.",
      price: 6000,
      currency: "RWF",
      type: "digital",
      stock: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      platformFeePayer: "buyer",
    },
    quantity: 1,
  },
];

type ActionId =
  | "support"
  | "community"
  | "giveaway"
  | "rsvp"
  | "ticket"
  | "checkout"
  | "checkout-old"
  | null;

const ACTIONS: {
  id: Exclude<ActionId, null>;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "support",
    title: "Support",
    description: "Amount, payment method and confirmation.",
    icon: <Gift className="size-5" aria-hidden="true" />,
  },
  {
    id: "community",
    title: "Community membership",
    description: "Choose a tier, pay and unlock the community.",
    icon: <Users className="size-5" aria-hidden="true" />,
  },
  {
    id: "giveaway",
    title: "Giveaway entry",
    description: "Free entry with retryable failure states.",
    icon: <Gift className="size-5" aria-hidden="true" />,
  },
  {
    id: "rsvp",
    title: "Free event RSVP",
    description: "Confirm a spot and show the ticket.",
    icon: <CalendarDays className="size-5" aria-hidden="true" />,
  },
  {
    id: "ticket",
    title: "Paid event ticket",
    description: "MoMo or card, waiting and success states.",
    icon: <Ticket className="size-5" aria-hidden="true" />,
  },
  {
    id: "checkout",
    title: "Store checkout (new)",
    description: "Review, delivery, payment and status.",
    icon: <CreditCard className="size-5" aria-hidden="true" />,
  },
  {
    id: "checkout-old",
    title: "Store checkout (old)",
    description: "Legacy modal kept for rollback comparison.",
    icon: <ReceiptText className="size-5" aria-hidden="true" />,
  },
];

export function ActionsPreview() {
  const [active, setActive] = useState<ActionId>(null);
  const total = useMemo(
    () => CART.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [],
  );

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("open");
    const match = ACTIONS.find((action) => action.id === requested);
    if (match) setActive(match.id);
  }, []);

  useEffect(() => {
    if (!active) return;
    const url = new URL(window.location.href);
    url.searchParams.set("open", active);
    window.history.replaceState(null, "", url);
  }, [active]);

  const close = () => {
    setActive(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("open");
    window.history.replaceState(null, "", url);
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-fg">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="space-y-1">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-strong">
            UI preview
          </p>
          <h1 className="text-title font-bold">Supporter actions</h1>
          <p className="text-label text-muted-fg">
            Mock data. Open a card or use <code>?open=checkout</code> in the URL for
            screenshots.
          </p>
        </div>

        <div className="grid gap-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => setActive(action.id)}
              className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-sm transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-raised text-brand-strong">
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{action.title}</span>
                <span className="block text-caption text-muted-fg">
                  {action.description}
                </span>
              </span>
              <span className="text-label font-semibold text-brand-strong">Open</span>
            </button>
          ))}
        </div>

        <Card className="flex items-start gap-3 p-4">
          <Users className="mt-0.5 size-5 shrink-0 text-muted-fg" aria-hidden="true" />
          <p className="text-caption text-muted-fg">
            Signed-in preview uses a mock supporter. Payments are not submitted until you
            tap the primary action; no worker or Firebase data is touched while
            screenshots are captured.
          </p>
        </Card>
      </div>

      <SupportSheet
        open={active === "support"}
        onClose={close}
        creator={CREATOR}
        isLoggedIn
        user={MOCK_USER}
      />

      <CommunityJoinSheet
        open={active === "community"}
        onClose={close}
        creatorName={CREATOR.name}
        creatorPhotoURL={CREATOR.photoURL}
        creatorVerified={CREATOR.verified}
        creatorHandle={CREATOR.handle}
        creatorUid={CREATOR.uid}
        tiers={[
          {
            id: "tier-insider",
            name: "Insider",
            description: "Monthly studio notes and early listens.",
            price: 5000,
            currency: "RWF",
            interval: "monthly",
            benefits: ["Private posts", "Monthly live session", "Member chat"],
          },
          {
            id: "tier-patron",
            name: "Patron",
            description: "Everything in Insider plus yearly surprises.",
            price: 50000,
            currency: "RWF",
            interval: "yearly",
            benefits: ["All Insider perks", "Annual print", "Priority questions"],
          },
        ]}
        initialTierId="tier-insider"
        user={MOCK_USER}
        displayName={MOCK_USER.displayName}
        defaultPhone="078 000 0000"
      />

      <GiveawayEntrySheet
        open={active === "giveaway"}
        onClose={close}
        creatorName={CREATOR.name}
        creatorPhotoURL={CREATOR.photoURL}
        creatorVerified={CREATOR.verified}
        title="Signed print giveaway"
        closesAt="2026-11-30T18:00:00.000Z"
        maxWinners={3}
        rewardCount={3}
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 400))}
      />

      <FreeRsvpSheet
        open={active === "rsvp"}
        onClose={close}
        creatorName={CREATOR.name}
        creatorPhotoURL={CREATOR.photoURL}
        creatorVerified={CREATOR.verified}
        title="Community listening night"
        date="Fri, 21 Nov 2026"
        time="19:00"
        location="Kimihurura, Kigali"
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 400))}
      />

      <PaidRsvpSheet
        open={active === "ticket"}
        onClose={close}
        creatorName={CREATOR.name}
        creatorPhotoURL={CREATOR.photoURL}
        creatorVerified={CREATOR.verified}
        creatorHandle={CREATOR.handle}
        gathering={PAID_GATHERING}
        user={MOCK_USER}
        displayName={MOCK_USER.displayName}
        defaultPhone="078 000 0000"
      />

      <CheckoutSheet
        open={active === "checkout"}
        onClose={close}
        cart={CART}
        creatorId={CREATOR.uid}
        creatorName={CREATOR.name}
        creatorHandle={CREATOR.handle}
        creatorPhotoURL={CREATOR.photoURL}
        creatorVerified={CREATOR.verified}
        getItemPrice={(item) => item.product.price * item.quantity}
        total={total}
        currentUser={MOCK_USER}
        currency="RWF"
      />

      {active === "checkout-old" && (
        <CheckoutModal
          cart={CART}
          creatorId={CREATOR.uid}
          creatorName={CREATOR.name}
          creatorHandle={CREATOR.handle}
          onClose={close}
          onSuccess={close}
          getItemPrice={(item) => item.product.price * item.quantity}
          total={total}
          currentUser={MOCK_USER}
          currency="RWF"
        />
      )}
    </main>
  );
}
