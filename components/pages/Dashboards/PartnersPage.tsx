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
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { PartnerModal } from "./partnerspage/index";

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
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!creator?.uid) return;

    const partnersRef = collection(db, "creatorPartners");
    const q = query(
      partnersRef,
      where("creatorId", "==", creator.uid),
      orderBy("createdAt", "desc"),
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

  const handleDelete = async () => {
    if (!deletingPartnerId) return;
    try {
      await deleteDoc(doc(db, "creatorPartners", deletingPartnerId));
      toast.success("Partner deleted");
      setDeletingPartnerId(null);
    } catch (error) {
      toast.error("Failed to delete partner");
      setDeletingPartnerId(null);
    }
  };

  const toggleFeatured = async (partner: Partner) => {
    try {
      await updateDoc(doc(db, "creatorPartners", partner.id), {
        featured: !partner.featured,
      });
      toast.success(
        partner.featured ? "Removed from featured" : "Added to featured",
      );
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
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col text-slate-900">
      <aside className="w-full bg-white border-b border-slate-200 hidden md:flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-xl font-bold uppercase">Partners</h2>
        </div>
        <button
          onClick={() => {
            setEditingPartner(null);
            setShowModal(true);
          }}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition shadow-lg"
        >
          <Plus size={18} /> Add Partner
        </button>
      </aside>

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
            Your Partners
          </h3>
          <p className="text-slate-500">
            Manage brands and businesses you work with. Featured partners will
            be highlighted on your public profile.
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
                  partner.featured
                    ? "border-orange-500 shadow-lg"
                    : "border-slate-100"
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
                      <h4 className="font-bold text-lg truncate">
                        {partner.name}
                      </h4>
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
                      onClick={() => setDeletingPartnerId(partner.id)}
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

      <ConfirmModal
        isOpen={!!deletingPartnerId}
        onClose={() => setDeletingPartnerId(null)}
        onConfirm={handleDelete}
        title="Delete Partner"
        message="Are you sure you want to delete this partner? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}


