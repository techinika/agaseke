/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Calendar,
  Tag,
  Package,
  Zap,
  Search
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import Loading from "@/app/loading";

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  category: "current" | "planned";
  tags: string[];
  releaseDate?: string;
  priority?: "high" | "medium" | "low";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const tagOptions = [
  "store",
  "notifications",
  "content",
  "payments",
  "discovery",
  "analytics",
  "security",
  "general",
  "messaging",
  "seo",
  "api",
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

export default function AdminChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "current" | "planned">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "planned" as "current" | "planned",
    tags: [] as string[],
    releaseDate: "",
    priority: "medium" as "high" | "medium" | "low",
  });

  useEffect(() => {
    const q = query(collection(db, "changelog"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChangelogEntry[];
      setEntries(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "planned",
      tags: [],
      releaseDate: "",
      priority: "medium",
    });
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      if (editingEntry) {
        await updateDoc(doc(db, "changelog", editingEntry.id), {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          releaseDate: formData.releaseDate || null,
          priority: formData.priority,
          updatedAt: serverTimestamp(),
        });
        toast.success("Entry updated successfully");
      } else {
        await addDoc(collection(db, "changelog"), {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          releaseDate: formData.releaseDate || null,
          priority: formData.priority,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Entry added successfully");
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast.error("Failed to save entry");
    }
  };

  const handleEdit = (entry: ChangelogEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      description: entry.description,
      category: entry.category,
      tags: entry.tags || [],
      releaseDate: entry.releaseDate || "",
      priority: entry.priority || "medium",
    });
    setShowForm(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      await deleteDoc(doc(db, "changelog", entryId));
      toast.success("Entry deleted successfully");
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter !== "all" && entry.category !== filter) return false;
    if (tagFilter !== "all" && !entry.tags?.includes(tagFilter)) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        entry.title.toLowerCase().includes(search) ||
        entry.description.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const currentEntries = filteredEntries.filter(
    (e) => e.category === "current",
  );
  const plannedEntries = filteredEntries.filter(
    (e) => e.category === "planned",
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
              Changelog
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Manage current features and plan future features
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 transition shadow-sm"
          >
            <Plus size={16} /> Add Entry
          </button>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
            {(["all", "current", "planned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${
                  filter === f
                    ? "bg-orange-100 text-orange-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "current"
                    ? "Current Features"
                    : "Planned"}
              </button>
            ))}
          </div>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="all">All Tags</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {showForm && (
          <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {editingEntry ? "Edit Entry" : "New Changelog Entry"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., New Notification System"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as "current" | "planned",
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="current">Current Feature</option>
                      <option value="planned">Planned Feature</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as "high" | "medium" | "low",
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar size={12} /> Release Date (for current features)
                  </label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, releaseDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Tag size={12} /> Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          formData.tags.includes(tag)
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the feature or change in detail..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 transition shadow-sm"
                >
                  <Save size={16} />{" "}
                  {editingEntry ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Package size={20} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Current Features{" "}
                  <span className="text-sm font-normal text-slate-400">
                    ({currentEntries.length})
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Released and available to users
                </p>
              </div>
            </div>

            {currentEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  No current features yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-900">
                            {entry.title}
                          </h3>
                          {entry.priority && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColors[entry.priority]}`}
                            >
                              {entry.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          {entry.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {entry.releaseDate && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar size={10} /> {entry.releaseDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Planned Features{" "}
                  <span className="text-sm font-normal text-slate-400">
                    ({plannedEntries.length})
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Coming soon or in development
                </p>
              </div>
            </div>

            {plannedEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  No planned features yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plannedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-900">
                            {entry.title}
                          </h3>
                          {entry.priority && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColors[entry.priority]}`}
                            >
                              {entry.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          {entry.description}
                        </p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
