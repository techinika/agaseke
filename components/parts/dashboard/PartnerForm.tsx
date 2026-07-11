"use client";

import { useState } from "react";
import {
  Loader,
  Building2,
  Upload,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadService";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function PartnerForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    website: "",
    description: "",
    featured: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadFile(file, "partner_logo", "partner");
      if (data.url) {
        setFormData((prev) => ({ ...prev, logo: data.url }));
        toast.success("Logo uploaded!");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!creator?.uid) { toast.error("Not authenticated"); return; }
    if (!formData.name.trim()) {
      toast.error("Partner name is required");
      return;
    }

    setSaving(true);
    try {
      const partnerData: Record<string, unknown> = {
        creatorId: creator.uid,
        name: formData.name.trim(),
        website: formData.website.trim() || null,
        description: formData.description.trim() || null,
        featured: formData.featured,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (formData.logo) {
        partnerData.logo = formData.logo;
      }

      await addDoc(collection(db, "creatorPartners"), partnerData);
      toast.success("Partner added!");
      router.push("/creator/partners");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save partner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/creator/partners")}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            Add Partner
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-border rounded-lg overflow-hidden border-2 border-dashed border-border-strong">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 size={32} className="text-slate-300" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-orange-600 text-white rounded-lg shadow-lg cursor-pointer hover:bg-orange-700 transition">
                <Upload size={14} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Partner Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="e.g., Gym Master"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, website: e.target.value }))
              }
              className="w-full bg-muted p-4 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none resize-none h-24 focus:ring-2 focus:ring-orange-100"
              placeholder="Brief description of the partnership..."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() =>
                setFormData((prev) => ({ ...prev, featured: !prev.featured }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.featured ? "bg-orange-500" : "bg-border-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform ${
                  formData.featured ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm font-bold">Feature on Profile</span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/creator/partners")}
              className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name.trim()}
              className="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader className="animate-spin" size={20} /> : null}
              {saving ? "Saving..." : "Add Partner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
