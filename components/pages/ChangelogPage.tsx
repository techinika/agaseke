"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Package, Zap } from "lucide-react";
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

const priorityLabels: Record<string, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const priorityTone: Record<string, string> = {
  high: "text-danger",
  medium: "text-warning",
  low: "text-info",
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
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <section className="border-b border-line bg-canvas px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-label font-semibold text-brand-strong">Product updates</p>
          <div className="mt-2 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-display font-bold tracking-tight text-fg [text-wrap:balance] sm:text-hero">
                Changelog
              </h1>
              <p className="mt-3 text-body-lg text-muted-fg">
                Recent releases and upcoming improvements across Agaseke.
              </p>
            </div>
            <Link
              href="https://whatsapp.com/channel/0029Vb9AemqFy72CiwMyQf06"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({
                variant: "secondary",
                size: "md",
                className: "shrink-0 whitespace-nowrap self-start sm:self-auto",
              })}
            >
              WhatsApp channel
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Released features */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-control bg-success-bg text-success">
                  <Package className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-title font-bold text-fg">
                    Released
                  </h2>
                  <p className="text-caption tabular-nums text-muted-fg">
                    {currentEntries.length} shipped update
                    {currentEntries.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-line px-6">
              {currentEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <Package
                    className="mx-auto mb-3 size-10 text-muted-fg"
                    aria-hidden="true"
                  />
                  <p className="text-label text-muted-fg">
                    No released updates listed yet.
                  </p>
                </div>
              ) : (
                currentEntries.map((entry) => (
                  <article key={entry.id} className="py-5">
                    <h3 className="font-display text-body-lg font-bold text-fg">
                      {entry.title}
                    </h3>
                    {(entry.releaseDate || entry.tags?.length > 0) && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-muted-fg">
                        {entry.releaseDate && (
                          <span className="font-mono tabular-nums">
                            {entry.releaseDate}
                          </span>
                        )}
                        {entry.releaseDate && entry.tags?.length > 0 && (
                          <span aria-hidden="true">·</span>
                        )}
                        {entry.tags?.length > 0 && (
                          <span>{entry.tags.join(" · ")}</span>
                        )}
                      </p>
                    )}
                    <p className="mt-2 text-label leading-relaxed text-muted-fg">
                      {entry.description}
                    </p>
                  </article>
                ))
              )}
            </div>
          </Card>

          {/* Planned + Feedback */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-control bg-info-bg text-info">
                    <Zap className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-title font-bold text-fg">
                      Coming next
                    </h2>
                    <p className="text-caption tabular-nums text-muted-fg">
                      {plannedEntries.length} planned feature
                      {plannedEntries.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-line px-6">
                {plannedEntries.length === 0 ? (
                  <div className="py-12 text-center">
                    <Zap
                      className="mx-auto mb-3 size-10 text-muted-fg"
                      aria-hidden="true"
                    />
                    <p className="text-label text-muted-fg">
                      No planned updates listed yet.
                    </p>
                  </div>
                ) : (
                  plannedEntries.map((entry) => (
                    <article key={entry.id} className="py-5">
                      <h3 className="font-display text-body-lg font-bold text-fg">
                        {entry.title}
                      </h3>
                      {(entry.priority || entry.tags?.length > 0) && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-muted-fg">
                          {entry.priority && (
                            <span
                              className={`font-semibold ${priorityTone[entry.priority] || "text-muted-fg"}`}
                            >
                              {priorityLabels[entry.priority] || entry.priority}
                            </span>
                          )}
                          {entry.priority && entry.tags?.length > 0 && (
                            <span aria-hidden="true">·</span>
                          )}
                          {entry.tags?.length > 0 && (
                            <span>{entry.tags.join(" · ")}</span>
                          )}
                        </p>
                      )}
                      <p className="mt-2 text-label leading-relaxed text-muted-fg">
                        {entry.description}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-display text-body-lg font-bold text-fg">
                Have a feature idea?
              </h3>
              <p className="mt-1.5 text-label text-muted-fg">
                Share feedback directly with our team or explore the help center.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="mailto:hello@agaseke.me"
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  Email us
                </a>
                <Link
                  href="/help-center"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Help center
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
