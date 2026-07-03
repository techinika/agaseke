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
import { Tag, Plus, Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, name: d.data().name || "" })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { toast.error("Enter a category name"); return; }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Category already exists"); return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, "categories"), { name, createdAt: serverTimestamp() });
      setNewName("");
      toast.success("Category added");
    } catch { toast.error("Failed to add category"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "categories", id));
      toast.success("Category deleted");
      setConfirmDelete(null);
    } catch { toast.error("Failed to delete"); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleEdit = async () => {
    const name = editName.trim();
    if (!name) { toast.error("Category name cannot be empty"); return; }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingId)) {
      toast.error("Category already exists"); return;
    }
    try {
      await updateDoc(doc(db, "categories", editingId!), { name });
      toast.success("Category updated");
      setEditingId(null);
      setEditName("");
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase">Categories</h1>
            <p className="text-sm text-muted-foreground">
              Manage creator focus categories shown in settings.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="New category name..."
              className="flex-1 bg-muted p-4 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
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
        ) : categories.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <Tag size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No categories yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add categories above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                      className="flex-1 bg-muted p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                      autoFocus
                    />
                    <button onClick={handleEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Tag size={16} className="text-orange-500" />
                    <span className="font-bold">{cat.name}</span>
                  </div>
                )}
                {editingId !== cat.id && (confirmDelete === cat.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg hover:bg-muted transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEdit(cat)} className="p-2 text-muted-foreground hover:text-orange-500 transition">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setConfirmDelete(cat.id)} className="p-2 text-muted-foreground hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
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
