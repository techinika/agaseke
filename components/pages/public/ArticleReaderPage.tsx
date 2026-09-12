/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/auth/AuthContext";
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

interface MoreCreatorItem {
  id: string;
  title: string;
  coverUrl: string;
  type: string;
  slug: string;
  createdAt: string | null;
}

export default function ArticleReaderPage({
  article,
  creator,
  moreContent = [],
}: {
  article: ArticleReaderData;
  creator: CreatorReaderData;
  moreContent?: MoreCreatorItem[];
}) {
  const { user: currentUser, profile } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [access, setAccess] = useState<"checking" | "locked" | "unlocked">(
    "checking"
  );
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

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
          where("creatorId", "==", creator.handle)
        );
        const snap = await getDocs(q);
        if (!cancelled) setAccess(!snap.empty ? "unlocked" : "locked");
      } catch {
        if (!cancelled) setAccess("locked");
      }
    };
    checkAccess();
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
      () => {}
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
        userName:
          profile?.displayName || currentUser.displayName || "Anonymous",
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
      await updateDoc(
        doc(db, "creatorContent", article.id, "comments", commentId),
        {
          content: editCommentContent.trim(),
          editedAt: serverTimestamp(),
        }
      );
      setEditingCommentId(null);
      setEditCommentContent("");
    } catch {
      toast.error("Failed to edit comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, "creatorContent", article.id, "comments", commentId));
      await updateDoc(doc(db, "creatorContent", article.id), {
        commentCount: increment(-1),
      });
      setDeleteCommentId(null);
    } catch {
      toast.error("Failed to delete comment");
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

  const loginHref = `/login?redirect=${encodeURIComponent(
    `/articles/${article.slug}`
  )}`;

  const referralLoginHref = `/login?referral=${creator.handle}&redirect=${encodeURIComponent(
    `/articles/${article.slug}`
  )}`;

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

            <div className="mb-8">
              {article.shortDescription && (
                <p className="text-base text-muted-foreground italic leading-relaxed mb-8 border-l-4 border-orange-200 dark:border-orange-900 pl-4">
                  {article.shortDescription}
                </p>
              )}

              {unlocked ? (
                <RichContentRenderer html={article.htmlContent} />
              ) : (
                <div>
                  {/* Preview - progressively blurred content */}
                  <div className="relative">
                    <div className="max-h-[400px] overflow-hidden pointer-events-none select-none">
                      <RichContentRenderer html={article.htmlContent} />
                    </div>

                    {/* Layered blur ramps: gently blurred at the top of the fade, heavily blurred at the bottom */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[480px]">
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 h-24 backdrop-blur-[2px]" />
                      <div className="absolute inset-x-0 bottom-16 h-16 backdrop-blur-[6px]" />
                      <div className="absolute inset-x-0 bottom-28 h-20 backdrop-blur-[10px]" />
                      <div className="absolute inset-x-0 bottom-44 h-20 backdrop-blur-[14px]" />
                      <div className="absolute inset-x-0 bottom-60 h-24 backdrop-blur-[18px]" />
                    </div>
                  </div>

                  {/* Paywall CTA */}
                  <div className="rounded-2xl border border-border shadow-sm bg-card p-8 text-center -mt-10 relative">
                    <div className="w-14 h-14 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock size={24} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <h2 className="font-bold text-lg text-foreground mb-2">
                      {currentUser
                        ? `This story is for ${creator.name}'s supporters`
                        : "Keep reading this story"}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      {currentUser
                        ? `You've read the preview. The rest of "${
                            article.title
                          }" is exclusive to ${creator.name}'s supporters.`
                        : `Log in to keep reading "${
                            article.title
                          }" by ${creator.name}.`}
                    </p>
                    {currentUser ? (
                      <button
                        onClick={() => setSupportOpen(true)}
                        className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition"
                      >
                        <Heart size={18} className="fill-current" />
                        Support {creator.name} to read
                      </button>
                    ) : (
                      <Link
                        href={loginHref}
                        className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition"
                      >
                        <LogIn size={18} />
                        Log in to continue reading
                      </Link>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-4 flex items-center justify-center gap-1">
                      <Sparkles size={12} />
                      Backing a creator unlocks all their exclusive content
                    </p>
                  </div>
                </div>
              )}
            </div>
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

        {/* Comments Section */}
        <div className="mt-8 bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle size={18} className="text-orange-500" />
            Comments ({comments.length})
          </h2>

          {currentUser ? (
            <div className="mt-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                {profile?.photoURL || currentUser.photoURL ? (
                  <img
                    src={profile?.photoURL || currentUser.photoURL || ""}
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={18} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {submittingComment ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    "Post"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link
                href={referralLoginHref}
                className="text-orange-600 font-medium hover:underline"
              >
                Log in
              </Link>{" "}
              to join the conversation.
            </p>
          )}

          {comments.length > 0 && (
            <div className="mt-6 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                    {comment.userPhoto ? (
                      <img
                        src={comment.userPhoto}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-xl px-4 py-2">
                      <p className="font-bold text-xs">{comment.userName}</p>
                      {editingCommentId === comment.id ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editCommentContent}
                            onChange={(e) =>
                              setEditCommentContent(e.target.value)
                            }
                            className="flex-1 bg-background border rounded-lg px-3 py-1 text-sm outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            className="text-orange-600 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditCommentContent("");
                            }}
                            className="text-muted-foreground text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm mt-0.5">
                          {comment.content || comment.text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt?.toDate?.().toLocaleDateString() ||
                          ""}
                      </span>
                      {currentUser?.uid === comment.userId && (
                        <>
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentContent(
                                comment.content || comment.text || "",
                              );
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="text-[10px] text-red-500 hover:text-red-600"
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

          {/* Delete Confirmation */}
          {deleteCommentId && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-700">Delete this comment?</p>
              <button
                onClick={() => handleDeleteComment(deleteCommentId)}
                className="text-sm font-bold text-red-600 hover:underline"
              >
                Yes
              </button>
              <button
                onClick={() => setDeleteCommentId(null)}
                className="text-sm text-muted-foreground hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>

        {/* More from Creator */}
        {moreContent.length > 0 && (
          <div className="mt-8">
            <h2 className="font-bold text-xl mb-4">
              More from {creator.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {moreContent.map((item) => {
                const typeLabel =
                  item.type === "video"
                    ? "video"
                    : item.type === "document"
                      ? "document"
                      : item.type === "image"
                        ? "image"
                        : item.type === "article"
                          ? "article"
                          : "post";
                return (
                  <Link
                    key={item.id}
                    href={
                      item.type === "article" && item.slug
                        ? `/articles/${item.slug}`
                        : `/explore/posts/${item.id}`
                    }
                    className="group rounded-xl border border-border overflow-hidden hover:shadow-md transition bg-card"
                  >
                    {item.type === "video" ? (
                      <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                        {item.coverUrl &&
                          !/\.(mp4|webm|mov|m4v|mkv|m3u8)([?#]|$)/i.test(
                            item.coverUrl,
                          ) && (
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-opacity duration-300"
                            />
                          )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg ring-4 ring-orange-500/20">
                            <Play size={22} className="ml-0.5 fill-current" />
                          </div>
                        </div>
                      </div>
                    ) : item.coverUrl ? (
                      <div className="aspect-[16/9] bg-muted overflow-hidden">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                        {item.type === "document" ? (
                          <FileText size={26} className="text-muted-foreground" />
                        ) : (
                          <Type size={26} className="text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-bold line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                        {typeLabel}
                        {item.createdAt
                          ? ` · ${formatDate(item.createdAt)}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
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
    </div>
  );
}