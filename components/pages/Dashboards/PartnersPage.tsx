/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  ArrowLeft,
  Loader,
  X,
  Edit,
  Trash2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

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

export default function PartnersPage() {
  const { creator } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!creator?.uid) return;

    const partnersRef = collection(db, "creatorPartners");
    const q = query(
      partnersRef,
      where("creatorId", "==", creator.handle),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const partnerData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Partner[];
      setPartners(partnerData);
      setLoading(false);
    });

    return () => unsub();
  }, [creator?.handle]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this partner?")) return;
    try {
      await deleteDoc(doc(db, "creatorPartners", id));
      toast.success("Partner deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const toggleFeatured = async (partner: Partner) => {
    try {
      await updateDoc(doc(db, "creatorPartners", partner.id), {
        featured: !partner.featured,
      });
      toast.success(partner.featured ? "Removed from featured" : "Added to featured");
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => {
              setEditingPartner(null);
              setShowModal(true);
            }}
            className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            title="Add Partner"
          >
            <Plus size={16} />
          </button>
        </div>
        <h2 className="text-xl font-bold uppercase">Partners</h2>
      </aside>

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
            Your Partners
          </h3>
          <p className="text-slate-500">
            Manage brands and businesses you work with. Featured partners will be highlighted on your public profile.
          </p>
        </div>

        {partners.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No partners yet</p>
            <p className="text-slate-400 text-sm mt-2">
              Add brands and businesses you collaborate with
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-orange-700 transition"
            >
              Add Your First Partner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className={`bg-white rounded-xl border overflow-hidden ${
                  partner.featured ? "border-orange-500 shadow-lg" : "border-slate-100"
                }`}
              >
                {partner.featured && (
                  <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">
                    Featured Partner
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {partner.logo ? (
                        <img
                          src={partner.logo}
                          alt={partner.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 size={24} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg truncate">{partner.name}</h4>
                      {partner.website && (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                        >
                          Visit Website <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>

                  {partner.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                      {partner.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFeatured(partner)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                        partner.featured
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                      }`}
                    >
                      {partner.featured ? "Unfeature" : "Feature"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPartner(partner);
                        setShowModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg transition"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(partner.id)}
                      className="p-2 text-red-400 hover:text-red-600 border border-red-100 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <PartnerModal
          partner={editingPartner}
          creatorId={creator?.uid || ""}
          onClose={() => {
            setShowModal(false);
            setEditingPartner(null);
          }}
        />
      )}
    </div>
  );
}

function PartnerModal({
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
      const partnerData = {
        creatorId,
        name: formData.name.trim(),
        logo: formData.logo || undefined,
        website: formData.website.trim() || undefined,
        description: formData.description.trim() || undefined,
        featured: formData.featured,
        updatedAt: serverTimestamp(),
      };

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
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase tracking-tight">
            {partner ? "Edit Partner" : "Add Partner"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-200">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 size={32} className="text-slate-300" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-orange-600 text-white rounded-lg shadow-lg cursor-pointer hover:bg-orange-700 transition">
                <Upload size={14} />
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Partner Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-50 p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="e.g., Gym Master Rwanda"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              className="w-full bg-slate-50 p-4 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-50 p-4 rounded-lg text-sm outline-none resize-none h-24 focus:ring-2 focus:ring-orange-100"
              placeholder="Brief description of the partnership..."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setFormData((prev) => ({ ...prev, featured: !prev.featured }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.featured ? "bg-orange-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  formData.featured ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm font-bold">Feature on Profile</span>
          </label>
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
            {partner ? "Update Partner" : "Add Partner"}
          </button>
        </div>
      </div>
    </div>
  );
}
