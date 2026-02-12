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
    if (!creatorData) return;
    setCreatorData({ ...creatorData, [field]: value });
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
    if (!creatorData || !auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "creators", String(creator?.handle)), {
        ...creatorData,
      });
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes.");
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
                      label: "Instagram Handle",
                    },
                    {
                      id: "twitter",
                      icon: Twitter,
                      color: "text-blue-400",
                      label: "Twitter / X Handle",
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

            {/* Perks & Messaging Sections remain visually the same as requested */}
            {activeTab === "perks" && (
              <section className="bg-white border border-slate-100 rounded-lg p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black uppercase">
                    Supporter Perks
                  </h3>
                  <button className="text-[10px] font-black uppercase text-orange-600 tracking-tighter bg-orange-50 px-3 py-1 rounded-lg">
                    Coming Soon
                  </button>
                </div>
                <p className="text-sm text-slate-500">
                  Enable special benefits for your supporters to increase
                  loyalty.
                </p>
                <div className="grid grid-cols-1 gap-4 opacity-60 grayscale pointer-events-none">
                  {/* ... Perks items ... */}
                </div>
              </section>
            )}

            {activeTab === "messaging" && (
              <section className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-lg p-12 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-300">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-xl font-black uppercase mb-2">
                  Direct Messaging
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 font-medium">
                  We are building a way for you to chat with your top
                  supporters.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest border border-slate-200">
                  <AlertCircle size={12} /> Feature Disabled
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
