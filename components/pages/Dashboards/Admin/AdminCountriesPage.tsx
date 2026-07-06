/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Globe, Plus, Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface CountryItem {
  id: string;
  code: string;
  name: string;
  flag?: string;
  phoneCode?: string;
}

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [newPhoneCode, setNewPhoneCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editFlag, setEditFlag] = useState("");
  const [editPhoneCode, setEditPhoneCode] = useState("");

  useEffect(() => {
    const q = query(collection(db, "countries"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCountries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CountryItem)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    const code = newCode.trim().toUpperCase();
    const name = newName.trim();
    if (!code || !name) { toast.error("Country code and name are required"); return; }
    if (countries.some((c) => c.code === code)) {
      toast.error("Country code already exists"); return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, "countries"), {
        code, name, flag: newFlag.trim(), phoneCode: newPhoneCode.trim(),
        createdAt: serverTimestamp(),
      });
      setNewCode(""); setNewName(""); setNewFlag(""); setNewPhoneCode("");
      toast.success("Country added");
    } catch { toast.error("Failed to add country"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "countries", id));
      toast.success("Country deleted");
      setConfirmDelete(null);
    } catch { toast.error("Failed to delete"); }
  };

  const startEdit = (c: CountryItem) => {
    setEditingId(c.id);
    setEditCode(c.code);
    setEditName(c.name);
    setEditFlag(c.flag || "");
    setEditPhoneCode(c.phoneCode || "");
  };

  const handleEdit = async () => {
    const code = editCode.trim().toUpperCase();
    const name = editName.trim();
    if (!code || !name) { toast.error("Country code and name are required"); return; }
    if (countries.some((c) => c.code === code && c.id !== editingId)) {
      toast.error("Country code already exists"); return;
    }
    try {
      await updateDoc(doc(db, "countries", editingId!), { code, name, flag: editFlag, phoneCode: editPhoneCode });
      toast.success("Country updated");
      setEditingId(null);
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase">Countries</h1>
            <p className="text-sm text-muted-foreground">
              Manage countries for creator onboarding and localization.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="Code (RW)" className="w-20 bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100 uppercase" />
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (Rwanda)" className="flex-1 min-w-[160px] bg-muted p-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100" />
            <input type="text" value={newFlag} onChange={(e) => setNewFlag(e.target.value)} placeholder="🇷🇼" className="w-16 bg-muted p-4 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-orange-100" />
            <input type="text" value={newPhoneCode} onChange={(e) => setNewPhoneCode(e.target.value)} placeholder="+250" className="w-24 bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100" />
            <button onClick={handleAdd} disabled={adding || !newCode.trim() || !newName.trim()} className="bg-orange-600 text-white px-6 py-4 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition disabled:opacity-50">
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
        ) : countries.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <Globe size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No countries yet</p>
            <p className="text-sm text-muted-foreground mt-2">Add countries above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {countries.map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
                {editingId === c.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-3 flex-wrap">
                    <input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} className="w-20 bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100 uppercase" autoFocus />
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 min-w-[120px] bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100" />
                    <input type="text" value={editFlag} onChange={(e) => setEditFlag(e.target.value)} className="w-14 bg-muted p-2 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-orange-100" />
                    <input type="text" value={editPhoneCode} onChange={(e) => setEditPhoneCode(e.target.value)} className="w-20 bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100" />
                    <button onClick={handleEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{c.flag || "🌍"}</span>
                    <span className="font-bold">{c.code}</span>
                    <span className="text-sm text-muted-foreground">{c.name}</span>
                    {c.phoneCode && <span className="text-xs font-bold text-muted-foreground">{c.phoneCode}</span>}
                  </div>
                )}
                {editingId !== c.id && (confirmDelete === c.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(c.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg hover:bg-muted transition">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEdit(c)} className="p-2 text-muted-foreground hover:text-orange-500 transition"><Pencil size={16} /></button>
                    <button onClick={() => setConfirmDelete(c.id)} className="p-2 text-muted-foreground hover:text-red-500 transition"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
