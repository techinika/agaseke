import type { MobileNetwork, SupportDraft } from "./types";

export const DEFAULT_SUPPORT_PRESETS = [500, 1000, 2000, 5000];

export const DEFAULT_MIN_SUPPORT = 100;

export const DEFAULT_CREATOR_SHARE = 0.9;

/**
 * Guest (signed-out) checkout needs the payments worker to accept an
 * anonymous initiation and a server-side claim endpoint. Neither exists yet,
 * so the UI asks a guest to sign in before paying instead of showing a dead
 * "pay as anonymous" button. Flip this on only when the worker and claim
 * endpoint from docs/RULES_FOLLOWUP.md are live.
 */
export const GUEST_CHECKOUT_ENABLED =
  process.env.NEXT_PUBLIC_SUPPORT_GUEST_CHECKOUT === "1";

export const SUPPORT_LAST_KEY = "agaseke:support:last";
export const SUPPORT_PENDING_KEY = "agaseke:support:pending";
export const SUPPORT_DRAFT_KEY = "agaseke:support:draft";

export const DEFAULT_DRAFT: SupportDraft = {
  amount: "",
  message: "",
  method: "momo",
  network: "MTN",
  phone: "",
};

export const MOBILE_NETWORKS: {
  id: MobileNetwork;
  label: string;
  hint: string;
}[] = [
  {
    id: "MTN",
    label: "MTN MoMo",
    hint: "078 or 079 numbers",
  },
  {
    id: "Airtel",
    label: "Airtel Money",
    hint: "072 or 073 numbers",
  },
];
