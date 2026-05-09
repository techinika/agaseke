/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Package, Zap, Calendar, Tag, ChevronRight } from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
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
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

const priorityLabels: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  const currentEntries = entries.filter((e) => e.category === "current");
  const plannedEntries = entries.filter((e) => e.category === "planned");

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="bg-gradient-to-br from-orange-600 to-orange-700 pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Changelog
          </h1>
          <p className="text-orange-100 text-lg max-w-2xl mx-auto">
            Track our progress. See what we've built and what's coming next.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 -mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <Package size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">
                      Current Features
                    </h2>
                    <p className="text-sm text-emerald-600">
                      {currentEntries.length} released features
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {currentEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      No current features listed yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="relative pl-6 pb-6 border-l-2 border-emerald-200 last:border-l-0 last:pb-0"
                      >
                        {index !== currentEntries.length - 1 && (
                          <div className="absolute left-[-9px] top-0 w-4 h-4 bg-emerald-500 rounded-lg border-2 border-white shadow-sm" />
                        )}

                        <div className="bg-slate-50 rounded-xl p-5 hover:bg-slate-100 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-bold text-slate-900">
                              {entry.title}
                            </h3>
                            {entry.releaseDate && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                                <Calendar size={12} /> {entry.releaseDate}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 mb-3">
                            {entry.description}
                          </p>

                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Zap size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-blue-900">
                      Coming Soon
                    </h2>
                    <p className="text-sm text-blue-600">
                      {plannedEntries.length} planned features
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {plannedEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      No planned features listed yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plannedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-5 border border-dashed border-slate-200 hover:border-blue-200 hover:from-blue-50/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            {entry.title}
                            <ChevronRight size={14} className="text-blue-400" />
                          </h3>
                          {entry.priority && (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${priorityColors[entry.priority]}`}
                            >
                              {priorityLabels[entry.priority]}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-3">
                          {entry.description}
                        </p>

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium"
                              >
                                <Tag size={10} /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-3">
                Have a feature idea?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                We're always looking for ways to improve Agaseke. If you have a
                feature suggestion or feedback, we'd love to hear from you.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:agasekeforcreators@gmail.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors"
                >
                  Email Us
                </a>
                <a
                  href="/help-center"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Help Center
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
