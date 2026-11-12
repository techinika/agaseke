import {
  DEFAULT_CREATOR_SHARE,
  DEFAULT_MIN_SUPPORT,
  DEFAULT_SUPPORT_PRESETS,
  SUPPORT_DRAFT_KEY,
  SUPPORT_LAST_KEY,
  SUPPORT_PENDING_KEY,
} from "./constants";
import type {
  PendingSupport,
  SupportBreakdown,
  SupportConfig,
  SupportCreator,
  SupportDraft,
  SupportMethod,
  SupportStatus,
  TransactionSnapshot,
} from "./types";

export type PerkId = "store" | "giveaways" | "gatherings" | "community" | "booking";

export function getCreatorShare(): number {
  const raw = Number(process.env.NEXT_PUBLIC_CREATOR_SHARE);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DEFAULT_CREATOR_SHARE;
}

export function getSupportPresets(): number[] {
  return DEFAULT_SUPPORT_PRESETS;
}

export function getMinSupport(currency = "RWF", raw?: unknown): number {
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  return currency === "USD" ? 1 : DEFAULT_MIN_SUPPORT;
}

export function buildSupportConfig(
  creator: Pick<SupportCreator, "currency">,
  minAmount?: unknown,
): SupportConfig {
  const currency = creator.currency || "RWF";
  return {
    currency,
    minAmount: getMinSupport(currency, minAmount),
    creatorShare: getCreatorShare(),
  };
}

export function calculateSupportBreakdown(
  amount: number,
  creatorShare: number,
): SupportBreakdown {
  const total = Math.max(0, Math.round(Number(amount) || 0));
  const creatorReceives = Math.max(0, Math.round(total * creatorShare));
  return {
    total,
    creatorReceives,
    fee: Math.max(0, total - creatorReceives),
  };
}

export function isValidSupportAmount(
  amount: number | "",
  minAmount: number,
  total?: number,
): boolean {
  if (amount === "" || !Number.isFinite(amount)) return false;
  const value = total ?? Math.round(amount);
  return value >= minAmount;
}

export function normalizeTransactionStatus(status: unknown): SupportStatus {
  const value = String(status ?? "").toLowerCase();
  if (["successful", "success", "completed", "paid"].includes(value)) {
    return "success";
  }
  if (["failed", "cancelled", "canceled", "reversed", "declined"].includes(value)) {
    return "failed";
  }
  return "waiting";
}

export function perksForCreator(creator: SupportCreator): PerkId[] {
  const perks: PerkId[] = [];
  if (creator.storeEnabled) perks.push("store");
  if (creator.giveawayEnabled) perks.push("giveaways");
  if (creator.gatheringsEnabled) perks.push("gatherings");
  if (creator.communityEnabled) perks.push("community");
  if (creator.bookingEnabled) perks.push("booking");
  return perks;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function session(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readJson<T>(store: Storage | null, key: string): T | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: Storage | null, key: string, value: unknown): void {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked in private/in-app browsers.
  }
}

function remove(store: Storage | null, key: string): void {
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    // ignore
  }
}

export interface LastSupportChoice {
  amount?: number;
  method?: SupportMethod;
}

export function readLastChoice(): LastSupportChoice | null {
  return readJson<LastSupportChoice>(storage(), SUPPORT_LAST_KEY);
}

export function saveLastChoice(choice: LastSupportChoice): void {
  writeJson(storage(), SUPPORT_LAST_KEY, choice);
}

export function readPendingSupport(handle?: string): PendingSupport | null {
  const pending = readJson<PendingSupport>(storage(), SUPPORT_PENDING_KEY);
  if (!pending?.reference) return null;
  if (handle && pending.handle !== handle) return null;
  return pending;
}

export function savePendingSupport(pending: PendingSupport): void {
  writeJson(storage(), SUPPORT_PENDING_KEY, pending);
}

export function clearPendingSupport(): void {
  remove(storage(), SUPPORT_PENDING_KEY);
}

export function readSupportDraft(handle: string): SupportDraft | null {
  const value = readJson<{ handle: string; draft: SupportDraft }>(
    session(),
    SUPPORT_DRAFT_KEY,
  );
  if (!value || value.handle !== handle || !value.draft) return null;
  return value.draft;
}

export function saveSupportDraft(handle: string, draft: SupportDraft): void {
  writeJson(session(), SUPPORT_DRAFT_KEY, { handle, draft });
}

export function clearSupportDraft(): void {
  remove(session(), SUPPORT_DRAFT_KEY);
}

export function transactionFromSnapshot(
  data: Record<string, unknown>,
): TransactionSnapshot {
  return {
    ref: String(data.ref ?? ""),
    status: String(data.status ?? ""),
    amount: typeof data.amount === "number" ? data.amount : Number(data.amount),
    currency: typeof data.currency === "string" ? data.currency : undefined,
    type: typeof data.type === "string" ? data.type : undefined,
  };
}

export function networkForPhone(phone: string): "MTN" | "Airtel" | null {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("250") ? `0${digits.slice(3)}` : digits;
  if (local.startsWith("078") || local.startsWith("079")) return "MTN";
  if (local.startsWith("072") || local.startsWith("073")) return "Airtel";
  return null;
}
