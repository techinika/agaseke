/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import {
  FileText,
  BookOpen,
  Lock,
  Heart,
  ArrowRight,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  Check,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/auth/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/db/firebase";
import { getMySubscriptions } from "@/lib/communityService";
import {
  canViewerAccessPost,
  formatVisibilityLabel,
  isSubscriptionActive,
  resolvePostVisibility,
} from "@/lib/contentAccess";
import { estimateReadingMinutes } from "@/lib/readingTime";
import { formatMoney as formatCurrency } from "@/lib/format/money";
import { getPrice, type PriceMap } from "@/lib/priceMap";
import { trackView } from "@/lib/viewTracker";

function tierAmount(tier: Pick<CommunityTier, "price" | "prices" | "currency">): number {
  return getPrice(tier);
}

const LazySupportSheet = lazy(() =>
  import("@/features/support").then((m) => ({
    default: m.SupportSheet,
  })),
);

interface CommunityTier {
  id: string;
  name: string;
  description: string;
  price: number;
  prices?: PriceMap;
  currency?: string;
  interval: "monthly" | "yearly";
  benefits: string[];
  memberCount?: number;
}

interface CommunityTabProps {
  publicPosts: any[];
  privatePosts: any[];
  isSupporter: boolean;
  name: string;
  compact?: boolean;
  username?: string;
  uid?: string;
  communityEnabled?: boolean;
  communityTiers?: CommunityTier[];
  activeCommunityTierIds?: string[];
  onSubscribe?: (tier: CommunityTier) => void;
}

function postTypeLabel(type?: string): string {
  if (type === "video") return "Video";
  if (type === "image") return "Image";
  if (type === "document") return "Document";
  if (type === "article") return "Article";
  return "Post";
}

function formatPostDate(createdAt: any): string {
  const ms =
    typeof createdAt?.toMillis === "function"
      ? createdAt.toMillis()
      : typeof createdAt === "string"
        ? Date.parse(createdAt)
        : createdAt instanceof Date
          ? createdAt.getTime()
          : null;
  if (ms == null || !Number.isFinite(ms)) return "Recently";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function hasYouTubeLink(text: string): string | null {
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)[^\s]+/gi;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

export const CommunityTab = ({
  publicPosts,
  privatePosts,
  isSupporter,
  name,
  compact = false,
  username = "",
  uid = "",
  communityEnabled = false,
  communityTiers = [],
  activeCommunityTierIds = [],
  onSubscribe,
}: CommunityTabProps) => {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [showAllPosts, setShowAllPosts] = useState(!compact);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    postId: string;
    isPrivate: boolean;
    title: string;
  } | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
    postId: string;
    isPrivate: boolean;
  } | null>(null);
  const [documentIndex, setDocumentIndex] = useState<Record<string, number>>({});
  const [supportItem, setSupportItem] = useState<any>(null);
  const { user, isLoggedIn } = useAuth();
  const [fetchedTierIds, setFetchedTierIds] = useState<string[]>([]);
  const viewedPosts = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const subscribedTierIds = useMemo(
    () => new Set<string>([...activeCommunityTierIds, ...fetchedTierIds]),
    [activeCommunityTierIds, fetchedTierIds],
  );
  const firstSubscribedTierId = useMemo(
    () =>
      communityTiers.find((tier) => subscribedTierIds.has(tier.id))?.id ||
      Array.from(subscribedTierIds)[0] ||
      null,
    [communityTiers, subscribedTierIds],
  );

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  useEffect(() => {
    if (!user || !communityEnabled || communityTiers.length === 0) return;
    let cancelled = false;

    async function loadSubscriptions() {
      const merged = new Set<string>();
      const [workerResult, firestoreResult] = await Promise.allSettled([
        getMySubscriptions(),
        getDocs(
          query(
            collection(db, "communitySubscriptions"),
            where("userId", "==", user!.uid),
          ),
        ),
      ]);

      if (cancelled) return;

      if (workerResult.status === "fulfilled") {
        for (const s of workerResult.value) {
          if (
            isSubscriptionActive(s as unknown as Record<string, unknown>) &&
            (!s.creatorHandle || s.creatorHandle === username) &&
            s.tierId
          ) {
            merged.add(s.tierId);
          }
        }
      }

      if (firestoreResult.status === "fulfilled") {
        for (const docSnap of firestoreResult.value.docs) {
          const d = docSnap.data() as Record<string, unknown>;
          if (
            isSubscriptionActive(d) &&
            (!d.creatorHandle || d.creatorHandle === username) &&
            typeof d.tierId === "string" &&
            d.tierId
          ) {
            merged.add(d.tierId);
          }
        }
      }

      setFetchedTierIds(Array.from(merged));
    }

    void loadSubscriptions().catch((err) => {
      console.error("Failed to fetch subscriptions", err);
    });

    return () => {
      cancelled = true;
    };
  }, [user, username, communityEnabled, communityTiers.length]);

  const allPosts = useMemo(
    () =>
      [...privatePosts, ...publicPosts].sort(
        (a, b) =>
          (b.publishedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) -
          (a.publishedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0),
      ),
    [privatePosts, publicPosts],
  );

  const displayPosts = useMemo(
    () => (showAllPosts ? allPosts : allPosts.slice(0, 4)),
    [allPosts, showAllPosts],
  );
  const hasMorePosts = !showAllPosts && allPosts.length > 4;

  // Batched beacon view tracking — eliminates hot direct Firestore writes from clients
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
          trackView("post", postId);
        }
      },
      { threshold: 0.3 },
    );

    const cards = container.querySelectorAll("[data-post-id]");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [displayPosts]);

  if (allPosts.length === 0 && !communityEnabled) {
    return (
      <EmptyState
        icon={<FileText className="size-6" aria-hidden="true" />}
        title="No posts yet"
        description={`When ${name} shares updates, they will appear here.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {communityEnabled && communityTiers.length > 0 && (
        <section aria-labelledby="membership-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-brand-strong" aria-hidden="true" />
              <h3 id="membership-heading" className="text-title font-bold text-fg">
                Membership
              </h3>
            </div>
            {firstSubscribedTierId && (
              <Link
                href={`/${username}/community/chat/${firstSubscribedTierId}`}
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Explore Community
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {communityTiers.map((tier) => {
              const joined = subscribedTierIds.has(tier.id);
              return (
                <Card
                  key={tier.id}
                  className="flex flex-col justify-between p-5 transition-colors hover:border-brand-strong"
                >
                  <div>
                    <h4 className="text-body font-bold text-fg">{tier.name}</h4>
                    <p className="mt-1 text-heading font-black tabular-nums text-brand-strong">
                      {tier.currency
                        ? formatCurrency(tierAmount(tier), tier.currency as any)
                        : tierAmount(tier)}
                      <span className="ml-1 text-caption font-normal text-muted-fg">
                        /{tier.interval === "yearly" ? "year" : "month"}
                      </span>
                    </p>
                    {tier.description && (
                      <p className="mt-2 text-label leading-relaxed text-muted-fg">
                        {tier.description}
                      </p>
                    )}
                    {tier.benefits?.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {tier.benefits.map((b, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-caption text-muted-fg"
                          >
                            <Check
                              className="mt-0.5 size-3.5 shrink-0 text-success"
                              aria-hidden="true"
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5">
                    {joined ? (
                      <Link
                        href={`/${username}/community/chat/${tier.id}`}
                        className={buttonClasses({
                          variant: "secondary",
                          size: "md",
                          fullWidth: true,
                        })}
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Explore Community
                      </Link>
                    ) : (
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={() => onSubscribe?.(tier)}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {isSupporter && privatePosts.length > 0 && (
        <Card className="flex items-center gap-3 border-brand/25 bg-brand-soft p-4">
          <Avatar name={name} size="sm" />
          <p className="text-label font-semibold text-brand-strong">
            You have access to {privatePosts.length} supporter-only{" "}
            {privatePosts.length === 1 ? "post" : "posts"}.
          </p>
        </Card>
      )}

      <div ref={containerRef} className="space-y-5">
        {displayPosts.map((item) => {
          const likesCount =
            typeof item.stats?.likes === "number"
              ? item.stats.likes
              : typeof item.likesCount === "number"
                ? item.likesCount
                : typeof item.likes === "number"
                  ? item.likes
                  : 0;
          const commentCount =
            typeof item.commentCount === "number" ? item.commentCount : 0;
          const postHref =
            item.type === "article" && item.slug
              ? `/articles/${item.slug}`
              : `/${username}/community/${item.id}`;
          const textBody = item.shortDescription || item.description || item.content || "";
          const youtubeUrl = hasYouTubeLink(textBody);
          const youtubeId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
          const vis = resolvePostVisibility(item);
          const isUnlocked = canViewerAccessPost({
            post: item,
            isOwner: Boolean(user?.uid && uid && user.uid === uid),
            isSupporter,
            activeTierIds: subscribedTierIds,
          });
          const requiresMembership = vis === "members" || vis === "tier";
          const reqSet = new Set<string>(item.requiredTierIds || []);
          const matchingTier =
            (vis === "tier" && reqSet.size > 0
              ? communityTiers.find((t) => reqSet.has(t.id))
              : communityTiers[0]) || null;

          return (
            <Card key={item.id} data-post-id={item.id} className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-caption text-muted-fg">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-brand-strong">
                    {item.type === "article" && (
                      <BookOpen className="size-3.5" aria-hidden="true" />
                    )}
                    {postTypeLabel(item.type)}
                  </span>
                  {item.type === "article" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {estimateReadingMinutes(item.htmlContent || textBody)} min read
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{formatPostDate(item.publishedAt || item.createdAt)}</span>
                </div>
                <span className="inline-flex items-center gap-1 font-medium">
                  {vis !== "public" ? (
                    <>
                      <Lock className="size-3.5 text-warning" aria-hidden="true" />
                      <span className="text-warning">
                        {formatVisibilityLabel(vis, item.requiredTierNames)}
                      </span>
                    </>
                  ) : (
                    <span>Public</span>
                  )}
                </span>
              </div>

              {!isUnlocked ? (
                <div className="rounded-control border border-dashed border-line bg-surface-raised p-5 text-center">
                  <span className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                    {requiresMembership ? (
                      <Crown className="size-5" aria-hidden="true" />
                    ) : (
                      <Lock className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  {item.title && (
                    <h4 className="text-title font-bold text-fg">{item.title}</h4>
                  )}
                  <p className="mt-1 text-caption text-muted-fg">
                    Available to{" "}
                    {formatVisibilityLabel(vis, item.requiredTierNames).toLowerCase()}.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {requiresMembership && matchingTier && onSubscribe ? (
                      <Button
                        size="sm"
                        onClick={() => onSubscribe(matchingTier)}
                        leadingIcon={<Crown className="size-4" aria-hidden="true" />}
                      >
                        Join {matchingTier.name}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setSupportItem(item)}
                        leadingIcon={<Heart className="size-4" aria-hidden="true" />}
                      >
                        Support {name}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>

              {item.type === "article" && (item.coverUrl || item.contentUrl) && (
                <Link
                  href={postHref}
                  className="mb-4 block overflow-hidden rounded-control bg-surface-raised"
                >
                  <MediaAsset
                    postId={item.id}
                    isPrivate={!!item.isPrivate}
                    url={item.coverUrl || item.contentUrl}
                    alt={item.title || "Article cover"}
                    className="aspect-video w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
                  />
                </Link>
              )}

              {item.type === "image" && item.contentUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingImage({
                      url: item.contentUrl,
                      postId: item.id,
                      isPrivate: !!item.isPrivate,
                      title: item.title || "Post image",
                    })
                  }
                  className="mb-4 block w-full overflow-hidden rounded-control bg-surface-raised text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <MediaAsset
                    postId={item.id}
                    isPrivate={!!item.isPrivate}
                    url={item.contentUrl}
                    alt={item.title || "Post image"}
                    className="max-h-72 w-full object-cover transition-opacity hover:opacity-90"
                  />
                </button>
              )}

              {item.type === "video" && item.contentUrl && (
                <div className="mb-4">
                  <MediaAsset
                    postId={item.id}
                    isPrivate={!!item.isPrivate}
                    url={item.contentUrl}
                    as="video"
                    poster={item.coverUrl}
                    title={item.title}
                    creatorName={name}
                    creatorHandle={username}
                    postHref={postHref}
                  />
                </div>
              )}

              {item.type === "document" &&
                item.contentUrl &&
                (() => {
                  const pages = Array.isArray(item.contentUrl)
                    ? item.contentUrl
                    : [item.contentUrl];
                  const currentIndex = documentIndex[item.id] || 0;
                  const currentUrl = pages[currentIndex] || pages[0];
                  return (
                    <div className="mb-4 rounded-control border border-line bg-surface-sunken p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                          <FileText className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-label font-semibold text-fg">Document</p>
                          <p className="text-caption tabular-nums text-muted-fg">
                            {pages.length} page{pages.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        {pages.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              aria-label="Previous document page"
                              disabled={currentIndex === 0}
                              onClick={() =>
                                setDocumentIndex((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(0, currentIndex - 1),
                                }))
                              }
                            >
                              <ChevronLeft className="size-4" aria-hidden="true" />
                            </Button>
                            <span className="text-caption font-semibold tabular-nums text-muted-fg">
                              {currentIndex + 1}/{pages.length}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              aria-label="Next document page"
                              disabled={currentIndex === pages.length - 1}
                              onClick={() =>
                                setDocumentIndex((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(pages.length - 1, currentIndex + 1),
                                }))
                              }
                            >
                              <ChevronRight className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            setViewingDocument({
                              url: currentUrl,
                              title: item.title || "Document",
                              postId: item.id,
                              isPrivate: !!item.isPrivate,
                            })
                          }
                        >
                          Read Document
                        </Button>
                      </div>
                    </div>
                  );
                })()}

              {item.title && (
                <Link href={postHref} className="group block">
                  <h4 className="text-title font-bold tracking-tight text-fg transition-colors group-hover:text-brand-strong">
                    {item.title}
                  </h4>
                </Link>
              )}

              {textBody && (
                <div className="mt-2 whitespace-pre-wrap text-label leading-relaxed text-muted-fg">
                  {textBody.length > 220 && !expandedPosts.has(item.id) ? (
                    <>
                      <LinkifyText text={textBody.slice(0, 220).trimEnd()} />
                      <span>… </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="font-semibold text-brand-strong hover:underline"
                      >
                        Read more
                      </button>
                    </>
                  ) : (
                    <>
                      <LinkifyText text={textBody} />
                      {textBody.length > 220 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="ml-1.5 font-semibold text-brand-strong hover:underline"
                        >
                          Read less
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {youtubeId && (
                <div className="mt-4 overflow-hidden rounded-control bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={item.title || "Embedded video"}
                  />
                </div>
              )}
                </>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-caption text-muted-fg">
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5" aria-hidden="true" />
                    {likesCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                    {commentCount}
                  </span>
                  {typeof item.views === "number" && (
                    <span>{item.views} views</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Support this post"
                    onClick={() => setSupportItem(item)}
                    leadingIcon={<Heart className="size-3.5" aria-hidden="true" />}
                  >
                    Support
                  </Button>
                  <Link
                    href={postHref}
                    className="inline-flex min-h-11 items-center gap-1 px-2 text-label font-semibold text-brand-strong hover:underline"
                  >
                    {item.type === "article" ? "Read article" : "View Post"}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {hasMorePosts && (
        <div className="text-center">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowAllPosts(true)}
            trailingIcon={<ChevronDown className="size-4" aria-hidden="true" />}
          >
            Show all {allPosts.length} posts
          </Button>
        </div>
      )}

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

      <Dialog
        open={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        title={viewingDocument?.title || "Document"}
        size="xl"
        contentClassName="p-2 sm:p-4"
      >
        {viewingDocument &&
          (viewingDocument.isPrivate ? (
            <div className="flex max-h-[75dvh] items-start justify-center overflow-auto rounded-control bg-surface-raised p-4">
              <MediaAsset
                postId={viewingDocument.postId}
                isPrivate
                url={viewingDocument.url}
                alt={viewingDocument.title}
                className="max-w-full object-contain"
              />
            </div>
          ) : (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocument.url)}&embedded=true`}
              className="h-[68dvh] w-full rounded-control border border-line bg-surface"
              title={viewingDocument.title}
            />
          ))}
      </Dialog>

      {supportItem && (
        <Suspense fallback={null}>
          <LazySupportSheet
            open={!!supportItem}
            onClose={() => setSupportItem(null)}
            creator={{
              uid,
              handle: username,
              name,
              photoURL: null,
            }}
            isLoggedIn={isLoggedIn}
            user={user}
            defaultMessage={
              supportItem?.title
                ? `I love this post! "${supportItem.title}"`
                : "I love this post!"
            }
          />
        </Suspense>
      )}
    </div>
  );
};
