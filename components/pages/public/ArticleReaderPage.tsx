/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- article covers use signed/arbitrary URLs */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Crown,
  Eye,
  MessageCircle,
  Heart,
  Lock,
  Share2,
  LogIn,
  Sparkles,
  FileText,
  Play,
  Type,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  doc,
  getDoc,
  increment,
  updateDoc,
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import { SupportSheet } from "@/features/support";
import { CommunityJoinSheet, type CommunityTierView } from "@/features/community";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import { useAuth } from "@/auth/AuthContext";
import { baseUrl } from "@/lib/baseUrl";
import {
  formatVisibilityLabel,
  resolvePostVisibility,
  type PostVisibility,
} from "@/lib/contentAccess";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";

interface ArticleReaderData {
  id: string;
  title: string;
  shortDescription: string;
  htmlContent: string;
  coverUrl: string;
  slug: string;
  isPrivate: boolean;
  visibility?: PostVisibility;
  requiredTierIds?: string[];
  requiredTierNames?: string[];
  readingMinutes?: number;
  commentCount: number;
  views: number;
  createdAt: string | null;
  publishedAt?: string | null;
}

interface CreatorReaderData {
  name: string;
  handle: string;
  uid: string;
  photoURL: string | null;
  bio: string;
  verified?: boolean;
  currency?: string;
  communityTiers?: CommunityTierView[];
}

interface MoreCreatorItem {
  id: string;
  title: string;
  coverUrl: string;
  type: string;
  slug: string;
  createdAt: string | null;
  publishedAt?: string | null;
}

export default function ArticleReaderPage({
  article,
  creator,
  moreContent = [],
  backHref,
  backLabel,
}: {
  article: ArticleReaderData;
  creator: CreatorReaderData;
  moreContent?: MoreCreatorItem[];
  backHref?: string;
  backLabel?: string;
}) {
  const { user: currentUser, profile, isLoggedIn } = useAuth();
  const [unlockedOverride, setUnlockedOverride] =
    useState<(Partial<ArticleReaderData> & { id: string }) | null>(null);
  const articleData: ArticleReaderData =
    unlockedOverride?.id === article.id
      ? { ...article, ...unlockedOverride }
      : article;
  const [creatorFull, setCreatorFull] = useState<CreatorReaderData>(creator);
  const [supportOpen, setSupportOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [access, setAccess] = useState<"checking" | "locked" | "unlocked">(
    article.isPrivate ? "checking" : "unlocked",
  );
  const [accessRefreshKey, setAccessRefreshKey] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const viewCounted = useRef(false);

  useEffect(() => {
    if (!article.id || viewCounted.current) return;
    const key = `viewed_article_${article.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    viewCounted.current = true;
    updateDoc(doc(db, "creatorContent", article.id), {
      views: increment(1),
    }).catch(() => {
      /* silently ignore view-count failures */
    });
  }, [article.id]);

  useEffect(() => {
    if (!creator.handle || creatorFull.communityTiers) return;
    let cancelled = false;
    getDoc(doc(db, "creators", creator.handle))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const c = snap.data() as any;
        setCreatorFull((prev) => ({
          ...prev,
          verified: Boolean(c.verified),
          currency: c.currency,
          communityTiers: Array.isArray(c.communityTiers) ? c.communityTiers : [],
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [creator.handle, creatorFull.communityTiers]);

  useEffect(() => {
    let cancelled = false;
    const checkAndUnlock = async () => {
      if (!article.isPrivate) {
        if (!cancelled) setAccess("unlocked");
        return;
      }
      if (!currentUser) {
        if (!cancelled) setAccess("locked");
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`/api/content/${encodeURIComponent(article.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          if (!cancelled) {
            if (errData) {
              setUnlockedOverride((prev) => ({
                id: article.id,
                ...prev,
                visibility: errData.visibility || article.visibility,
                requiredTierIds: errData.requiredTierIds ?? article.requiredTierIds,
                requiredTierNames:
                  errData.requiredTierNames ?? article.requiredTierNames,
              }));
            }
            setAccess("locked");
          }
          return;
        }
        const data = await res.json();
        if (!cancelled && data.unlocked && data.post) {
          setUnlockedOverride({
            id: article.id,
            title: (data.post.title as string) || article.title,
            shortDescription:
              (data.post.shortDescription || data.post.description || "") as string,
            htmlContent: (data.post.htmlContent as string) || "",
            coverUrl: (data.post.coverUrl || data.post.contentUrl || "") as string,
            visibility: data.post.visibility,
            requiredTierIds: data.post.requiredTierIds,
            requiredTierNames: data.post.requiredTierNames,
          });
          setAccess("unlocked");
        }
      } catch {
        if (!cancelled) setAccess("locked");
      }
    };
    void checkAndUnlock();
    return () => {
      cancelled = true;
    };
  }, [article.id, article.isPrivate, article.requiredTierIds, article.requiredTierNames, article.title, article.visibility, currentUser, accessRefreshKey]);

  useEffect(() => {
    if (!article.id) return;
    const commentsRef = collection(db, "creatorContent", article.id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {},
    );
    return () => unsub();
  }, [article.id]);

  const handleComment = async () => {
    if (!currentUser?.uid) {
      toast.error("Please log in to comment");
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const commentsRef = collection(db, "creatorContent", article.id, "comments");
      await addDoc(commentsRef, {
        userId: currentUser.uid,
        userName: profile?.displayName || currentUser.displayName || "Anonymous",
        userPhoto: profile?.photoURL || currentUser.photoURL || "",
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "creatorContent", article.id), {
        commentCount: increment(1),
      });
      setNewComment("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      await updateDoc(doc(db, "creatorContent", article.id, "comments", commentId), {
        content: editCommentContent.trim(),
        editedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
      setEditCommentContent("");
    } catch {
      toast.error("Failed to edit comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(true);
    try {
      await deleteDoc(doc(db, "creatorContent", article.id, "comments", commentId));
      await updateDoc(doc(db, "creatorContent", article.id), {
        commentCount: increment(-1),
      });
      setDeleteCommentId(null);
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setDeletingComment(false);
    }
  };

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

  const unlocked = !articleData.isPrivate || access === "unlocked";
  const wordCount = articleData.htmlContent
    ? articleData.htmlContent
        .replace(/<[^>]+>/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const loginHref = `/login?redirect=${encodeURIComponent(`/articles/${article.slug}`)}`;
  const referralLoginHref = `/login?referral=${creator.handle}&redirect=${encodeURIComponent(
    `/articles/${article.slug}`,
  )}`;

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={backHref ?? "/explore/posts"}
            className="inline-flex min-h-11 items-center gap-2 rounded-control text-label font-semibold text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {backLabel ?? "Back to Explore"}
          </Link>
          <Button
            variant="secondary"
            onClick={handleShare}
            loading={sharing}
            leadingIcon={<Share2 className="size-4" aria-hidden="true" />}
          >
            <span className="hidden sm:inline">Share</span>
            <span className="sr-only sm:hidden">Share</span>
          </Button>
        </div>

        <article className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {articleData.coverUrl && (
            <div className="aspect-video w-full bg-surface-raised">
              <MediaAsset
                postId={articleData.id}
                isPrivate={articleData.isPrivate}
                url={articleData.coverUrl}
                alt={articleData.title}
                className="size-full object-cover"
              />
            </div>
          )}

          <div className="p-5 sm:p-8 md:p-10">
            <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-semibold text-muted-fg">
              <span className="uppercase tracking-wider text-brand-strong">Article</span>
              <span aria-hidden="true">·</span>
              <span>{formatDate(articleData.publishedAt || articleData.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{articleData.readingMinutes || readingMinutes} min read</span>
              {resolvePostVisibility(articleData) !== "public" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-warning">
                    <Lock className="size-3.5" aria-hidden="true" />
                    {formatVisibilityLabel(
                      resolvePostVisibility(articleData),
                      articleData.requiredTierNames,
                    )}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" aria-hidden="true" /> {articleData.views}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-3.5" aria-hidden="true" />{" "}
                {articleData.commentCount}
              </span>
            </div>

            <h1 className="font-display text-heading font-bold tracking-tight text-fg [text-wrap:balance] sm:text-display">
              {articleData.title}
            </h1>

            <Link
              href={`/${creator.handle}`}
              className="group my-6 flex items-center gap-3"
            >
              <Avatar src={creator.photoURL} name={creator.name} size="md" />
              <div className="min-w-0">
                <p className="text-label font-bold text-fg transition-colors group-hover:text-brand-strong">
                  {creator.name}
                </p>
                <p className="truncate text-caption text-muted-fg">
                  @{creator.handle}
                  {creator.bio ? ` · ${creator.bio.slice(0, 60)}` : ""}
                </p>
              </div>
            </Link>

            <div>
              {articleData.shortDescription && (
                <p className="mb-6 border-y border-line py-4 text-body-lg leading-relaxed text-muted-fg">
                  {articleData.shortDescription}
                </p>
              )}

              {unlocked ? (
                <RichContentRenderer html={articleData.htmlContent} />
              ) : (
                (() => {
                  const vis = resolvePostVisibility(articleData);
                  const requiresMembership = vis === "members" || vis === "tier";
                  const allActiveTiers: CommunityTierView[] = (
                    creatorFull.communityTiers || []
                  ).filter((t) => t.isActive !== false);
                  const reqSet = new Set<string>(articleData.requiredTierIds || []);
                  const matchingTiers =
                    vis === "tier" && reqSet.size > 0
                      ? allActiveTiers.filter((t) => reqSet.has(t.id))
                      : allActiveTiers;
                  const tierLabel =
                    articleData.requiredTierNames?.length
                      ? articleData.requiredTierNames.join(" / ")
                      : "community";

                  return (
                    <Card className="border-line-strong p-6 text-center shadow-sheet sm:p-8">
                      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                        {requiresMembership ? (
                          <Crown className="size-6" aria-hidden="true" />
                        ) : (
                          <Lock className="size-6" aria-hidden="true" />
                        )}
                      </span>
                      <h2 className="text-title font-bold text-fg">
                        {!currentUser
                          ? "Sign in to read this article"
                          : vis === "tier"
                            ? `${tierLabel} members only`
                            : vis === "members"
                              ? `Community members-only story by ${creator.name}`
                              : `This story is for ${creator.name}'s supporters`}
                      </h2>
                      <p className="mx-auto mt-2 max-w-md text-body text-muted-fg">
                        {!currentUser
                          ? `Log in to check access or unlock "${articleData.title}" by ${creator.name}.`
                          : requiresMembership
                            ? `Join ${creator.name}'s ${vis === "tier" ? tierLabel : "community"} membership to unlock this article.`
                            : `Support ${creator.name} to read this article and unlock future supporter-only stories.`}
                      </p>
                      {currentUser ? (
                        requiresMembership && matchingTiers.length > 0 ? (
                          <Button
                            className="mt-6"
                            size="lg"
                            onClick={() => setJoinOpen(true)}
                            leadingIcon={
                              <Crown className="size-5" aria-hidden="true" />
                            }
                          >
                            Join to read
                          </Button>
                        ) : (
                          <Button
                            className="mt-6"
                            size="lg"
                            onClick={() => setSupportOpen(true)}
                            leadingIcon={
                              <Heart className="size-5 fill-current" aria-hidden="true" />
                            }
                          >
                            Support {creator.name} to read
                          </Button>
                        )
                      ) : (
                        <Link
                          href={loginHref}
                          className={buttonClasses({
                            size: "lg",
                            className: "mt-6",
                          })}
                        >
                          <LogIn className="size-5" aria-hidden="true" />
                          Log in to continue reading
                        </Link>
                      )}
                      <p className="mt-4 flex items-center justify-center gap-1.5 text-caption text-muted-fg">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        {requiresMembership
                          ? "Active members get instant access to gated releases"
                          : "Backing a creator unlocks their supporter-only releases"}
                      </p>
                    </Card>
                  );
                })()
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-5 sm:px-8 md:px-10">
            <Link
              href={`/${creator.handle}`}
              className="inline-flex min-h-11 items-center text-label font-semibold text-brand-strong hover:underline"
            >
              View {creator.name}&apos;s profile
            </Link>
            <Button
              variant="secondary"
              onClick={() => setSupportOpen(true)}
              leadingIcon={<Heart className="size-4" aria-hidden="true" />}
            >
              Support
            </Button>
          </div>
        </article>

        <Card className="mt-5 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-title font-bold text-fg">
            <MessageCircle className="size-5 text-brand-strong" aria-hidden="true" />
            Comments ({comments.length})
          </h2>

          {currentUser ? (
            <div className="mt-5 flex gap-3">
              <Avatar
                src={profile?.photoURL || currentUser.photoURL}
                name={profile?.displayName || currentUser.displayName}
                size="md"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <Input
                  aria-label="Write a comment"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleComment();
                    }
                  }}
                  containerClassName="flex-1"
                />
                <Button
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                  loading={submittingComment}
                >
                  Post
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-label text-muted-fg">
              <Link
                href={referralLoginHref}
                className="font-semibold text-brand-strong hover:underline"
              >
                Log in
              </Link>{" "}
              to join the conversation.
            </p>
          )}

          {comments.length > 0 && (
            <div className="mt-6 space-y-5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar src={comment.userPhoto} name={comment.userName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-card bg-surface-raised px-4 py-3">
                      <p className="text-caption font-bold text-fg">
                        {comment.userName}
                      </p>
                      {editingCommentId === comment.id ? (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <Input
                            aria-label="Edit comment"
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            containerClassName="flex-1"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditComment(comment.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-body text-muted-fg">
                          {comment.content || comment.text}
                        </p>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 px-1">
                      <span className="text-caption text-muted-fg">
                        {comment.createdAt?.toDate?.().toLocaleDateString() || ""}
                      </span>
                      {currentUser?.uid === comment.userId && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentContent(
                                comment.content || comment.text || "",
                              );
                            }}
                            className="min-h-11 text-caption font-semibold text-muted-fg hover:text-fg"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="min-h-11 text-caption font-semibold text-danger hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {moreContent.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-title font-bold text-fg">
              More from {creator.name}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {moreContent.map((item) => {
                const typeLabel =
                  item.type === "video"
                    ? "Video"
                    : item.type === "document"
                      ? "Document"
                      : item.type === "image"
                        ? "Image"
                        : item.type === "article"
                          ? "Article"
                          : "Post";
                return (
                  <Link
                    key={item.id}
                    href={
                      item.type === "article" && item.slug
                        ? `/articles/${item.slug}`
                        : `/explore/posts/${item.id}`
                    }
                    className="group overflow-hidden rounded-card border border-line bg-surface transition-shadow hover:shadow-card"
                  >
                    {item.type === "video" ? (
                      <div className="relative aspect-video overflow-hidden bg-surface-raised">
                        {item.coverUrl &&
                          !/\.(mp4|webm|mov|m4v|mkv|m3u8)([?#]|$)/i.test(
                            item.coverUrl,
                          ) && (
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="absolute inset-0 size-full object-cover opacity-40 transition-opacity duration-300 group-hover:opacity-30"
                            />
                          )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex size-12 items-center justify-center rounded-full bg-brand-strong text-on-brand shadow-card ring-4 ring-brand-strong/20">
                            <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    ) : item.coverUrl ? (
                      <div className="aspect-video overflow-hidden bg-surface-raised">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-surface-raised">
                        {item.type === "document" ? (
                          <FileText className="size-7 text-muted-fg" aria-hidden="true" />
                        ) : (
                          <Type className="size-7 text-muted-fg" aria-hidden="true" />
                        )}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="line-clamp-2 text-label font-bold text-fg transition-colors group-hover:text-brand-strong">
                        {item.title}
                      </p>
                      <p className="mt-1 text-caption text-muted-fg">
                        {typeLabel}
                        {item.createdAt || item.publishedAt
                          ? ` · ${formatDate(item.publishedAt || item.createdAt)}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        creator={{
          uid: creator.uid,
          handle: creator.handle,
          name: creator.name,
          photoURL: creator.photoURL,
          verified: Boolean(creatorFull.verified),
          currency: creatorFull.currency,
        }}
        isLoggedIn={isLoggedIn}
        user={currentUser}
        defaultMessage={
          article.title
            ? `I love this article! "${article.title}"`
            : "I love this article!"
        }
        onSuccess={() => setAccessRefreshKey((k) => k + 1)}
      />

      {joinOpen && (
        <CommunityJoinSheet
          open={joinOpen}
          onClose={() => setJoinOpen(false)}
          creatorName={creator.name}
          creatorPhotoURL={creator.photoURL}
          creatorVerified={Boolean(creatorFull.verified)}
          creatorHandle={creator.handle}
          creatorUid={creator.uid}
          tiers={(() => {
            const allActive: CommunityTierView[] = (
              creatorFull.communityTiers || []
            ).filter((t) => t.isActive !== false);
            const vis = resolvePostVisibility(articleData);
            const reqSet = new Set<string>(articleData.requiredTierIds || []);
            if (vis === "tier" && reqSet.size > 0) {
              const filtered = allActive.filter((t) => reqSet.has(t.id));
              if (filtered.length > 0) return filtered;
            }
            return allActive;
          })()}
          initialTierId={articleData.requiredTierIds?.[0] || null}
          user={currentUser}
          displayName={profile?.displayName}
          defaultPhone={profile?.phoneNumber}
          onJoined={() => setAccessRefreshKey((k) => k + 1)}
        />
      )}

      <ConfirmDialog
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
        title="Delete comment"
        description="This comment will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        loading={deletingComment}
      />
    </div>
  );
}
