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
import { Banknote, Plus, Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  payoutThreshold: number;
}

export default function AdminCurrenciesPage() {
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newThreshold, setNewThreshold] = useState("10000");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editSymbol, setEditSymbol] = useState("");
  const [editThreshold, setEditThreshold] = useState("10000");

  useEffect(() => {
    const q = query(collection(db, "currencies"), orderBy("code", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCurrencies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CurrencyItem)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    const code = newCode.trim().toUpperCase();
    const name = newName.trim();
    const symbol = newSymbol.trim();
    const threshold = parseInt(newThreshold) || 10000;
    if (!code || !name) { toast.error("Currency code and name are required"); return; }
    if (currencies.some((c) => c.code === code)) {
      toast.error("Currency code already exists"); return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, "currencies"), { code, name, symbol, payoutThreshold: threshold, createdAt: serverTimestamp() });
      setNewCode(""); setNewName(""); setNewSymbol(""); setNewThreshold("10000");
      toast.success("Currency added");
    } catch { toast.error("Failed to add currency"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "currencies", id));
      toast.success("Currency deleted");
      setConfirmDelete(null);
    } catch { toast.error("Failed to delete"); }
  };

  const startEdit = (cur: CurrencyItem) => {
    setEditingId(cur.id);
    setEditCode(cur.code);
    setEditName(cur.name);
    setEditSymbol(cur.symbol);
    setEditThreshold(String(cur.payoutThreshold || 10000));
  };

  const handleEdit = async () => {
    const code = editCode.trim().toUpperCase();
    const name = editName.trim();
    const symbol = editSymbol.trim();
    const threshold = parseInt(editThreshold) || 10000;
    if (!code || !name) { toast.error("Currency code and name are required"); return; }
    if (currencies.some((c) => c.code === code && c.id !== editingId)) {
      toast.error("Currency code already exists"); return;
    }
    try {
      await updateDoc(doc(db, "currencies", editingId!), { code, name, symbol, payoutThreshold: threshold });
      toast.success("Currency updated");
      setEditingId(null);
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase">Currencies</h1>
            <p className="text-sm text-muted-foreground">
              Manage available currencies for creators worldwide.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. USD)"
              className="w-24 bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100 uppercase"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. US Dollar)"
              className="w-40 bg-muted p-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="$"
              className="w-20 bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
            />
            <input
              type="number"
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              placeholder="Threshold"
              className="w-32 bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newCode.trim() || !newName.trim()}
              className="bg-orange-600 text-white px-6 py-4 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition disabled:opacity-50"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : currencies.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <Banknote size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No currencies yet</p>
            <p className="text-sm text-muted-foreground mt-2">Add currencies above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currencies.map((cur) => (
              <div key={cur.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
                {editingId === cur.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-3 flex-wrap">
                    <input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} className="w-24 bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100 uppercase" autoFocus />
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 min-w-[120px] bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100" />
                    <input type="text" value={editSymbol} onChange={(e) => setEditSymbol(e.target.value)} className="w-16 bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100" />
                    <input type="number" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} className="w-28 bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100" />
                    <button onClick={handleEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Banknote size={16} className="text-orange-500" />
                    <span className="font-bold">{cur.code}</span>
                    <span className="text-sm text-muted-foreground">{cur.name}</span>
                    <span className="text-sm font-bold text-orange-600">{cur.symbol}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-bold text-muted-foreground">
                      Threshold: {(cur.payoutThreshold || 10000).toLocaleString()}
                    </span>
                  </div>
                )}
                {editingId !== cur.id && (confirmDelete === cur.id ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDelete(cur.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg hover:bg-muted transition">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEdit(cur)} className="p-2 text-muted-foreground hover:text-orange-500 transition"><Pencil size={16} /></button>
                    <button onClick={() => setConfirmDelete(cur.id)} className="p-2 text-muted-foreground hover:text-red-500 transition"><Trash2 size={16} /></button>
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
