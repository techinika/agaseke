"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Zap, Calendar, Tag, ChevronRight, MessageCircle } from "lucide-react";
import { db } from "@/db/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { LoadingState } from "@/components/ui/LoadingState";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
  high: "bg-danger-bg text-danger border-danger/20",
  medium: "bg-warning-bg text-warning border-warning/20",
  low: "bg-info-bg text-info border-info/20",
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
    let active = true;

    try {
      const q = query(collection(db, "changelog"), orderBy("createdAt", "desc"));

      getDocs(q)
        .then((snapshot) => {
          if (!active) return;
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ChangelogEntry[];
          setEntries(data);
        })
        .catch((err) => {
          console.error("Failed to fetch changelog entries", err);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch (err) {
      console.error("Failed to initialize changelog query", err);
      queueMicrotask(() => setLoading(false));
    }

    return () => {
      active = false;
    };
  }, []);

  const currentEntries = entries.filter((e) => e.category === "current");
  const plannedEntries = entries.filter((e) => e.category === "planned");

  if (loading) {
    return <LoadingState variant="list" />;
  }

  return (
    <div className="min-h-screen bg-surface-sunken pb-20 text-fg">
      <section className="bg-brand-strong px-4 pb-28 pt-20 text-on-brand sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-display font-black text-on-brand sm:text-hero">
            Changelog
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-on-brand/90">
            Track our progress. See what we&apos;ve built and what&apos;s coming next.
          </p>
          <Link
            href="https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-pill border border-on-brand/30 bg-on-brand/10 px-5 py-2.5 text-label font-bold text-on-brand transition-colors hover:bg-on-brand/20"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Get announcements &
            new features on our WhatsApp Channel
          </Link>
        </div>
      </section>

      <main className="mx-auto -mt-20 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <Card className="overflow-hidden">
            <div className="border-b border-success/20 bg-success-bg px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-control bg-success text-on-brand">
                  <Package className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-heading font-bold text-fg">Current Features</h2>
                  <p className="text-label text-success">
                    {currentEntries.length} released features
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {currentEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <Package
                    className="mx-auto mb-3 size-12 text-muted-fg"
                    aria-hidden="true"
                  />
                  <p className="text-muted-fg">No current features listed yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="relative border-l-2 border-success/30 pb-6 pl-6 last:border-l-0 last:pb-0"
                    >
                      {index !== currentEntries.length - 1 && (
                        <div className="absolute left-[-9px] top-0 size-4 rounded-pill border-2 border-surface bg-success" />
                      )}

                      <div className="rounded-control bg-surface-sunken p-5 transition-colors hover:bg-surface-raised">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="font-bold text-fg">{entry.title}</h3>
                          {entry.releaseDate && (
                            <span className="flex items-center gap-1 whitespace-nowrap text-caption text-muted-fg">
                              <Calendar className="size-3" aria-hidden="true" />{" "}
                              {entry.releaseDate}
                            </span>
                          )}
                        </div>

                        <p className="mb-3 text-label text-muted-fg">
                          {entry.description}
                        </p>

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-pill border border-line bg-surface px-2.5 py-1 text-caption font-medium text-muted-fg"
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
          </Card>

          <div>
            <Card className="overflow-hidden">
              <div className="border-b border-info/20 bg-info-bg px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-control bg-info text-on-brand">
                    <Zap className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-heading font-bold text-fg">Coming Soon</h2>
                    <p className="text-label text-info">
                      {plannedEntries.length} planned features
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {plannedEntries.length === 0 ? (
                  <div className="py-12 text-center">
                    <Zap
                      className="mx-auto mb-3 size-12 text-muted-fg"
                      aria-hidden="true"
                    />
                    <p className="text-muted-fg">No planned features listed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plannedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-control border border-dashed border-line bg-surface-sunken p-5 transition-colors hover:border-info/30 hover:bg-surface-raised"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="flex items-center gap-2 font-bold text-fg">
                            {entry.title}
                            <ChevronRight
                              className="size-3.5 text-info"
                              aria-hidden="true"
                            />
                          </h3>
                          {entry.priority && (
                            <span
                              className={`rounded-pill border px-2.5 py-1 text-caption font-bold uppercase ${priorityColors[entry.priority]}`}
                            >
                              {priorityLabels[entry.priority]}
                            </span>
                          )}
                        </div>

                        <p className="mb-3 text-label text-muted-fg">
                          {entry.description}
                        </p>

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-pill bg-info-bg px-2.5 py-1 text-caption font-medium text-info"
                              >
                                <Tag className="size-2.5" aria-hidden="true" /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="mt-6 p-6">
              <h3 className="mb-3 font-bold text-fg">Have a feature idea?</h3>
              <p className="mb-4 text-label text-muted-fg">
                We&apos;re always looking for ways to improve Agaseke. If you have a
                feature suggestion or feedback, we&apos;d love to hear from you.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:hello@agaseke.me"
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  Email Us
                </a>
                <Link
                  href="/help-center"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Help Center
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
