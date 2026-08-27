/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  MessageCircle,
  Heart,
  Lock,
  Share2,
  User,
  Calendar,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { baseUrl } from "@/lib/baseUrl";

interface ArticleReaderData {
  id: string;
  title: string;
  shortDescription: string;
  htmlContent: string;
  coverUrl: string;
  slug: string;
  isPrivate: boolean;
  commentCount: number;
  views: number;
  createdAt: string | null;
}

interface CreatorReaderData {
  name: string;
  handle: string;
  uid: string;
  photoURL: string | null;
  bio: string;
}

export default function ArticleReaderPage({
  article,
  creator,
}: {
  article: ArticleReaderData;
  creator: CreatorReaderData;
}) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    const url = `${baseUrl}/articles/${article.slug}`;
    setSharing(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: article.title,
            text: article.shortDescription || `Read "${article.title}"`,
            url,
          });
          return;
        } catch (err) {
          if ((err as any)?.name === "AbortError") return;
        }
      }
      await navigator.clipboard?.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to share");
    } finally {
      setSharing(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Recently";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/explore/posts"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition inline-flex"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Explore</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm font-medium hover:bg-muted/80 transition"
            disabled={sharing}
          >
            {sharing ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        <article className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {article.coverUrl && (
            <div className="aspect-[16/9] bg-muted w-full">
              <img
                src={article.coverUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded uppercase tracking-widest">
                Article
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={12} />
                {formatDate(article.createdAt)}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye size={12} /> {article.views}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle size={12} /> {article.commentCount}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {article.title}
            </h1>

            <Link
              href={`/${creator.handle}`}
              className="flex items-center gap-3 mb-8 group"
            >
              <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                {creator.photoURL ? (
                  <img
                    src={creator.photoURL}
                    alt={creator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm group-hover:text-orange-600 transition-colors">
                  {creator.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{creator.handle}
                  {creator.bio ? ` · ${creator.bio.slice(0, 60)}` : ""}
                </p>
              </div>
            </Link>

            {article.isPrivate ? (
              <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-8 text-center">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="font-bold text-lg text-foreground mb-2">
                  {article.title}
                </h2>
                {article.shortDescription && (
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    {article.shortDescription}
                  </p>
                )}
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-6">
                  This article is exclusive to {creator.name}&apos;s
                  supporters. Become a supporter to unlock the full story.
                </p>
                <button
                  onClick={() => setSupportOpen(true)}
                  className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition"
                >
                  <Heart size={18} className="fill-current" />
                  Support {creator.name}
                </button>
              </div>
            ) : (
              <div className="mb-8">
                {article.shortDescription && (
                  <p className="text-base text-muted-foreground italic leading-relaxed mb-8 border-l-4 border-orange-200 dark:border-orange-900 pl-4">
                    {article.shortDescription}
                  </p>
                )}
                <RichContentRenderer html={article.htmlContent} />
              </div>
            )}
          </div>

          <div className="px-6 md:px-10 py-5 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Link
                href={`/${creator.handle}`}
                className="text-orange-600 font-medium hover:underline"
              >
                View {creator.name}&apos;s profile
              </Link>
            </div>
            <button
              onClick={() => setSupportOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg font-medium"
            >
              <Heart size={16} />
              Support
            </button>
          </div>
        </article>
      </div>

      <SupportModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        creatorName={creator.name}
        creatorId={creator.handle}
        uid={creator.uid}
        includeReferral={false}
        defaultMessage={
          article.title
            ? `I love this article! "${article.title}"`
            : "I love this article!"
        }
      />
    </div>
  );
}