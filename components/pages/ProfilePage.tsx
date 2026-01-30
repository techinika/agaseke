"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/db/firebase";
import { deleteUser } from "firebase/auth";
import {
  User,
  Mail,
  MapPin,
  Shield,
  AlertTriangle,
  Trash2,
  Save,
  ExternalLink,
  CheckCircle2,
  Loader,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Profile } from "@/types/profile";
import { toast } from "sonner";
import Loading from "@/app/loading";
import Link from "next/link";

export default function ProfileEditPage() {
  const auth = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");

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
      });
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

    try {
      await deleteDoc(doc(db, "profiles", user.uid));
      await deleteUser(user);
      window.location.href = "/";
    } catch (error) {
      console.error("Deletion error:", error);
      toast.error(
        "For security, please logout and log back in before deleting your account.",
      );
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-3xl mx-auto px-6 pt-20">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tighter">
            Profile Settings
          </h1>
          <p className="text-slate-500 font-medium">
            Manage your identity and account preferences.
          </p>
        </div>

        {profile?.type !== "creator" && (
          <div className="bg-orange-600 rounded-4xl p-8 mb-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-2">Want a public page?</h3>
              <p className="text-orange-100 font-medium mb-6 max-w-md">
                Create an Agaseke to get your unique link and start receiving
                support from your fans.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
              >
                Setup Creator Page <ExternalLink size={16} />
              </Link>
            </div>
            <Shield className="absolute -right-4 -bottom-4 w-40 h-40 text-orange-500 opacity-50 rotate-12" />
          </div>
        )}

        <div className="space-y-6">
          {/* Identity Section */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <User size={30} className="text-slate-300" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Account Type
                </p>
                <div className="flex items-center gap-2 font-bold text-orange-600 capitalize">
                  {profile?.type} <CheckCircle2 size={14} />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  />
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-400 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-100 rounded-2xl py-4 px-6 font-bold transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Kigali, Rwanda"
                    className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-orange-100 rounded-2xl py-4 pl-12 pr-6 font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleUpdate}
              disabled={saving}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader className="animate-spin" />
              ) : (
                <Save size={18} />
              )}{" "}
              Save Changes
            </button>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-50/50 p-8 rounded-[2.5rem] border border-red-100 space-y-4">
            <h3 className="font-black text-red-600 flex items-center gap-2">
              <AlertTriangle size={18} /> Danger Zone
            </h3>
            <p className="text-sm text-red-700 font-medium">
              Deleting your account is permanent. This will remove your access
              and delete your profile from our database.
            </p>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-white border border-red-200 text-red-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
            >
              <Trash2 size={16} /> Delete My Account
            </button>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={28} />
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900"
              >
                <X />
              </button>
            </div>

            <h3 className="text-2xl font-black tracking-tighter mb-2">
              Are you sure?
            </h3>
            <p className="text-slate-500 text-sm font-medium mb-8">
              This action cannot be undone. To confirm, please type your email{" "}
              <span className="text-slate-900 font-bold underline">
                {profile?.email}
              </span>{" "}
              below.
            </p>

            <div className="space-y-6">
              <input
                type="text"
                autoComplete="off"
                placeholder="Type your email address"
                className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-red-100 rounded-2xl py-4 px-6 font-bold text-center"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />

              <button
                onClick={handleDeleteAccount}
                disabled={confirmEmail !== profile?.email}
                className="w-full bg-red-600 text-white py-5 rounded-2xl font-black disabled:opacity-20 transition-all hover:bg-red-700"
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
