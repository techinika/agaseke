"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import {
  getSubscription,
  renewSubscription,
  updateSubscriptionSettings,
  cancelSubscription,
  type MemberInfo,
} from "@/lib/communityService";
import { formatCurrency } from "@/types/currency";
import { isCurrencySupportedByMethod } from "@/lib/money/rails";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/db/firebase";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Crown,
  Smartphone,
  CreditCard,
  ArrowLeft,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusTone(status: string) {
  const map: Record<string, string> = {
    active: "text-success",
    pending: "text-warning",
    expired: "text-danger",
    cancelled: "text-muted-fg",
    failed: "text-danger",
  };
  return map[status] || "text-muted-fg";
}

export default function CommunityManageDetailPage() {
  const params = useParams<{ subscriptionId: string }>();
  const subscriptionId = params.subscriptionId;
  const { user, isLoggedIn } = useAuth();

  const [sub, setSub] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | null>(null);
  const [phone, setPhone] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState("");
  const [renewResult, setRenewResult] = useState<"success" | "error" | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [savingAutoRenew, setSavingAutoRenew] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const processingRef = useRef<string | null>(null);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn || !subscriptionId) return;
    try {
      const s = await getSubscription(subscriptionId);
      setSub(s);
      setPhone(s.phone || "");
      setRenewResult(null);
      setCheckoutUrl(null);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, subscriptionId]);

  useEffect(() => {
    if (!isLoggedIn || !subscriptionId) return;
    let cancelled = false;
    getSubscription(subscriptionId)
      .then((s) => {
        if (cancelled) return;
        setSub(s);
        setPhone(s.phone || "");
        setRenewResult(null);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, subscriptionId]);

  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
    };
  }, []);

  const momoSupported = sub?.currency ? isCurrencySupportedByMethod("momo", sub.currency as never) : false;

  const handleRenew = async () => {
    if (!sub || !user) return;
    const method = momoSupported ? paymentMethod : "card";
    if (!method) return;
    if (method === "momo" && !phone.trim()) {
      toast.error("Enter your phone number");
      return;
    }

    setRenewing(true);
    setRenewError("");
    setRenewResult(null);
    setCheckoutUrl(null);
    const runId = `renew-${Date.now()}`;
    processingRef.current = runId;

    try {
      const result = await renewSubscription(sub.subscriptionId, {
        paymentMethod: method,
        phone: method === "momo" ? phone : undefined,
        email: user.email || "",
        firstName: user.displayName || "Supporter",
      });

      const unsub = onSnapshot(
        query(collection(db, "transactions"), where("ref", "==", result.paymentRef)),
        (snap) => {
          if (processingRef.current !== runId) {
            unsub();
            return;
          }
          snap.docChanges().forEach((change) => {
            if (change.doc.data().status === "successful") {
              setRenewResult("success");
              processingRef.current = null;
              unsub();
              load();
            } else if (change.doc.data().status === "failed") {
              setRenewError("Payment failed. Please try again.");
              setRenewResult("error");
              processingRef.current = null;
              unsub();
            }
          });
        },
      );

      if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = setTimeout(() => {
        unsub();
        if (processingRef.current === runId) {
          setRenewError("Payment confirmation timed out. Check your transactions.");
          setRenewResult("error");
          processingRef.current = null;
        }
      }, 120000);

      if (method === "card" && result.paymentUrl) {
        setCheckoutUrl(result.paymentUrl);
        toast.info("Open the checkout link below to complete your card payment.");
      } else if (method === "momo") {
        toast.info("Check your phone and enter your PIN to confirm");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setRenewError(message);
      setRenewResult("error");
    } finally {
      setRenewing(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!sub) return;
    setSavingAutoRenew(true);
    try {
      await updateSubscriptionSettings(sub.subscriptionId, { autoRenew: !sub.autoRenew });
      setSub({ ...sub, autoRenew: !sub.autoRenew });
      toast.success(sub.autoRenew ? "Auto-renew disabled" : "Auto-renew enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingAutoRenew(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!sub || !phone.trim()) return;
    setSavingAutoRenew(true);
    try {
      await updateSubscriptionSettings(sub.subscriptionId, { phone });
      const s = await getSubscription(sub.subscriptionId);
      setSub(s);
      toast.success("Phone number updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingAutoRenew(false);
    }
  };

  const confirmCancel = async () => {
    if (!sub) return;
    setCancelling(true);
    try {
      await cancelSubscription(sub.subscriptionId);
      toast.success("Subscription cancelled");
      setCancelOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/community/manage"
        className="mb-6 inline-flex items-center gap-2 text-label font-medium text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to subscriptions
      </Link>

      {!isLoggedIn ? (
        <EmptyState
          icon={<Crown className="size-6" aria-hidden="true" />}
          title="Log in to manage this subscription"
          description="Sign in to view billing, renew, or update auto-renewal."
          action={
            <Link href="/login" className={buttonClasses({ variant: "primary" })}>
              Log in
            </Link>
          }
        />
      ) : loading ? (
        <LoadingState variant="page" label="Loading subscription" />
      ) : notFound || !sub ? (
        <EmptyState
          icon={<Crown className="size-6" aria-hidden="true" />}
          title="Subscription not found"
          description="This membership could not be located."
          action={
            <Link href="/community/manage" className={buttonClasses({ variant: "secondary" })}>
              All subscriptions
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h1 className="text-title font-bold text-fg">{sub.tierName}</h1>
              <span className={`text-caption font-semibold capitalize ${statusTone(sub.status)}`}>
                {sub.status}
              </span>
            </div>
            {sub.creatorHandle && (
              <p className="mb-5 text-caption text-muted-fg">
                by @{sub.creatorHandle}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 text-label">
              <div>
                <span className="block text-caption text-muted-fg">Plan</span>
                <span className="font-bold text-brand-strong">
                  {formatCurrency(sub.amount, sub.currency as never)}
                  <span className="ml-1 text-caption font-normal text-muted-fg">
                    /{sub.interval === "yearly" ? "year" : "month"}
                  </span>
                </span>
              </div>
              <div>
                <span className="block text-caption text-muted-fg">
                  {sub.status === "active" ? "Next renewal" : "Membership ends"}
                </span>
                <span className="font-medium text-fg">{formatDate(sub.expiresAt)}</span>
              </div>
              <div>
                <span className="block text-caption text-muted-fg">Payment method</span>
                <span className="font-medium text-fg">
                  {sub.paymentMethod === "momo" ? "Mobile Money" : "Card"}
                </span>
              </div>
              <div>
                <span className="block text-caption text-muted-fg">Auto-renew</span>
                <span className={sub.autoRenew ? "font-semibold text-success" : "text-fg"}>
                  {sub.autoRenew ? "On" : "Off"}
                </span>
              </div>
            </div>
          </Card>

          {(sub.status === "expired" || sub.status === "cancelled") && (
            <Card className="p-6">
              <h2 className="mb-2 text-body-lg font-bold text-fg">Renew Your Subscription</h2>
              <p className="mb-6 text-label text-muted-fg">
                Renew {sub.tierName} to keep your community perks and access.
              </p>

              <div className="space-y-4">
                {!momoSupported ? (
                  <p className="text-label text-muted-fg">
                    This subscription is priced in USD, so card payment is the only option.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("momo")}
                      className={`rounded-control border p-4 text-center transition-colors ${
                        paymentMethod === "momo"
                          ? "border-brand-strong bg-brand-soft"
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <Smartphone
                        className={`mx-auto mb-2 size-6 ${
                          paymentMethod === "momo" ? "text-brand-strong" : "text-muted-fg"
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-caption font-bold ${
                          paymentMethod === "momo" ? "text-brand-strong" : "text-muted-fg"
                        }`}
                      >
                        Mobile Money
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-control border p-4 text-center transition-colors ${
                        paymentMethod === "card"
                          ? "border-brand-strong bg-brand-soft"
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <CreditCard
                        className={`mx-auto mb-2 size-6 ${
                          paymentMethod === "card" ? "text-brand-strong" : "text-muted-fg"
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-caption font-bold ${
                          paymentMethod === "card" ? "text-brand-strong" : "text-muted-fg"
                        }`}
                      >
                        Bank Card
                      </span>
                    </button>
                  </div>
                )}

                {momoSupported && paymentMethod === "momo" && (
                  <Input
                    label="MTN / Airtel Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXXXXX"
                  />
                )}

                <Button
                  fullWidth
                  onClick={handleRenew}
                  loading={renewing}
                  disabled={momoSupported && !paymentMethod}
                >
                  {renewing
                    ? "Processing…"
                    : `Renew for ${formatCurrency(sub.amount, sub.currency as never)}`}
                </Button>

                {checkoutUrl && (
                  <div className="rounded-control border border-line bg-surface-sunken p-3 text-label">
                    <p className="font-semibold text-fg">Continue to checkout</p>
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 font-semibold text-brand-strong hover:underline"
                    >
                      Open card payment window <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </div>
                )}

                {renewResult === "success" && (
                  <div className="flex items-center gap-2 text-label font-semibold text-success">
                    <Check className="size-4" aria-hidden="true" />
                    Subscription renewed successfully!
                  </div>
                )}
                {renewError && (
                  <div className="flex items-center gap-2 text-label text-danger">
                    <X className="size-4" aria-hidden="true" />
                    {renewError}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="mb-4 text-body-lg font-bold text-fg">Manage Subscription</h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-body font-semibold text-fg">Auto-renew</p>
                  <p className="text-caption text-muted-fg">
                    {!momoSupported
                      ? "Auto-renew with Mobile Money is not available for this currency."
                      : sub.autoRenew
                        ? "We'll charge your saved Mobile Money number when it's time to renew."
                        : "Turn on to renew automatically using your saved number."}
                  </p>
                </div>
                {sub.status === "active" && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sub.autoRenew}
                    onClick={handleToggleAutoRenew}
                    disabled={savingAutoRenew}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors disabled:opacity-50 ${
                      sub.autoRenew ? "bg-success" : "bg-surface-sunken border border-line-strong"
                    }`}
                    aria-label="Toggle auto-renew"
                  >
                    <span
                      className={`inline-block size-4 transform rounded-full bg-surface shadow-sm transition-transform ${
                        sub.autoRenew ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                )}
              </div>

              {momoSupported && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Input
                    label="Saved Phone Number"
                    containerClassName="flex-1"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXXXXX"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleUpdatePhone}
                    disabled={savingAutoRenew || !phone.trim()}
                  >
                    Update
                  </Button>
                </div>
              )}

              {sub.status === "active" && (
                <div className="border-t border-line pt-4">
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                  <p className="mt-2 text-caption text-muted-fg">
                    Cancelling ends auto-renewal. You keep access until the current period ends.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
        title="Cancel subscription?"
        description="Cancelling stops automatic renewals. You can renew again anytime later."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        loading={cancelling}
        tone="warning"
      />
    </div>
  );
}