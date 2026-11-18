/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- article covers use signed/arbitrary URLs */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  MessageCircle,
  Heart,
  Lock,
  Share2,
  Calendar,
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
  increment,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import { useAuth } from "@/auth/AuthContext";
import { baseUrl } from "@/lib/baseUrl";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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
  const { user: currentUser, profile } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [access, setAccess] = useState<"checking" | "locked" | "unlocked">(
    "checking",
  );
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
    let cancelled = false;
    const checkAccess = async () => {
      const isOwner =
        !!creator.uid && !!currentUser?.uid && creator.uid === currentUser.uid;

      if (!article.isPrivate || isOwner) {
        setAccess("unlocked");
        return;
      }
      if (!currentUser?.uid) {
        setAccess("locked");
        return;
      }
      try {
        const supportRef = collection(db, "supportedCreators");
        const q = query(
          supportRef,
          where("supporterId", "==", currentUser.uid),
          where("creatorId", "==", creator.handle),
        );
        const snap = await getDocs(q);
        if (!cancelled) setAccess(!snap.empty ? "unlocked" : "locked");
      } catch {
        if (!cancelled) setAccess("locked");
      }
    };
    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [article.id, article.isPrivate, creator.handle, creator.uid, currentUser?.uid]);

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

  const unlocked = !article.isPrivate || access === "unlocked";
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
          {article.coverUrl && (
            <div className="aspect-video w-full bg-surface-raised">
              <MediaAsset
                postId={article.id}
                isPrivate={article.isPrivate}
                url={article.coverUrl}
                alt={article.title}
                className="size-full object-cover"
              />
            </div>
          )}

          <div className="p-5 sm:p-8 md:p-10">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge tone="brand">Article</Badge>
              <span className="flex items-center gap-1.5 text-caption text-muted-fg">
                <Calendar className="size-3.5" aria-hidden="true" />
                {formatDate(article.publishedAt || article.createdAt)}
              </span>
              <span className="flex items-center gap-1.5 text-caption text-muted-fg">
                <Eye className="size-3.5" aria-hidden="true" /> {article.views}
              </span>
              <span className="flex items-center gap-1.5 text-caption text-muted-fg">
                <MessageCircle className="size-3.5" aria-hidden="true" />{" "}
                {article.commentCount}
              </span>
            </div>

            <h1 className="text-heading font-black tracking-tight text-fg sm:text-display">
              {article.title}
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
              {article.shortDescription && (
                <p className="mb-6 border-l-4 border-brand-strong pl-4 text-body-lg italic leading-relaxed text-muted-fg">
                  {article.shortDescription}
                </p>
              )}

              {unlocked ? (
                <RichContentRenderer html={article.htmlContent} />
              ) : (
                <div>
                  <div className="relative">
                    <div className="pointer-events-none max-h-[25rem] select-none overflow-hidden">
                      <RichContentRenderer html={article.htmlContent} />
                    </div>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30rem]">
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 h-24 backdrop-blur-[2px]" />
                      <div className="absolute inset-x-0 bottom-16 h-16 backdrop-blur-[6px]" />
                      <div className="absolute inset-x-0 bottom-28 h-20 backdrop-blur-[10px]" />
                      <div className="absolute inset-x-0 bottom-44 h-20 backdrop-blur-[14px]" />
                      <div className="absolute inset-x-0 bottom-60 h-24 backdrop-blur-[18px]" />
                    </div>
                  </div>

                  <Card className="relative -mt-10 border-line-strong p-6 text-center shadow-sheet sm:p-8">
                    <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                      <Lock className="size-6" aria-hidden="true" />
                    </span>
                    <h2 className="text-title font-bold text-fg">
                      {currentUser
                        ? `This story is for ${creator.name}'s supporters`
                        : "Keep reading this story"}
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-body text-muted-fg">
                      {currentUser
                        ? `You've read the preview. The rest of "${article.title}" is exclusive to ${creator.name}'s supporters.`
                        : `Log in to keep reading "${article.title}" by ${creator.name}.`}
                    </p>
                    {currentUser ? (
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
                      Backing a creator unlocks all their exclusive content
                    </p>
                  </Card>
                </div>
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
