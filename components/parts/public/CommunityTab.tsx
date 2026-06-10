/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Lock,
  Globe,
  Heart,
  ArrowRight,
  MessageCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { LinkifyText } from "@/components/ui/LinkifyText";
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
  const [viewingImage, setViewingImage] = useState<{ url: string } | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const hasYouTubeLink = (text: string): string | null => {
    const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)[^\s]+/gi;
    const match = text.match(urlPattern);
    if (match) return match[0];
    return null;
  };

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
              <div className="mb-3 rounded-lg overflow-hidden cursor-zoom-in" onClick={() => setViewingImage({ url: item.contentUrl })}>
                <img
                  src={item.contentUrl}
                  alt={item.title}
                  className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                />
              </div>
            )}

            {item.type === "video" && (
              <>
                {item.contentUrl ? (
                  <div className="mb-3 rounded-lg overflow-hidden bg-black">
                    <video
                      src={item.contentUrl}
                      controls
                      controlsList="nodownload"
                      className="w-full aspect-video"
                    />
                  </div>
                ) : (() => {
                  const text = item.description || item.content || "";
                  const youtubeUrl = hasYouTubeLink(text);
                  const videoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
                  if (!videoId) return null;
                  return (
                    <div className="mb-3 rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                })()}
              </>
            )}

            {item.type === "document" && item.contentUrl && (() => {
              const pages = Array.isArray(item.contentUrl) ? item.contentUrl : [item.contentUrl];
              return (
                <div className="mb-3 bg-muted rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText size={24} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">Document</p>
                      <p className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingDocument({ url: pages[0], title: item.title })}
                    className="block w-full text-center py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition"
                  >
                    Read Document
                  </button>
                </div>
              );
            })()}

            <Link href={`/${username}/community/${item.id}`} className="block group">
              <h4 className="font-bold text-lg mb-2 group-hover:text-orange-600 transition-colors">{item.title}</h4>
            </Link>
            {item.description || item.content ? (
              <div className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                {(item.description || item.content).length > 200 &&
                !expandedPosts.has(item.id) ? (
                  <>
                    <LinkifyText text={(item.description || item.content).slice(0, 200)} />
                    <span>...</span>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="ml-1 text-orange-600 font-medium hover:underline"
                    >
                      Read more
                    </button>
                  </>
                ) : (
                  <>
                    <LinkifyText text={item.description || item.content} />
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

      {viewingImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingImage(null)}>
          <button className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition" onClick={() => setViewingImage(null)}>
            <X size={28} />
          </button>
          <img src={viewingImage.url} alt="Full size" className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-200" />
        </div>
      )}

      {viewingDocument && (
        <div className="fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setViewingDocument(null)}>
          <div className="bg-card w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground truncate">{viewingDocument.title}</h3>
              <div className="flex items-center gap-2">
                <a href={viewingDocument.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 font-medium hover:underline">Open original</a>
                <button onClick={() => setViewingDocument(null)} className="p-2 hover:bg-muted rounded-full"><X size={20} /></button>
              </div>
            </div>
            <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocument.url)}&embedded=true`} className="w-full h-[80vh] bg-card" title="Document Viewer" />
          </div>
        </div>
      )}
    </div>
  );
};
