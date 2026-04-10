/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Share2,
  ShieldCheck,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  MessageSquare,
  Save,
  Check,
  Loader,
  Phone,
  AlertCircle,
  Camera,
  Linkedin,
  Store,
  ShoppingBag,
  Gift,
  Calendar,
} from "lucide-react";
import { db, auth } from "@/db/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AiFillTikTok } from "react-icons/ai";

export default function CreatorSettings() {
  const { creator } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!creator) return;
    const unsubscribe = onSnapshot(
      doc(db, "creators", creator.handle),
      (doc) => {
        if (doc.exists()) {
          setCreatorData(doc.data() as Creator);
        }
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [creator]);

  const handleUpdate = (field: string, value: any) => {
    setCreatorData((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleSocialUpdate = (platform: string, value: string) => {
    if (!creatorData) return;
    setCreatorData({
      ...creatorData,
      socials: { ...(creatorData.socials || {}), [platform]: value },
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/upload/picture", {
          method: "POST",
          body: JSON.stringify({ image: reader.result }),
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.url) {
          handleUpdate("profilePicture", data.url);
          toast.success("Photo uploaded! Remember to save changes.");
        }
      } catch (err) {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    };
  };

  const saveSettings = async () => {
    if (!creatorData) {
      toast.error("Please wait for settings to load");
      return;
    }
    if (!creator?.handle) {
      toast.error("Unable to identify creator account");
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        name: creatorData.name || "",
        bio: creatorData.bio || "",
        profilePicture: creatorData.profilePicture || "",
        socials: creatorData.socials || {},
        messagingEnabled: creatorData.messagingEnabled ?? false,
        messagingAllowAll: creatorData.messagingAllowAll ?? true,
        messagingMinAmount: creatorData.messagingMinAmount ?? 0,
        storeEnabled: creatorData.storeEnabled ?? false,
        storePublic: creatorData.storePublic ?? true,
        giveawayEnabled: creatorData.giveawayEnabled ?? false,
        bookingEnabled: creatorData.bookingEnabled ?? false,
        bookingAccess: creatorData.bookingAccess ?? "public",
        gatheringsEnabled: creatorData.gatheringsEnabled ?? false,
      };

      await updateDoc(doc(db, "creators", creator.handle), updateData);
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <Loader className="animate-spin text-orange-600" size={32} />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase">
              Settings
            </h1>
            <p className="text-slate-500 font-medium">
              Customize your creator identity and supporter perks.
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving || uploading}
            className="bg-slate-900 text-white px-8 py-3 rounded-lg font-black flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-2">
            {[
              { id: "profile", label: "Profile Info", icon: User },
              { id: "socials", label: "Social Links", icon: Share2 },
              { id: "perks", label: "Supporter Perks", icon: ShieldCheck },
              { id: "messaging", label: "Messaging", icon: MessageSquare },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-lg font-black text-sm transition-all ${
                  activeTab === item.id
                    ? "bg-white text-orange-600 shadow-sm border border-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </aside>

          <main className="flex-1 space-y-8">
            {activeTab === "profile" && (
              <section className="bg-white border border-slate-100 rounded-lg p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                {/* Profile Picture Upload */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
                      {uploading ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                          <Loader className="animate-spin text-white" />
                        </div>
                      ) : (
                        <img
                          src={
                            creatorData?.profilePicture ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorData?.handle}`
                          }
                          className="w-full h-full object-cover"
                          alt="Profile"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-orange-600 transition-all"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">Profile Photo</h4>
                    <p className="text-xs text-slate-400">
                      Recommended: Square JPEG or PNG, min 400x400px.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      Creator Name
                    </label>
                    <input
                      type="text"
                      value={creatorData?.name || ""}
                      onChange={(e) => handleUpdate("name", e.target.value)}
                      className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      Username (Permanent)
                    </label>
                    <div className="w-full bg-slate-100 p-4 rounded-lg text-sm font-bold text-slate-400 cursor-not-allowed">
                      @{creatorData?.handle}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Bio
                  </label>
                  <textarea
                    value={creatorData?.bio || ""}
                    onChange={(e) => handleUpdate("bio", e.target.value)}
                    placeholder="Tell your supporters who you are..."
                    className="w-full h-32 bg-slate-50 p-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none resize-none border border-transparent focus:bg-white transition-all"
                  />
                </div>

                <div className="p-6 bg-slate-900 rounded-lg text-white flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${creatorData?.verified ? "bg-green-500" : "bg-slate-700"}`}
                    >
                      {creatorData?.verified ? (
                        <Check size={24} />
                      ) : (
                        <Phone size={24} />
                      )}
                    </div>
                    <div>
                      <p className="font-black">
                        {creatorData?.verified
                          ? "Identity Verified"
                          : "Verify Identity"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {creatorData?.payoutNumber || "No number linked"}
                      </p>
                    </div>
                  </div>
                  {!creatorData?.verified && (
                    <button
                      onClick={() => router.push("/creator/verify")}
                      className="bg-white text-slate-900 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                    >
                      Verify Now
                    </button>
                  )}
                </div>
              </section>
            )}

            {activeTab === "socials" && (
              <section className="bg-white border border-slate-100 rounded-lg p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-lg font-black uppercase">
                  Connected Networks
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      id: "instagram",
                      icon: Instagram,
                      color: "text-pink-500",
                      label: "Instagram Username",
                    },
                    {
                      id: "linkedin",
                      icon: Linkedin,
                      color: "text-blue-500",
                      label: "LinkedIn Link",
                    },
                    {
                      id: "twitter",
                      icon: Twitter,
                      color: "text-blue-400",
                      label: "Twitter / X Username",
                    },
                    {
                      id: "youtube",
                      icon: Youtube,
                      color: "text-red-600",
                      label: "YouTube Channel URL",
                    },
                    {
                      id: "tiktok",
                      icon: AiFillTikTok,
                      color: "text-black-600",
                      label: "TikTok Channel URL",
                    },
                    {
                      id: "web",
                      icon: Globe,
                      color: "text-slate-600",
                      label: "Personal Website",
                    },
                  ].map((social) => (
                    <div
                      key={social.id}
                      className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-all"
                    >
                      <div
                        className={`p-3 bg-white rounded-lg shadow-sm ${social.color}`}
                      >
                        <social.icon size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder={social.label}
                        value={
                          creatorData?.socials?.[
                            social.id as keyof typeof creatorData.socials
                          ] || ""
                        }
                        onChange={(e) =>
                          handleSocialUpdate(social.id, e.target.value)
                        }
                        className="flex-1 bg-transparent outline-none text-sm font-bold"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "perks" && (
              <section className="bg-white border border-slate-100 rounded-lg p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black uppercase">
                    Supporter Perks
                  </h3>
                </div>
                <p className="text-sm text-slate-500">
                  Enable special features for your supporters and visitors.
                </p>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Store size={24} className="text-orange-600" />
                        </div>
                        <div>
                          <p className="font-black text-lg">Store</p>
                          <p className="text-sm text-slate-500">
                            Sell merchandise, digital products, and physical
                            goods directly to your audience.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdate(
                            "storeEnabled",
                            !creatorData?.storeEnabled,
                          )
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                          creatorData?.storeEnabled
                            ? "bg-orange-500"
                            : "bg-slate-200"
                        }`}
                        role="switch"
                        aria-checked={creatorData?.storeEnabled}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                            creatorData?.storeEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {creatorData?.storeEnabled && (
                      <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">Public Access</p>
                            <p className="text-xs text-slate-400">
                              Allow anyone to purchase (not just supporters)
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleUpdate(
                                "storePublic",
                                !creatorData?.storePublic,
                              )
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                              creatorData?.storePublic
                                ? "bg-orange-500"
                                : "bg-slate-200"
                            }`}
                            role="switch"
                            aria-checked={creatorData?.storePublic}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                                creatorData?.storePublic
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                        {!creatorData?.storePublic && (
                          <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
                            Only supporters will be able to see and purchase
                            from your store.
                          </p>
                        )}
                        <a
                          href="/creator/store"
                          className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
                        >
                          <ShoppingBag size={16} />
                          Manage your store
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Giveaways */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Gift size={24} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="font-black text-lg">Giveaways</p>
                        <p className="text-sm text-slate-500">
                          Run contests and reward your supporters with prizes.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleUpdate(
                          "giveawayEnabled",
                          !creatorData?.giveawayEnabled,
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                        creatorData?.giveawayEnabled
                          ? "bg-orange-500"
                          : "bg-slate-200"
                      }`}
                      role="switch"
                      aria-checked={creatorData?.giveawayEnabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          creatorData?.giveawayEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {creatorData?.giveawayEnabled && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <a
                        href="/creator/giveaways"
                        className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
                      >
                        <Gift size={16} />
                        Manage giveaways
                      </a>
                    </div>
                  )}
                </div>

                {/* Booking */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Calendar size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-black text-lg">Book a Meeting</p>
                        <p className="text-sm text-slate-500">
                          Allow supporters to book meetings or consultations
                          with you.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleUpdate(
                          "bookingEnabled",
                          !creatorData?.bookingEnabled,
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                        creatorData?.bookingEnabled
                          ? "bg-orange-500"
                          : "bg-slate-200"
                      }`}
                      role="switch"
                      aria-checked={creatorData?.bookingEnabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          creatorData?.bookingEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {creatorData?.bookingEnabled && (
                    <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Supporters Only</p>
                          <p className="text-xs text-slate-400">
                            Only supporters can book meetings
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdate(
                              "bookingAccess",
                              creatorData?.bookingAccess === "supporters"
                                ? "public"
                                : "supporters",
                            )
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                            creatorData?.bookingAccess === "supporters"
                              ? "bg-orange-500"
                              : "bg-slate-200"
                          }`}
                          role="switch"
                          aria-checked={
                            creatorData?.bookingAccess === "supporters"
                          }
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                              creatorData?.bookingAccess === "supporters"
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                      <a
                        href="/creator/bookings"
                        className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
                      >
                        <Calendar size={16} />
                        Manage bookings
                      </a>
                    </div>
                  )}
                </div>

                {/* Gatherings */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Calendar size={24} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-black text-lg">Gatherings</p>
                        <p className="text-sm text-slate-500">
                          Create events and allow supporters to RSVP.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleUpdate(
                          "gatheringsEnabled",
                          !creatorData?.gatheringsEnabled,
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                        creatorData?.gatheringsEnabled
                          ? "bg-orange-500"
                          : "bg-slate-200"
                      }`}
                      role="switch"
                      aria-checked={creatorData?.gatheringsEnabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          creatorData?.gatheringsEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {creatorData?.gatheringsEnabled && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <a
                        href="/creator/gatherings"
                        className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700"
                      >
                        <Calendar size={16} />
                        Manage gatherings
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "messaging" && (
              <section className="bg-white border border-slate-100 rounded-lg p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-black uppercase mb-2">
                      Direct Messaging
                    </h3>
                    <p className="text-sm text-slate-500">
                      Allow your supporters to send you private messages.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleUpdate(
                        "messagingEnabled",
                        !creatorData?.messagingEnabled,
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                      creatorData?.messagingEnabled
                        ? "bg-orange-500"
                        : "bg-slate-200"
                    }`}
                    role="switch"
                    aria-checked={creatorData?.messagingEnabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                        creatorData?.messagingEnabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {creatorData?.messagingEnabled && (
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">
                            Allow all supporters
                          </p>
                          <p className="text-xs text-slate-400">
                            Any supporter can message you, regardless of amount
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdate(
                              "messagingAllowAll",
                              !creatorData?.messagingAllowAll,
                            )
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                            creatorData?.messagingAllowAll
                              ? "bg-orange-500"
                              : "bg-slate-200"
                          }`}
                          role="switch"
                          aria-checked={creatorData?.messagingAllowAll}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                              creatorData?.messagingAllowAll
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {!creatorData?.messagingAllowAll && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            Minimum Support Amount (RWF)
                          </label>
                          <input
                            type="number"
                            value={creatorData?.messagingMinAmount || 0}
                            onChange={(e) =>
                              handleUpdate(
                                "messagingMinAmount",
                                Number(e.target.value),
                              )
                            }
                            placeholder="0"
                            className="w-full md:w-48 bg-slate-50 p-4 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                          />
                          <p className="text-xs text-slate-400">
                            Only supporters who have given at least this amount
                            can message you
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3">
                        <MessageSquare
                          size={20}
                          className="text-green-600 mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-sm text-green-800">
                            Email notifications enabled
                          </p>
                          <p className="text-xs text-green-600">
                            You will receive an email when a supporter sends you
                            a new message
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!creatorData?.messagingEnabled && (
                  <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 text-slate-400">
                      <AlertCircle size={20} />
                      <p className="text-sm">
                        Messaging is disabled. Your supporters won&apos;t be
                        able to send you direct messages.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
