/* eslint-disable @next/next/no-img-element -- article cover images may be arbitrary creator CDN URLs */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Eye,
  MessageCircle,
} from "lucide-react";
import type { PublicArticleListItem } from "@/lib/articleReader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";

function formatArticleDate(value: string | null): string {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ArticlesIndexPage({
  initialArticles = [],
}: {
  initialArticles: PublicArticleListItem[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredArticles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return initialArticles;
    const terms = q.split(/\s+/).filter(Boolean);
    return initialArticles.filter((article) => {
      const haystack = [
        article.title,
        article.shortDescription,
        article.creatorName,
        article.creatorHandle,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [initialArticles, searchTerm]);

  return (
    <div className="bg-canvas pb-12 text-fg">
      <section className="border-b border-line bg-surface-sunken px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand-strong">
              <BookOpen className="size-4" aria-hidden="true" />
              Editorial reading
            </p>
            <h1 className="mt-2 text-display font-black tracking-tight text-fg sm:text-hero [text-wrap:balance]">
              Articles &amp; essays
            </h1>
            <p className="mt-3 text-body-lg text-muted-fg">
              Long-form writing, guides, and stories published directly by creators across Agaseke.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              label="Search articles"
              placeholder="Search by title, topic, or author…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClear={() => setSearchTerm("")}
              className="w-full sm:max-w-md"
              autoComplete="off"
            />

            <nav
              aria-label="Explore sections"
              className="inline-flex items-center gap-1 self-start rounded-control border border-line bg-surface p-1"
            >
              <Link
                href="/explore"
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                Creators
              </Link>
              <Link
                href="/explore/posts"
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
              >
                Posts &amp; articles
              </Link>
              <span
                aria-current="page"
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-control bg-brand-strong px-4 text-label font-semibold text-on-brand"
              >
                Articles
              </span>
            </nav>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-caption font-semibold text-muted-fg">
            {searchTerm.trim()
              ? `Matching "${searchTerm.trim()}"`
              : "Latest public articles"}
          </h2>
          <p aria-live="polite" className="text-label tabular-nums text-muted-fg">
            {filteredArticles.length} article{filteredArticles.length === 1 ? "" : "s"}
          </p>
        </div>

        {filteredArticles.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-6" aria-hidden="true" />}
            title={
              searchTerm.trim()
                ? "No articles match your search"
                : "No public articles published yet"
            }
            description={
              searchTerm.trim()
                ? "Try another keyword or clear your search filter."
                : "Check back soon or browse short-form posts from creators."
            }
            action={
              searchTerm.trim() ? (
                <Button variant="secondary" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              ) : (
                <Link
                  href="/explore/posts"
                  className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-strong px-5 text-label font-semibold text-on-brand hover:opacity-95"
                >
                  Browse public posts
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredArticles.map((article) => {
              const articleHref = `/articles/${article.slug}`;
              return (
                <Card
                  key={article.id}
                  className="flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-card"
                >
                  {article.coverUrl && (
                    <Link
                      href={articleHref}
                      className="block overflow-hidden border-b border-line bg-surface-raised"
                    >
                      <img
                        src={article.coverUrl}
                        alt={article.title}
                        className="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </Link>
                  )}

                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                    <div>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-caption text-muted-fg">
                        <span className="inline-flex items-center gap-1 font-semibold text-brand-strong">
                          <BookOpen className="size-3.5" aria-hidden="true" />
                          Article
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">{article.readingMinutes} min read</span>
                        <span>·</span>
                        <span>{formatArticleDate(article.createdAt)}</span>
                      </p>

                      <Link href={articleHref} className="group mt-2.5 block">
                        <h3 className="text-title font-bold tracking-tight text-fg transition-colors group-hover:text-brand-strong">
                          {article.title}
                        </h3>
                      </Link>

                      {article.shortDescription && (
                        <p className="mt-2 line-clamp-2 text-body leading-relaxed text-muted-fg">
                          {article.shortDescription}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                      <Link
                        href={article.creatorHandle ? `/${article.creatorHandle}` : "/explore"}
                        className="flex min-w-0 items-center gap-2.5 group"
                      >
                        <Avatar
                          src={article.creatorAvatar}
                          name={article.creatorName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate text-label font-bold text-fg group-hover:text-brand-strong">
                            <span className="truncate">{article.creatorName}</span>
                            {article.creatorVerified && (
                              <BadgeCheck
                                className="size-3.5 shrink-0 text-brand-strong"
                                aria-label="Verified creator"
                              />
                            )}
                          </p>
                          <p className="flex items-center gap-2 text-caption tabular-nums text-muted-fg">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="size-3" aria-hidden="true" />
                              {article.views}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="size-3" aria-hidden="true" />
                              {article.commentCount}
                            </span>
                          </p>
                        </div>
                      </Link>

                      <Link
                        href={articleHref}
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-label font-semibold text-brand-strong transition-colors hover:bg-brand-soft"
                      >
                        Read article
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
