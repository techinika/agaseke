import React, { useState } from "react";
import {
  X,
  Loader,
  Save,
  Building2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

interface Partner {
  id: string;
  creatorId: string;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  featured: boolean;
  createdAt: any;
}

export default function PartnerModal({
  partner,
  creatorId,
  onClose,
}: {
  partner: Partner | null;
  creatorId: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: partner?.name || "",
    logo: partner?.logo || "",
    website: partner?.website || "",
    description: partner?.description || "",
    featured: partner?.featured || false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("creatorHandle", "partner");

    try {
      const res = await fetch("/api/upload/content/image", {
        method: "POST",
        body: uploadFormData,
      });
      const data = await res.json();
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
    if (!formData.name.trim()) {
      toast.error("Partner name is required");
      return;
    }

    setSaving(true);
    try {
      if (!formData.name.trim()) {
        toast.error("Partner name is required");
        setSaving(false);
        return;
      }

      const partnerData: Record<string, unknown> = {
        creatorId,
        name: formData.name.trim(),
        website: formData.website.trim() || null,
        description: formData.description.trim() || null,
        featured: formData.featured,
        updatedAt: serverTimestamp(),
      };

      if (formData.logo) {
        partnerData.logo = formData.logo;
      }

      if (partner) {
        await updateDoc(doc(db, "creatorPartners", partner.id), partnerData);
        toast.success("Partner updated!");
      } else {
        await addDoc(collection(db, "creatorPartners"), {
          ...partnerData,
          createdAt: serverTimestamp(),
        });
        toast.success("Partner added!");
      }
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save partner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase tracking-tight">
            {partner ? "Edit Partner" : "Add Partner"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
              Partner Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="e.g., Gym Master Rwanda"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, website: e.target.value }))
              }
              className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
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
              className="w-full bg-muted p-4 rounded-lg text-sm outline-none resize-none h-24 focus:ring-2 focus:ring-orange-100"
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
        </div>

        <div className="p-6 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {partner ? "Update Partner" : "Add Partner"}
          </button>
        </div>
      </div>
    </div>
  );
}
