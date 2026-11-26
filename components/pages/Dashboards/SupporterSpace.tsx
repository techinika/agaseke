/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Compass,
  ExternalLink,
  FileText,
  Heart,
  Lock,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import {
  formatVisibilityLabel,
  isGatedVisibility,
  resolvePostVisibility,
} from "@/lib/contentAccess";
import { estimateReadingMinutes } from "@/lib/readingTime";
import { formatMoney as formatCurrency } from "@/lib/format/money";

const LazySupportSheet = lazy(() =>
  import("@/features/support").then((m) => ({
    default: m.SupportSheet,
  })),
);

interface FollowedCreator {
  handle: string;
  uid?: string;
  name: string;
  photoURL: string | null;
  bio: string;
}

const CHUNK_SIZE = 10;

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatDate(value: any): string {
  const ms = toMillis(value);
  if (!ms) return "Recently";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(type?: string): string {
  if (type === "video") return "Video";
  if (type === "image") return "Image";
  if (type === "document") return "Document";
  if (type === "article") return "Article";
  return "Post";
}

export default function SupporterSpace() {
  const auth = useAuth();
  const router = useRouter();
  const uid = auth.user?.uid;

  const [activeTab, setActiveTab] = useState("feed");
  const [feedScope, setFeedScope] = useState<"following" | "discover">("following");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [followedCreators, setFollowedCreators] = useState<FollowedCreator[]>([]);
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [discoverPosts, setDiscoverPosts] = useState<any[]>([]);
  const [discoverHasMore, setDiscoverHasMore] = useState(false);
  const [discoverError, setDiscoverError] = useState(false);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [loadingMoreDiscover, setLoadingMoreDiscover] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [supportItem, setSupportItem] = useState<any>(null);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    postId: string;
    isPrivate: boolean;
    title: string;
  } | null>(null);

  const loadDiscoverPosts = useCallback(async (offset: number, append: boolean) => {
    try {
      if (append) {
        setLoadingMoreDiscover(true);
      } else {
        setLoadingDiscover(true);
        setDiscoverError(false);
      }
      const res = await fetch(`/api/public/explore?kind=posts&limit=10&offset=${offset}`);
      if (!res.ok) {
        if (!append) setDiscoverError(true);
        return;
      }
      const data = (await res.json()) as { items?: any[]; hasMore?: boolean };
      const items = Array.isArray(data.items) ? data.items : [];
      setDiscoverPosts((prev) => {
        if (!append) return items;
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...items.filter((item) => !seen.has(item.id))];
      });
      setDiscoverHasMore(Boolean(data.hasMore));
      setDiscoverError(false);
    } catch (error) {
      console.error("Error loading discover posts:", error);
      if (!append) setDiscoverError(true);
    } finally {
      setLoadingDiscover(false);
      setLoadingMoreDiscover(false);
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    const currentUid = uid;
    let cancelled = false;

    async function loadSupporterHub() {
      try {
        const [supportSnap, ordersSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "supportedCreators"),
              where("supporterId", "==", uid),
              limit(60),
            ),
          ),
          getDocs(
            query(
              collection(db, "storeOrders"),
              where("buyerId", "==", uid),
              limit(20),
            ),
          ),
          loadDiscoverPosts(0, false),
        ]);

        if (cancelled) return;

        const handles = Array.from(
          new Set(
            supportSnap.docs
              .map((docSnap) => String(docSnap.data().creatorId || "").trim())
              .filter(Boolean),
          ),
        );

        const creatorList: FollowedCreator[] = [];
        const creatorByKey = new Map<string, FollowedCreator>();

        if (handles.length > 0) {
          const handleChunks = chunkArray(handles, 30);
          const creatorSnaps = await Promise.all(
            handleChunks.map((chunk) =>
              getDocs(
                query(collection(db, "creators"), where(documentId(), "in", chunk)),
              ),
            ),
          );

          for (const snap of creatorSnaps) {
            for (const docSnap of snap.docs) {
              const data = docSnap.data();
              const entry: FollowedCreator = {
                handle: docSnap.id,
                uid: typeof data.uid === "string" ? data.uid : undefined,
                name: typeof data.name === "string" && data.name ? data.name : docSnap.id,
                photoURL: data.profilePicture || data.photoURL || null,
                bio: typeof data.bio === "string" ? data.bio : "",
              };
              creatorList.push(entry);
              creatorByKey.set(docSnap.id, entry);
              if (entry.uid) creatorByKey.set(entry.uid, entry);
            }
          }
        }

        // Fetch bounded posts only for followed creators (max 30 handles in chunks of 10)
        const postBuckets: any[] = [];
        const activeHandles = handles.slice(0, 30);
        if (activeHandles.length > 0) {
          const idChunks = chunkArray(activeHandles, CHUNK_SIZE);
          const postSnaps = await Promise.all(
            idChunks.map((chunk) =>
              getDocs(
                query(
                  collection(db, "creatorContent"),
                  where("creatorId", "in", chunk),
                  orderBy("createdAt", "desc"),
                  limit(10),
                ),
              ).catch(() =>
                getDocs(
                  query(
                    collection(db, "creatorContent"),
                    where("creatorId", "in", chunk),
                    limit(10),
                  ),
                ),
              ),
            ),
          );

          const seenIds = new Set<string>();
          for (const snap of postSnaps) {
            for (const docSnap of snap.docs) {
              if (seenIds.has(docSnap.id)) continue;
              const data = docSnap.data();
              if (data.status === "draft") continue;
              seenIds.add(docSnap.id);

              const creatorKey = String(data.creatorId || data.creatorUid || "");
              const author =
                creatorByKey.get(creatorKey) ||
                creatorByKey.get(String(data.creatorUid || ""));
              postBuckets.push({
                id: docSnap.id,
                ...data,
                authorName: author?.name || creatorKey,
                authorHandle: author?.handle || creatorKey,
                authorPhoto: author?.photoURL || null,
              });
            }
          }
          postBuckets.sort(
            (a, b) =>
              (toMillis(b.publishedAt) || toMillis(b.createdAt)) -
              (toMillis(a.publishedAt) || toMillis(a.createdAt)),
          );
        }

        const orderList = ordersSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => toMillis((b as any).createdAt) - toMillis((a as any).createdAt));

        if (!cancelled) {
          setFollowedCreators(creatorList);
          setFollowingPosts(postBuckets);
          setPurchases(orderList);
          if (postBuckets.length === 0) {
            setFeedScope("discover");
          }
        }
      } catch (error) {
        console.error("Failed to load supporter space:", error);
      } finally {
        if (!cancelled) setLoadedUid(currentUid);
      }
    }

    void loadSupporterHub();
    return () => {
      cancelled = true;
    };
  }, [uid, loadDiscoverPosts]);

  const activeFeed = feedScope === "following" ? followingPosts : discoverPosts;

  const filteredPosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return activeFeed;
    return activeFeed.filter(
      (item) =>
        String(item.title || "")
          .toLowerCase()
          .includes(term) ||
        String(item.description || "")
          .toLowerCase()
          .includes(term) ||
        String(item.authorName || "")
          .toLowerCase()
          .includes(term) ||
        String(item.authorHandle || "")
          .toLowerCase()
          .includes(term),
    );
  }, [activeFeed, searchTerm]);

  const filteredCreators = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return followedCreators;
    return followedCreators.filter(
      (creator) =>
        creator.name.toLowerCase().includes(term) ||
        creator.handle.toLowerCase().includes(term) ||
        creator.bio.toLowerCase().includes(term),
    );
  }, [followedCreators, searchTerm]);

  const tabs: TabItem[] = [
    { id: "feed", label: "Feed", icon: <FileText className="size-4" aria-hidden="true" /> },
    {
      id: "creators",
      label: "Following",
      icon: <Users className="size-4" aria-hidden="true" />,
      badge: followedCreators.length || undefined,
    },
    {
      id: "orders",
      label: "Purchases",
      icon: <ShoppingBag className="size-4" aria-hidden="true" />,
      badge: purchases.length || undefined,
    },
  ];

  if (auth.loading || (Boolean(uid) && loadedUid !== uid)) {
    return <LoadingState variant="feed" />;
  }

  const firstName = auth.profile?.displayName?.split(" ")[0] || "Supporter";
  const creatorHandle = auth.creator?.handle || auth.profile?.username;

  return (
    <div className="bg-canvas pb-10 text-fg">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-black tracking-tight text-fg">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-body text-muted-fg">
              Updates from creators you follow, your orders, and quick account links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {auth.isCreator && creatorHandle && (
              <Link
                href={`/${creatorHandle}`}
                className={buttonClasses({ variant: "secondary", size: "md" })}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                View my page
              </Link>
            )}
            <Link
              href="/explore"
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              <Compass className="size-4" aria-hidden="true" />
              Explore
            </Link>
            <Link
              href={auth.isCreator ? "/creator" : "/onboarding"}
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {auth.isCreator ? "Creator Studio" : "Start Creator Page"}
            </Link>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                items={tabs}
                value={activeTab}
                onChange={setActiveTab}
                ariaLabel="Supporter sections"
                className="sm:border-b-0"
              />
              {activeTab !== "orders" && (
                <SearchInput
                  label="Search feed or creators"
                  placeholder="Filter by creator or topic…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm("")}
                  className="w-full sm:max-w-xs"
                />
              )}
            </div>

            {activeTab === "feed" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className="inline-flex items-center gap-1 rounded-control border border-line bg-surface p-1"
                    role="group"
                    aria-label="Feed source"
                  >
                    <button
                      type="button"
                      onClick={() => setFeedScope("following")}
                      aria-pressed={feedScope === "following"}
                      className={`min-h-10 rounded-control px-4 text-label font-semibold transition-colors ${
                        feedScope === "following"
                          ? "bg-brand-soft text-brand-strong"
                          : "text-muted-fg hover:text-fg"
                      }`}
                    >
                      Following ({followingPosts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedScope("discover");
                        if (discoverPosts.length === 0 && !loadingDiscover) {
                          void loadDiscoverPosts(0, false);
                        }
                      }}
                      aria-pressed={feedScope === "discover"}
                      className={`min-h-10 rounded-control px-4 text-label font-semibold transition-colors ${
                        feedScope === "discover"
                          ? "bg-brand-soft text-brand-strong"
                          : "text-muted-fg hover:text-fg"
                      }`}
                    >
                      Public feed
                    </button>
                  </div>

                  <Link
                    href="/articles"
                    className="inline-flex min-h-10 items-center gap-1.5 text-label font-semibold text-brand-strong hover:underline"
                  >
                    <BookOpen className="size-4" aria-hidden="true" />
                    Browse all articles
                  </Link>
                </div>

                {feedScope === "discover" && discoverError && discoverPosts.length === 0 ? (
                  <ErrorState
                    title="Could not load public feed"
                    description="Something interrupted loading recent public posts. Try again in a moment."
                    onRetry={() => void loadDiscoverPosts(0, false)}
                  />
                ) : filteredPosts.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="size-6" aria-hidden="true" />}
                    title={
                      feedScope === "following"
                        ? "No posts from creators you follow yet"
                        : "No public posts match your search"
                    }
                    description={
                      feedScope === "following"
                        ? "Explore creators to support and follow their latest updates."
                        : "Try another search or explore creators directly."
                    }
                    action={
                      feedScope === "following" ? (
                        <Button onClick={() => setFeedScope("discover")}>
                          Browse public feed
                        </Button>
                      ) : (
                        <Button onClick={() => router.push("/explore")}>
                          Explore creators
                        </Button>
                      )
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map((item) => {
                      const handle = item.authorHandle || item.creatorId || "";
                      const isArticle = item.type === "article";
                      const postHref =
                        isArticle && item.slug
                          ? `/articles/${item.slug}`
                          : handle
                            ? `/${handle}/community/${item.id}`
                            : `/explore/posts/${item.id}`;
                      const visibility = resolvePostVisibility(item);
                      const gated = isGatedVisibility(item);
                      const lockLabel = formatVisibilityLabel(
                        visibility,
                        item.requiredTierNames,
                      );
                      const readingMinutes = isArticle
                        ? item.readingMinutes ||
                          estimateReadingMinutes(
                            String(
                              item.htmlContent ||
                                item.shortDescription ||
                                item.description ||
                                "",
                            ),
                          )
                        : undefined;
                      const excerptText =
                        item.shortDescription || item.description || item.content || "";
                      const excerpt =
                        excerptText.length > 220
                          ? `${excerptText.slice(0, 220).trimEnd()}…`
                          : excerptText;

                      return (
                        <Card
                          key={item.id}
                          className={
                            isArticle
                              ? "border-l-4 border-l-brand-strong p-5 sm:p-6"
                              : "p-5 sm:p-6"
                          }
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <Link
                              href={handle ? `/${handle}` : "/explore"}
                              className="shrink-0"
                            >
                              <Avatar
                                src={item.authorPhoto}
                                name={item.authorName || handle}
                                size="sm"
                              />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2">
                                <Link
                                  href={handle ? `/${handle}` : "/explore"}
                                  className="text-label font-bold text-fg hover:text-brand-strong"
                                >
                                  {item.authorName || handle}
                                </Link>
                                {handle && (
                                  <span className="text-caption text-muted-fg">
                                    @{handle}
                                  </span>
                                )}
                              </div>
                              <p className="flex flex-wrap items-center gap-x-1.5 text-caption text-muted-fg">
                                <span className="inline-flex items-center gap-1 font-semibold text-brand-strong">
                                  {isArticle && (
                                    <BookOpen className="size-3.5" aria-hidden="true" />
                                  )}
                                  {typeLabel(item.type)}
                                </span>
                                {readingMinutes ? (
                                  <>
                                    <span>·</span>
                                    <span className="tabular-nums">{readingMinutes} min read</span>
                                  </>
                                ) : null}
                                <span>·</span>
                                <span>{formatDate(item.publishedAt || item.createdAt)}</span>
                                {gated && (
                                  <>
                                    <span>·</span>
                                    <span className="inline-flex items-center gap-1 font-medium text-warning">
                                      <Lock className="size-3" aria-hidden="true" />
                                      {lockLabel}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {(isArticle || item.type === "image") &&
                            (item.coverUrl || item.contentUrl) && (
                              <button
                                type="button"
                                onClick={() =>
                                  item.type === "image"
                                    ? setViewingImage({
                                        url: item.contentUrl,
                                        postId: item.id,
                                        isPrivate: gated,
                                        title: item.title || "Post image",
                                      })
                                    : router.push(postHref)
                                }
                                className="mb-4 block w-full overflow-hidden rounded-control bg-surface-raised text-left"
                              >
                                <MediaAsset
                                  postId={item.id}
                                  isPrivate={gated}
                                  url={item.coverUrl || item.contentUrl}
                                  alt={item.title || "Post media"}
                                  className={
                                    isArticle
                                      ? "aspect-[16/9] w-full object-cover"
                                      : "max-h-72 w-full object-cover"
                                  }
                                />
                              </button>
                            )}

                          {item.type === "video" && item.contentUrl && (
                            <div className="mb-4">
                              <MediaAsset
                                postId={item.id}
                                isPrivate={gated}
                                url={item.contentUrl}
                                as="video"
                                poster={item.coverUrl}
                                title={item.title}
                                creatorName={item.authorName || handle}
                                creatorHandle={handle}
                                postHref={postHref}
                              />
                            </div>
                          )}

                          {item.title && (
                            <Link href={postHref} className="group block">
                              <h2 className="text-title font-bold text-fg transition-colors group-hover:text-brand-strong">
                                {item.title}
                              </h2>
                            </Link>
                          )}

                          {excerpt && (
                            <div className="mt-2 whitespace-pre-wrap text-label leading-relaxed text-muted-fg">
                              <LinkifyText text={excerpt} />
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-caption text-muted-fg">
                            <span className="tabular-nums">
                              {typeof item.views === "number" ? `${item.views} views` : "Update"}
                            </span>
                            <div className="flex items-center gap-2">
                              {handle && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setSupportItem(item)}
                                  leadingIcon={<Heart className="size-3.5" aria-hidden="true" />}
                                >
                                  Support
                                </Button>
                              )}
                              <Link
                                href={postHref}
                                className="inline-flex min-h-11 items-center gap-1 px-2 text-label font-semibold text-brand-strong hover:underline"
                              >
                                {isArticle ? "Read article" : "Open post"}
                                <ArrowRight className="size-3.5" aria-hidden="true" />
                              </Link>
                            </div>
                          </div>
                        </Card>
                      );
                    })}

                    {feedScope === "discover" && discoverHasMore && !searchTerm && (
                      <div className="pt-2 text-center">
                        <Button
                          variant="secondary"
                          loading={loadingMoreDiscover}
                          onClick={() => void loadDiscoverPosts(discoverPosts.length, true)}
                        >
                          Load more posts
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "creators" && (
              <div>
                {filteredCreators.length === 0 ? (
                  <EmptyState
                    icon={<Users className="size-6" aria-hidden="true" />}
                    title="No supported creators yet"
                    description="Creators you support or follow will show up here for quick access."
                    action={
                      <Button onClick={() => router.push("/explore")}>
                        Discover creators
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {filteredCreators.map((creator) => (
                      <Card key={creator.handle} className="flex flex-col justify-between p-5">
                        <div className="flex items-center gap-3">
                          <Avatar src={creator.photoURL} name={creator.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body font-bold text-fg">
                              {creator.name}
                            </p>
                            <p className="truncate text-caption text-brand-strong">
                              @{creator.handle}
                            </p>
                          </div>
                        </div>
                        {creator.bio && (
                          <p className="mt-3 line-clamp-2 text-label text-muted-fg">
                            {creator.bio}
                          </p>
                        )}
                        <div className="mt-4">
                          <Link
                            href={`/${creator.handle}`}
                            className={buttonClasses({
                              variant: "secondary",
                              size: "sm",
                              fullWidth: true,
                            })}
                          >
                            Visit page
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                {purchases.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag className="size-6" aria-hidden="true" />}
                    title="No store purchases yet"
                    description="Digital downloads and products you buy from creators will appear here."
                    action={
                      <Button onClick={() => router.push("/explore")}>
                        Browse creator stores
                      </Button>
                    }
                  />
                ) : (
                  <Card className="divide-y divide-line overflow-hidden p-0">
                    {purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-raised text-muted-fg">
                            <Package className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-body font-semibold text-fg">
                              {purchase.productName || "Store item"}
                            </p>
                            <p className="text-caption text-muted-fg">
                              {purchase.creatorHandle ? `@${purchase.creatorHandle} · ` : ""}
                              {formatDate(purchase.createdAt)}
                              {purchase.status ? ` · ${purchase.status}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-label font-bold tabular-nums text-fg">
                            {purchase.currency
                              ? formatCurrency(
                                  Number(purchase.totalAmount || 0),
                                  purchase.currency as any,
                                )
                              : Number(purchase.totalAmount || 0).toLocaleString()}
                          </span>
                          {purchase.creatorHandle && purchase.productId && (
                            <Link
                              href={`/${purchase.creatorHandle}/store/${purchase.productId}`}
                              className={buttonClasses({ variant: "secondary", size: "sm" })}
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:col-span-4">
            <Card className="p-5">
              <h2 className="text-title font-bold text-fg">Your overview</h2>
              <dl className="mt-4 space-y-3 text-label">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-fg">Total supported</dt>
                  <dd className="font-bold tabular-nums text-brand-strong">
                    {(auth.profile?.totalSupport || 0).toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-fg">Creators followed</dt>
                  <dd className="font-bold tabular-nums text-fg">
                    {followedCreators.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-fg">Store orders</dt>
                  <dd className="font-bold tabular-nums text-fg">{purchases.length}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <h2 className="text-title font-bold text-fg">Account shortcuts</h2>
              <nav aria-label="Account shortcuts" className="mt-3 space-y-1">
                <Link
                  href="/community/manage"
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  <Users className="size-4" aria-hidden="true" />
                  Memberships
                </Link>
                <Link
                  href="/bookings"
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  <Calendar className="size-4" aria-hidden="true" />
                  My bookings
                </Link>
                <Link
                  href="/transactions"
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  <Receipt className="size-4" aria-hidden="true" />
                  Transactions
                </Link>
                <Link
                  href="/supporter/notices"
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  <Bell className="size-4" aria-hidden="true" />
                  Notices
                </Link>
                <Link
                  href="/profile"
                  className="flex min-h-11 items-center gap-3 rounded-control px-3 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                >
                  <Settings className="size-4" aria-hidden="true" />
                  Account settings
                </Link>
              </nav>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        title={viewingImage?.title || "Post image"}
        size="xl"
        contentClassName="p-2 sm:p-4"
      >
        {viewingImage && (
          <MediaAsset
            postId={viewingImage.postId}
            isPrivate={viewingImage.isPrivate}
            url={viewingImage.url}
            alt={viewingImage.title}
            className="max-h-[75dvh] w-full rounded-control object-contain"
          />
        )}
      </Dialog>

      {supportItem && (
        <Suspense fallback={null}>
          <LazySupportSheet
            open={!!supportItem}
            onClose={() => setSupportItem(null)}
            creator={{
              handle: supportItem.authorHandle || supportItem.creatorId || "",
              uid: supportItem.creatorUid || "",
              name: supportItem.authorName || supportItem.authorHandle || "Creator",
              photoURL: supportItem.authorPhoto || null,
              verified: Boolean(supportItem.authorVerified),
            }}
            isLoggedIn={auth.isLoggedIn}
            user={auth.user}
            defaultMessage={
              supportItem.title
                ? `I love this post! "${supportItem.title}"`
                : "I love this post!"
            }
          />
        </Suspense>
      )}
    </div>
  );
}
