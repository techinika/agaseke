/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Lock,
  Globe,
  Heart,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db/firebase";
import { collection, getCountFromServer, doc, updateDoc, increment } from "firebase/firestore";

interface CommunityTabProps {
  publicPosts: any[];
  privatePosts: any[];
  isSupporter: boolean;
  name: string;
  compact?: boolean;
  username?: string;
}

export const CommunityTab = ({
  publicPosts,
  privatePosts,
  isSupporter,
  name,
  compact = false,
  username = "",
}: CommunityTabProps) => {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const allPosts = isSupporter
    ? [...privatePosts, ...publicPosts].sort(
        (a, b) =>
          (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
      )
    : publicPosts;

  const displayPosts = compact ? allPosts.slice(0, 2) : allPosts;
  const hasMorePosts = allPosts.length > 2;
  const visiblePrivatePosts = privatePosts.length;

  const [counts, setCounts] = useState<Record<string, { likes: number; comments: number }>>({});
  const viewedPosts = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      const newCounts: Record<string, { likes: number; comments: number }> = {};
      await Promise.all(
        displayPosts.map(async (post) => {
          try {
            const [likesSnap, commentsSnap] = await Promise.all([
              getCountFromServer(collection(db, "creatorContent", post.id, "likes")),
              getCountFromServer(collection(db, "creatorContent", post.id, "comments")),
            ]);
            newCounts[post.id] = { likes: likesSnap.data().count, comments: commentsSnap.data().count };
          } catch { newCounts[post.id] = { likes: 0, comments: 0 }; }
        }),
      );
      setCounts(newCounts);
    };
    if (displayPosts.length > 0) fetchCounts();
  }, [displayPosts.map((p) => p.id).join(",")]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || displayPosts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const postId = entry.target.getAttribute("data-post-id");
          if (!postId || viewedPosts.current.has(postId)) continue;
          viewedPosts.current.add(postId);
          const postRef = doc(db, "creatorContent", postId);
          updateDoc(postRef, { views: increment(1) }).catch(() => {});
        }
      },
      { threshold: 0.3 },
    );

    const cards = container.querySelectorAll("[data-post-id]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [displayPosts.map((p) => p.id).join(",")]);

  if (allPosts.length === 0) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="text-center py-20 bg-muted rounded-3xl border-2 border-dashed border-border-strong">
          <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="text-muted-foreground" size={24} />
          </div>
          <h3 className="font-bold text-foreground">No posts yet</h3>
          <p className="text-muted-foreground text-sm">
            When {name} shares updates, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {isSupporter && visiblePrivatePosts > 0 && (
        <div className="bg-gradient-to-r from-orange-50 dark:from-orange-950/50 to-amber-50 dark:to-amber-950/50 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50 flex items-center gap-3">
          <Heart size={20} className="text-orange-500 fill-orange-500" />
          <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
            You have access to {visiblePrivatePosts} supporter-only{" "}
            {visiblePrivatePosts === 1 ? "post" : "posts"}!
          </p>
        </div>
      )}

      <div ref={containerRef} className="grid grid-cols-1 gap-6">
        {displayPosts.map((item) => (
          <div
            key={item.id}
            data-post-id={item.id}
            className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded uppercase tracking-widest text-muted-foreground">
                {item.type === "video"
                  ? "Video"
                  : item.type === "image"
                    ? "Image"
                    : item.type === "document"
                      ? "Document"
                      : "Post"}
              </span>
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                  item.isPrivate
                    ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                    : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                }`}
              >
                {item.isPrivate ? (
                  <>
                    <Lock size={10} /> Supporters Only
                  </>
                ) : (
                  <>
                    <Globe size={10} /> Public
                  </>
                )}
              </span>
            </div>

            {item.type === "image" && item.contentUrl && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img
                  src={item.contentUrl}
                  alt={item.title}
                  className="w-full max-h-64 object-cover"
                />
              </div>
            )}

            {item.type === "video" && item.contentUrl && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <video
                  src={item.contentUrl}
                  controls
                  className="w-full max-h-64 object-cover bg-black"
                />
              </div>
            )}

            {item.type === "document" && item.contentUrl && (
              <a
                href={item.contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 flex items-center gap-3 p-4 bg-muted rounded-lg border border-border hover:bg-card-hover transition-colors"
              >
                <FileText size={24} className="text-orange-500" />
                <span className="text-sm font-medium text-foreground">
                  Download Document
                </span>
              </a>
            )}

            <Link href={`/${username}/community/${item.id}`} className="block group">
              <h4 className="font-bold text-lg mb-2 group-hover:text-orange-600 transition-colors">{item.title}</h4>
            </Link>
            {item.description || item.content ? (
              <div className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                {(item.description || item.content).length > 200 &&
                !expandedPosts.has(item.id) ? (
                  <>
                    <span>
                      {(item.description || item.content).slice(0, 200)}...
                    </span>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="ml-1 text-orange-600 font-medium hover:underline"
                    >
                      Read more
                    </button>
                  </>
                ) : (
                  <>
                    <span>{item.description || item.content}</span>
                    {(item.description || item.content).length > 200 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="ml-1 text-orange-600 font-medium hover:underline"
                      >
                        Read less
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : null}

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {item.createdAt?.toDate?.().toLocaleDateString() ||
                  "Recently"}
              </span>
              {item.views && (
                <span>{item.views} views</span>
              )}
              {counts[item.id] && (
                <div className="flex items-center gap-3 ml-auto">
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {counts[item.id].likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} /> {counts[item.id].comments}
                  </span>
                </div>
              )}
              <Link
                href={`/${username}/community/${item.id}`}
                className="flex items-center gap-1 text-orange-600 font-medium hover:underline"
              >
                View Post <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {compact && hasMorePosts && (
        <div className="text-center">
          <Link
            href={`/${username}/community`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition shadow-lg"
          >
            See All Posts <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
};
