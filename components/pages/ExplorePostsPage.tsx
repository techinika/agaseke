/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import {
  Search,
  FileText,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader,
  User,
  ArrowRight,
  Eye,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import ExplorePostsSchema from "@/components/seo/ExplorePostsSchema";
import MobileBottomBar from "@/components/parts/MobileBottomBar";
import { LinkifyText } from "@/components/ui/LinkifyText";
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const hasYouTubeLink = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  if (!urls) return null;
  for (const url of urls) {
    if (extractYouTubeId(url)) return url;
  }
  return null;
};

const ITEMS_PER_PAGE = 10;

export default function ExplorePostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [creatorMap, setCreatorMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [documentIndex, setDocumentIndex] = useState<Record<string, number>>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const creatorsSnap = await getDocs(collection(db, "creators"));
      const map = new Map<string, any>();
      const list: any[] = [];
      creatorsSnap.docs.forEach((d) => {
        const data = d.data();
        const entry = {
          name: data.name || d.id,
          handle: d.id,
          uid: data.uid,
          photoURL: data.profilePicture || data.photoURL || null,
        };
        map.set(d.id, entry);
        if (data.uid) map.set(data.uid, entry);
      });
      setCreatorMap(map);
      await fetchPosts(map, null);
      setLoading(false);
    }
    init();
  }, []);

  const fetchPosts = async (cmap: Map<string, any>, cursor: QueryDocumentSnapshot<DocumentData> | null) => {
    try {
      const postsRef = collection(db, "creatorContent");
      let q = query(
        postsRef,
        where("isPrivate", "==", false),
        orderBy("createdAt", "desc"),
        limit(ITEMS_PER_PAGE),
      );
      if (cursor) {
        q = query(q, startAfter(cursor));
      }
      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => {
        const data = d.data();
        const creatorId = data.creatorId || data.creatorUid || "";
        const creator = cmap.get(creatorId) || cmap.get(data.creatorUid) || cmap.get(data.creatorId);
        return {
          id: d.id,
          ...data,
          authorName: creator?.name || creatorId.substring(0, 8) || "Unknown",
          authorHandle: creator?.handle || creatorId,
          authorPhoto: creator?.photoURL || null,
        };
      });
      if (!cursor) {
        setPosts(fetched);
      } else {
        setPosts((prev) => [...prev, ...fetched]);
      }
      const lastDoc = snap.docs[snap.docs.length - 1];
      setLastVisible(lastDoc || null);
      if (snap.docs.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Error fetching posts:", e);
    }
  };

  const loadMore = async () => {
    if (!lastVisible || !hasMore) return;
    setLoadingMore(true);
    await fetchPosts(creatorMap, lastVisible);
    setLoadingMore(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredPosts = searchTerm
    ? posts.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.authorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.authorHandle || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : posts;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <ExplorePostsSchema />
      <header className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">
            Discover{" "}
            <span className="text-orange-600 underline decoration-orange-100">
              Posts
            </span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto mb-10">
            Explore stories, videos, and content from creators across Africa.
          </p>
          <div className="max-w-2xl mx-auto relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-600 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search posts by title, content, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border shadow-xl shadow-border rounded-lg py-6 pl-14 pr-6 text-lg outline-none focus:ring-4 focus:ring-orange-50 transition-all font-medium"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {searchTerm ? `Searching for "${searchTerm}"` : "Latest Public Posts"}
              </h3>
              <span className="text-xs text-muted-foreground">{filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredPosts.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Author Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                    <Link href={`/${item.authorHandle}`} className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                        {item.authorPhoto ? (
                          <img
                            src={item.authorPhoto}
                            alt={item.authorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={18} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${item.authorHandle}`}
                        className="font-bold text-sm hover:text-orange-600 transition-colors"
                      >
                        {item.authorName}
                      </Link>
                      <p className="text-xs text-muted-foreground">@{item.authorHandle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded uppercase tracking-widest text-muted-foreground">
                        {item.type === "video"
                          ? "Video"
                          : item.type === "image"
                            ? "Image"
                            : item.type === "document"
                              ? "Document"
                              : item.type === "article"
                                ? "Article"
                                : "Post"}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 px-2 py-1 rounded uppercase tracking-widest">
                        <Globe size={10} /> Public
                      </span>
                    </div>
                  </div>

                  {/* Media */}
                  {item.type === "article" && (item.coverUrl || item.contentUrl) && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img
                        src={item.coverUrl || item.contentUrl}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}

                  {item.type === "image" && item.contentUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden cursor-zoom-in" onClick={() => setViewingImage(item.contentUrl)}>
                      <img
                        src={item.contentUrl}
                        alt={item.title}
                        className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  )}

                  {item.type === "video" && item.contentUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden bg-black">
                      <video src={item.contentUrl} controls controlsList="nodownload" className="w-full aspect-video" />
                    </div>
                  )}

                  {item.type === "document" && item.contentUrl && (() => {
                    const pages = Array.isArray(item.contentUrl) ? item.contentUrl : [item.contentUrl];
                    const currentIndex = documentIndex[item.id] || 0;
                    const currentUrl = pages[currentIndex] || pages[0];
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
                        {pages.length > 1 && (
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); setDocumentIndex((prev) => ({ ...prev, [item.id]: Math.max(0, currentIndex - 1) })); }}
                              disabled={currentIndex === 0}
                              className="p-1.5 bg-card border rounded-lg disabled:opacity-50"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-muted-foreground">{currentIndex + 1} of {pages.length}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDocumentIndex((prev) => ({ ...prev, [item.id]: Math.min(pages.length - 1, currentIndex + 1) })); }}
                              disabled={currentIndex === pages.length - 1}
                              className="p-1.5 bg-card border rounded-lg disabled:opacity-50"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setViewingDocument({ url: currentUrl, title: item.title })}
                          className="block w-full text-center py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition"
                        >
                          Read Document
                        </button>
                      </div>
                    );
                  })()}

                  {/* Title */}
                  <Link href={`/explore/posts/${item.id}`} className="block group">
                    <h4 className="font-bold text-lg mb-2 group-hover:text-orange-600 transition-colors">
                      {item.title || "Untitled"}
                    </h4>
                  </Link>

                  {/* Description */}
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

                  {/* YouTube Embed */}
                  {(() => {
                    const text = item.description || item.content || "";
                    const ytLink = hasYouTubeLink(text);
                    if (!ytLink) return null;
                    const videoId = extractYouTubeId(ytLink);
                    if (!videoId) return null;
                    return (
                      <div className="mt-3 rounded-lg overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="w-full aspect-video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  })()}

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {item.createdAt?.toDate?.().toLocaleDateString() || "Recently"}
                    </span>
                    {item.views !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {item.views} views
                      </span>
                    )}
                    <Link
                      href={`/explore/posts/${item.id}`}
                      className="flex items-center gap-1 text-orange-600 font-medium hover:underline ml-auto"
                    >
                      View Post <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center mx-auto mb-8 border border-border">
                  <Search size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">No posts found</h3>
                <p className="text-muted-foreground mt-2 font-medium">
                  {searchTerm ? "Try a different search term." : "No public posts have been published yet."}
                </p>
              </div>
            )}

            {hasMore && !searchTerm && (
              <div className="mt-16 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="group relative inline-flex items-center gap-3 bg-card border border-border px-12 py-5 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:border-orange-600 hover:text-orange-600 transition-all disabled:opacity-50 shadow-sm"
                >
                  {loadingMore ? (
                    <Loader size={18} className="animate-spin text-orange-600" />
                  ) : (
                    "Load More Posts"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Image Lightbox */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Post image" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Document Viewer */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingDocument(null)}>
          <div className="bg-background rounded-xl p-4 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg truncate">{viewingDocument.title}</h3>
              <button onClick={() => setViewingDocument(null)} className="p-2 hover:bg-muted rounded-lg">
                <ChevronLeft size={20} />
              </button>
            </div>
            <iframe src={viewingDocument.url} className="w-full flex-1 min-h-[60vh] rounded-lg border border-border" />
          </div>
        </div>
      )}

      <MobileBottomBar />
    </div>
  );
}
