"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/db/firebase";
import { deleteUser } from "firebase/auth";
import {
  Mail,
  MapPin,
  Shield,
  AlertTriangle,
  Trash2,
  Save,
  ExternalLink,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Profile } from "@/types/profile";
import { toast } from "sonner";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card } from "@/components/ui/Card";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/types/currency";
import {
  PAYOUT_CURRENCIES,
  normalizePayoutCurrency,
  pendingPayoutField,
} from "@/lib/payouts/currency";

export default function ProfileEditPage() {
  const auth = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [hasPendingPayout, setHasPendingPayout] = useState(false);
  const [pendingSummary, setPendingSummary] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth?.profile;
      if (user) {
        const docRef = doc(db, "profiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data as Profile);
          setDisplayName(data.displayName || "");
          setLocation(data.location || "");
          setPhone(data?.phoneNumber || "");
        }

        const userHandle = (user as { handle?: string }).handle || user.username;
        if (user.type === "creator" && userHandle) {
          const creatorRef = doc(db, "creators", userHandle);
          const creatorSnap = await getDoc(creatorRef);
          if (creatorSnap.exists()) {
            const creatorData = creatorSnap.data();
            const creatorCurrency = normalizePayoutCurrency(creatorData.currency) ?? "RWF";
            const pendingBalances = PAYOUT_CURRENCIES.map((code) => ({
              code,
              amount: Number(creatorData[pendingPayoutField(code)] ?? 0),
            })).filter((balance) => balance.amount > 0);
            setPendingSummary(
              pendingBalances.length > 0
                ? pendingBalances
                    .map((balance) => formatCurrency(balance.amount, balance.code))
                    .join(" + ")
                : formatCurrency(0, creatorCurrency),
            );
            setHasPendingPayout(pendingBalances.length > 0);
          }
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [auth?.profile]);

  const handleUpdate = async () => {
    if (!auth?.profile?.uid) return;
    setSaving(true);
    try {
      const userRef = doc(db, "profiles", auth.profile.uid);
      await updateDoc(userRef, {
        displayName,
        location,
        phoneNumber: phone,
      });
      window.dispatchEvent(new Event("agaseke:refresh-auth"));
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth?.user;
    if (!user || confirmEmail !== user.email) return;

    setDeleting(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        status: "archived",
        archivedAt: new Date().toISOString(),
      });
      await deleteUser(user);
      toast.success("Account deleted successfully");
      setIsDeleteModalOpen(false);
      router.replace("/");
    } catch (error: unknown) {
      console.error("Deletion error:", error);
      const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : "";
      if (code === "auth/requires-recent-login") {
        toast.error("Please log out and log back in, then try again to delete your account.");
      } else {
        toast.error("Failed to delete account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState variant="form" label="Loading profile settings" />;

  return (
    <div className="bg-canvas pb-12 text-fg">
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-8">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand-strong">
            Account
          </p>
          <h1 className="mt-1 text-heading font-bold tracking-tight text-fg">
            Profile Settings
          </h1>
          <p className="mt-1 text-label text-muted-fg">
            Manage your identity, contact details, and account preferences.
          </p>
        </div>

        {profile?.type !== "creator" && (
          <div className="relative mb-6 overflow-hidden rounded-card bg-brand-strong p-6 text-on-brand sm:p-8">
            <div className="relative z-10">
              <h2 className="mb-2 text-title font-bold">Want a creator page?</h2>
              <p className="mb-5 max-w-md text-body text-on-brand/90">
                Set up your Agaseke page to get a unique link and start receiving
                support, bookings, and store orders.
              </p>
              <Link
                href="/onboarding"
                className={buttonClasses({
                  variant: "secondary",
                  className: "border-transparent bg-surface text-brand-strong hover:bg-surface-raised",
                })}
              >
                Setup Creator Page <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <Shield className="pointer-events-none absolute -bottom-4 -right-4 size-36 rotate-12 opacity-20" aria-hidden="true" />
          </div>
        )}

        <div className="space-y-6">
          <Card className="space-y-6 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <Avatar
                src={profile?.photoURL}
                name={displayName || profile?.email || "User"}
                size="lg"
              />
              <div>
                <p className="text-caption font-semibold uppercase tracking-wider text-muted-fg">
                  Account Type
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 font-bold capitalize text-brand-strong">
                  <span>{profile?.type || "Supporter"}</span>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Email Address"
                type="email"
                value={profile?.email || ""}
                disabled
                leading={<Mail className="size-4" aria-hidden="true" />}
              />

              <Input
                label="Display Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />

              <Input
                label="Location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kigali, Rwanda"
                leading={<MapPin className="size-4" aria-hidden="true" />}
              />

              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +250789999999"
                leading={<Phone className="size-4" aria-hidden="true" />}
              />
            </div>

            <Button
              fullWidth
              onClick={handleUpdate}
              loading={saving}
              leadingIcon={<Save className="size-4" aria-hidden="true" />}
            >
              Save Changes
            </Button>
          </Card>

          <section className="space-y-4 rounded-card border border-danger/25 bg-danger-bg p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-body-lg font-bold text-danger">
              <AlertTriangle className="size-5" aria-hidden="true" /> Danger Zone
            </h2>
            <p className="text-label text-fg">
              {hasPendingPayout ? (
                <>
                  You have <span className="font-bold">{pendingSummary}</span> in pending payouts.
                  Withdraw your funds before deleting your account.
                </>
              ) : (
                "Deleting your account is permanent. Your authentication account is deleted and your profile is archived."
              )}
            </p>
            <Button
              variant="danger"
              disabled={hasPendingPayout}
              onClick={() => {
                if (hasPendingPayout) {
                  toast.error(`Please withdraw your ${pendingSummary} first`);
                } else {
                  setIsDeleteModalOpen(true);
                }
              }}
              leadingIcon={<Trash2 className="size-4" aria-hidden="true" />}
            >
              Delete My Account
            </Button>
          </section>
        </div>
      </div>

      <Dialog
        open={isDeleteModalOpen}
        onClose={() => {
          if (deleting) return;
          setIsDeleteModalOpen(false);
          setConfirmEmail("");
        }}
        title="Delete your account?"
        description={`This permanently removes your login account. To confirm, type your email address (${profile?.email || ""}) below.`}
        size="sm"
        preventClose={deleting}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setConfirmEmail("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={!auth?.user?.email || confirmEmail !== auth.user.email}
              onClick={handleDeleteAccount}
              leadingIcon={<Trash2 className="size-4" aria-hidden="true" />}
            >
              Delete Account
            </Button>
          </div>
        }
      >
        <Input
          label="Confirm Email Address"
          type="email"
          autoComplete="off"
          placeholder={profile?.email || "Type your email address"}
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
        />
      </Dialog>
    </div>
  );
}
