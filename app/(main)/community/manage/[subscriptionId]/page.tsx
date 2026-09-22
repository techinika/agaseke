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
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/db/firebase";
import { toast } from "sonner";
import {
  Loader,
  Crown,
  Smartphone,
  CreditCard,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    expired: "bg-red-100 text-red-700",
    cancelled: "bg-muted text-muted-foreground",
    failed: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-muted text-muted-foreground";
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
  const [savingAutoRenew, setSavingAutoRenew] = useState(false);

  const processingRef = useRef<string | null>(null);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn || !subscriptionId) return;
    try {
      const s = await getSubscription(subscriptionId);
      setSub(s);
      setPhone(s.phone || "");
      setRenewResult(null);
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

  const isUSD = sub?.currency === "USD";

  const handleRenew = async () => {
    if (!sub || !user) return;
    const method = isUSD ? "card" : paymentMethod;
    if (!method) return;
    if (method === "momo" && !phone.trim()) {
      toast.error("Enter your phone number");
      return;
    }

    setRenewing(true);
    setRenewError("");
    setRenewResult(null);
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
        }
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
        window.open(result.paymentUrl, "_blank");
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

  const handleCancel = async () => {
    if (!sub) return;
    if (!window.confirm("Cancel this subscription? You can renew again later.")) return;
    try {
      await cancelSubscription(sub.subscriptionId);
      toast.success("Subscription cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/community/manage"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6"
      >
        <ArrowLeft size={16} />
        Back to subscriptions
      </Link>

      {!isLoggedIn ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground mb-4">
            Log in to manage this subscription.
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition"
          >
            Log in
          </Link>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-orange-500" size={32} />
        </div>
      ) : notFound || !sub ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Crown size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            That subscription could not be found.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold">{sub.tierName}</h1>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge(sub.status)}`}
              >
                {sub.status}
              </span>
            </div>
            {sub.creatorHandle && (
              <p className="text-xs text-muted-foreground mb-4">by @{sub.creatorHandle}</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p>
                <span className="text-muted-foreground text-xs block">Plan</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(sub.amount, sub.currency || "RWF")}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    /{sub.interval === "yearly" ? "year" : "month"}
                  </span>
                </span>
              </p>
              <p>
                <span className="text-muted-foreground text-xs block">
                  {sub.status === "active" ? "Next renewal" : "Membership ends"}
                </span>
                {formatDate(sub.expiresAt)}
              </p>
              <p>
                <span className="text-muted-foreground text-xs block">Payment method</span>
                {sub.paymentMethod === "momo" ? (
                  <span className="capitalize">Mobile Money</span>
                ) : (
                  <span className="capitalize">
                    {(sub.paymentMethod || "card") === "momo" ? "Mobile Money" : "Card"}
                  </span>
                )}
              </p>
              <p>
                <span className="text-muted-foreground text-xs block">Auto-renew</span>
                <span className={sub.autoRenew ? "text-green-600 font-bold" : ""}>
                  {sub.autoRenew ? "On" : "Off"}
                </span>
              </p>
            </div>
          </div>

          {(sub.status === "expired" || sub.status === "cancelled") && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold mb-4">Renew Your Subscription</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Renew your {sub.tierName} subscription to keep your benefits and
                community access.
              </p>
              <div className="space-y-4">
                {isUSD ? (
                  <p className="text-sm text-muted-foreground">
                    This subscription is priced in USD, so card payment is the
                    only option.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("momo")}
                      className={`p-4 border rounded-lg text-center transition ${
                        paymentMethod === "momo"
                          ? "border-orange-500 bg-orange-50"
                          : "border-border hover:border-orange-300"
                      }`}
                    >
                      <Smartphone
                        size={24}
                        className={`mx-auto mb-2 ${
                          paymentMethod === "momo"
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          paymentMethod === "momo"
                            ? "text-orange-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        Mobile Money
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`p-4 border rounded-lg text-center transition ${
                        paymentMethod === "card"
                          ? "border-orange-500 bg-orange-50"
                          : "border-border hover:border-orange-300"
                      }`}
                    >
                      <CreditCard
                        size={24}
                        className={`mx-auto mb-2 ${
                          paymentMethod === "card"
                            ? "text-orange-600"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          paymentMethod === "card"
                            ? "text-orange-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        Bank Card
                      </span>
                    </button>
                  </div>
                )}

                {!isUSD && paymentMethod === "momo" && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      MTN / Airtel Phone Number
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXXXXX"
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    />
                  </div>
                )}

                <button
                  onClick={handleRenew}
                  disabled={renewing || (!isUSD && !paymentMethod)}
                  className="w-full py-3 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {renewing ? "Processing..." : `Renew for ${formatCurrency(sub.amount, sub.currency || "RWF")}`}
                </button>

                {renewResult === "success" && (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
                    <Check size={18} />
                    Subscription renewed successfully!
                  </div>
                )}
                {renewError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <X size={18} />
                    {renewError}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-bold mb-4">Manage Subscription</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Auto-renew</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.currency === "USD"
                      ? "Auto-renew is not available for USD subscriptions."
                      : sub.autoRenew
                        ? "We'll charge the saved Mobile Money number when it's time to renew."
                        : "Turn on to be charged automatically on your saved number."}
                  </p>
                </div>
                {sub.status === "active" && (
                  <button
                    onClick={handleToggleAutoRenew}
                    disabled={savingAutoRenew}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      sub.autoRenew ? "bg-green-600" : "bg-muted"
                    } disabled:opacity-50`}
                    aria-label="Toggle auto-renew"
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        sub.autoRenew ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                )}
              </div>

              {!isUSD && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">
                      Saved Phone Number
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXXXXX"
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={handleUpdatePhone}
                    disabled={savingAutoRenew || !phone.trim()}
                    className="px-4 py-2 bg-muted text-sm font-bold rounded-lg hover:bg-border transition disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              )}

              {sub.status === "active" && (
                <>
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition"
                  >
                    Cancel Subscription
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Cancelling ends auto-renewal. You keep access until your
                    current period ends.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}