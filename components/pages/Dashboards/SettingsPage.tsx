/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { db, auth } from "@/db/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext";

export default function CreatorSettings() {
  const { creator } = useAuth();
  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!creator) return;

    const unsubscribe = onSnapshot(doc(db, "creators", creator.uid), (doc) => {
      if (doc.exists()) {
        setCreatorData(doc.data() as Creator);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [creator]);

  const handleUpdate = async (field: string, value: any) => {
    if (!creatorData) return;
    setCreatorData({ ...creatorData, [field]: value });
  };

  const handleSocialUpdate = (platform: string, value: string) => {
    if (!creatorData) return;
    setCreatorData({
      ...creatorData,
      socials: { ...creatorData.socials, [platform]: value },
    });
  };

  const saveSettings = async () => {
    if (!creator || !auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "creators", auth.currentUser.uid), {
        ...creator,
      });
      alert("Settings updated successfully!");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const simulateVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      handleUpdate("verified", true);
      setIsVerifying(false);
    }, 2000);
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
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              Settings
            </h1>
            <p className="text-slate-500 font-medium">
              Customize your creator identity and supporter perks.
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
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
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${
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
              <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      Creator Name
                    </label>
                    <input
                      type="text"
                      defaultValue={creator?.name}
                      value={creatorData?.name}
                      onChange={(e) => handleUpdate("name", e.target.value)}
                      className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 outline-none border border-transparent focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      Username (Permanent)
                    </label>
                    <div className="w-full bg-slate-100 p-4 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed">
                      @{creator?.handle}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Bio
                  </label>
                  <textarea
                    value={creator?.bio}
                    onChange={(e) => handleUpdate("bio", e.target.value)}
                    placeholder="Tell your supporters who you are..."
                    className="w-full h-32 bg-slate-50 p-4 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-100 outline-none resize-none"
                  />
                </div>

                <div className="p-6 bg-slate-900 rounded-4xl text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-2xl ${creator?.verified ? "bg-green-500" : "bg-slate-700"}`}
                    >
                      {creator?.verified ? (
                        <Check size={24} />
                      ) : (
                        <Phone size={24} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">
                        {creator?.verified
                          ? "Identity Verified"
                          : "Verify Phone Number"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {creator?.payoutNumber || "No number linked"}
                      </p>
                    </div>
                  </div>
                  {!creator?.verified && (
                    <button
                      onClick={simulateVerification}
                      disabled={isVerifying}
                      className="bg-white text-slate-900 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                    >
                      {isVerifying ? "Verifying..." : "Verify Now"}
                    </button>
                  )}
                </div>
              </section>
            )}

            {activeTab === "socials" && (
              <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
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
                      id: "web",
                      icon: Globe,
                      color: "text-slate-600",
                      label: "Personal Website",
                    },
                  ].map((social) => (
                    <div
                      key={social.id}
                      className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-all"
                    >
                      <div
                        className={`p-3 bg-white rounded-xl shadow-sm ${social.color}`}
                      >
                        <social.icon size={20} />
                      </div>
                      <input
                        type="text"
                        defaultValue={
                          creator?.socials?.[
                            social.id as keyof typeof creator.socials
                          ] ?? ""
                        }
                        placeholder={social.label}
                        value={
                          creator?.socials?.[
                            social.id as keyof typeof creator.socials
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
              <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
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

                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      title: "Exclusive Content",
                      desc: "Access to supporters-only posts and media.",
                      active: true,
                    },
                    {
                      title: "Early Access",
                      desc: "See new content 24h before everyone else.",
                      active: false,
                    },
                    {
                      title: "VIP Gatherings",
                      desc: "Access to private events based on support level.",
                      active: true,
                    },
                  ].map((perk, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-6 bg-slate-50 rounded-4xl border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{perk.title}</p>
                        <p className="text-xs text-slate-400">{perk.desc}</p>
                      </div>
                      <div
                        className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${perk.active ? "bg-orange-600" : "bg-slate-300"}`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${perk.active ? "ml-6" : "ml-0"}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "messaging" && (
              <section className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-300">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-xl font-black uppercase mb-2">
                  Direct Messaging
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 font-medium">
                  We are building a way for you to chat with your top
                  supporters. This feature is currently in development.
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
