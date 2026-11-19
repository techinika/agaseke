/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- public media URLs are signed/arbitrary */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Heart,
  Lock,
  LogIn,
  MessageCircle,
  Pencil,
  Play,
  Share2,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { baseUrl } from "@/lib/baseUrl";
import type { MoreCreatorItem, ReaderCreator, ReaderPost } from "@/lib/articleReader";
import { usePostMediaSrc } from "@/lib/usePostMediaSrc";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";

const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";

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
  const urlPattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)[^\s]+/gi;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
};

function typeLabel(type?: string) {
  if (type === "video") return "Video";
  if (type === "image") return "Image";
  if (type === "document") return "Document";
  if (type === "article") return "Article";
  return "Post";
}

function formatDate(value: any): string {
  if (!value) return "Recently";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

interface CommentItem {
  id: string;
  content?: string;
  text?: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  createdAt: any;
  parentId?: string;
  replies?: CommentItem[];
}

export interface PostDetailPageProps {
  postId: string;
  username?: string;
  initialPost?: ReaderPost | null;
  initialCreator?: ReaderCreator | null;
  initialMoreContent?: MoreCreatorItem[];
  backHref?: string;
  backLabel?: string;
}

export default function PostDetailPage({
  postId,
  username,
  initialPost = null,
  initialCreator = null,
  initialMoreContent = [],
  backHref,
  backLabel,
}: PostDetailPageProps) {
  const { user: currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(!initialPost);
  const [post, setPost] = useState<any>(initialPost);
  const [creatorData, setCreatorData] = useState<any>(initialCreator);
  const [access, setAccess] = useState<"checking" | "locked" | "unlocked">(
    initialPost && !initialPost.isPrivate ? "unlocked" : "checking",
  );
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [userLiked, setUserLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const viewCounted = useRef(false);

  const { mediaSrc } = usePostMediaSrc(post?.id, !!post?.isPrivate);

  useEffect(() => {
    if (initialPost && !initialPost.isPrivate && initialCreator) return;

    let cancelled = false;
    const load = async () => {
      try {
        let loadedPost: any = initialPost;
        if (!loadedPost || loadedPost.isPrivate) {
          const postSnap = await getDoc(doc(db, "creatorContent", postId));
          if (postSnap.exists()) {
            const data = postSnap.data() as any;
            if (data.status !== "draft") {
              loadedPost = { id: postSnap.id, ...data };
              if (!cancelled) setPost(loadedPost);
            }
          }
        }

        if (!loadedPost) {
          if (!cancelled) setLoading(false);
          return;
        }

        const handleToLookup =
          username || loadedPost.creatorId || creatorData?.handle || "";
        if (!creatorData && handleToLookup) {
          const creatorSnap = await getDoc(doc(db, "creators", handleToLookup));
          if (creatorSnap.exists() && !cancelled) {
            setCreatorData({
              handle: creatorSnap.id,
              ...creatorSnap.data(),
            });
          } else if (loadedPost.creatorUid) {
            const profileSnap = await getDoc(
              doc(db, "profiles", loadedPost.creatorUid),
            );
            if (profileSnap.exists() && !cancelled) {
              const p = profileSnap.data();
              setCreatorData({
                name: p.displayName || handleToLookup,
                handle: p.username || handleToLookup,
                photoURL: p.photoURL || null,
                uid: loadedPost.creatorUid,
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to load post:", e);
        toast.error("Failed to load post");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // Initial SSR hydration + client fallback on postId/username/user sign-in changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, username, currentUser?.uid]);

  const creatorHandle =
    creatorData?.handle || username || post?.creatorId || "";
  const creatorName = creatorData?.name || creatorHandle || "Creator";
  const creatorPhoto =
    creatorData?.photoURL || creatorData?.profilePicture || null;
  const creatorUid = creatorData?.uid || post?.creatorUid || "";

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      if (!post) return;
      const isOwner =
        Boolean(creatorUid) &&
        Boolean(currentUser?.uid) &&
        creatorUid === currentUser?.uid;

      if (!post.isPrivate || isOwner) {
        if (!cancelled) setAccess("unlocked");
        return;
      }
      if (!currentUser?.uid || !creatorHandle) {
        if (!cancelled) setAccess("locked");
        return;
      }
      try {
        const supportRef = collection(db, "supportedCreators");
        const q = query(
          supportRef,
          where("supporterId", "==", currentUser.uid),
          where("creatorId", "==", creatorHandle),
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
  }, [post, creatorUid, creatorHandle, currentUser?.uid]);

  useEffect(() => {
    if (loading || !post?.id || viewCounted.current) return;
    const key = `viewed_post_${post.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
    if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
    viewCounted.current = true;
    updateDoc(doc(db, "creatorContent", post.id), {
      views: increment(1),
    }).catch(() => {});
  }, [loading, post?.id]);

  useEffect(() => {
    if (!postId) return;
    const commentsRef = collection(db, "creatorContent", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const flat = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CommentItem[];
        const topLevel: CommentItem[] = [];
        const replyMap: Record<string, CommentItem[]> = {};
        for (const c of flat) {
          if (c.parentId) {
            if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
            replyMap[c.parentId].push(c);
          } else {
            topLevel.push({ ...c, replies: [] });
          }
        }
        for (const c of topLevel) {
          c.replies = replyMap[c.id] || [];
        }
        setComments(topLevel);
      },
      () => {},
    );
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const likesRef = collection(db, "creatorContent", postId, "likes");
    const unsub = onSnapshot(
      likesRef,
      (snap) => {
        const nextLikes = new Set<string>(
          snap.docs.map((d) => String(d.data().userId || "")),
        );
        setLikes(nextLikes);
        if (currentUser?.uid) {
          setUserLiked(nextLikes.has(currentUser.uid));
        }
      },
      () => {},
    );
    return () => unsub();
  }, [postId, currentUser?.uid]);

  const handleLike = useCallback(async () => {
    if (!currentUser?.uid) {
      toast.error("Please log in to like this post");
      return;
    }
    if (liking) return;
    setLiking(true);
    try {
      const postRef = doc(db, "creatorContent", postId);
      const likeRef = collection(db, "creatorContent", postId, "likes");
      const snap = await getDocs(
        query(likeRef, where("userId", "==", currentUser.uid)),
      );
      if (!snap.empty) {
        await deleteDoc(snap.docs[0].ref);
        await updateDoc(postRef, { "stats.likes": increment(-1) });
        setUserLiked(false);
      } else {
        await addDoc(likeRef, {
          postId,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(postRef, { "stats.likes": increment(1) });
        setUserLiked(true);

        if (creatorUid && currentUser.uid !== creatorUid) {
          currentUser
            .getIdToken()
            .then((token) =>
              fetch(`${GENERAL_WORKER_URL}/api/general/notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userId: creatorUid,
                  type: "new_like",
                  title: "New Like!",
                  message: `${profile?.displayName || currentUser.displayName || "Someone"} liked your post${post?.title ? ` "${post.title}"` : ""}`,
                  link: creatorHandle
                    ? `/${creatorHandle}/community/${postId}`
                    : `/explore/posts/${postId}`,
                  actorName:
                    profile?.displayName ||
                    currentUser.displayName ||
                    "Anonymous",
                  actorId: currentUser.uid,
                  metadata: { postId, postTitle: post?.title, username: creatorHandle },
                }),
              }),
            )
            .catch(() => {});
        }
      }
    } catch {
      toast.error("Could not update like");
    } finally {
      setLiking(false);
    }
  }, [currentUser, liking, postId, creatorUid, profile, post, creatorHandle]);

  const handleComment = useCallback(async () => {
    if (!currentUser?.uid) {
      toast.error("Please log in to comment");
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, "creatorContent", postId, "comments"), {
        postId,
        userId: currentUser.uid,
        userName:
          profile?.displayName || currentUser.displayName || "Anonymous",
        userPhoto: profile?.photoURL || currentUser.photoURL || "",
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setNewComment("");

      if (creatorUid && currentUser.uid !== creatorUid) {
        currentUser
          .getIdToken()
          .then((token) =>
            fetch(`${GENERAL_WORKER_URL}/api/general/notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                userId: creatorUid,
                type: "new_comment",
                title: "New Comment!",
                message: `${profile?.displayName || currentUser.displayName || "Someone"} commented on your post${post?.title ? ` "${post.title}"` : ""}`,
                link: creatorHandle
                  ? `/${creatorHandle}/community/${postId}`
                  : `/explore/posts/${postId}`,
                actorName:
                  profile?.displayName ||
                  currentUser.displayName ||
                  "Anonymous",
                actorId: currentUser.uid,
                metadata: { postId, postTitle: post?.title, username: creatorHandle },
              }),
            }),
          )
          .catch(() => {});
      }
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  }, [currentUser, newComment, postId, profile, creatorUid, post, creatorHandle]);

  const handleReply = async (parentId: string) => {
    if (!currentUser?.uid) {
      toast.error("Please log in to reply");
      return;
    }
    const text = replyText[parentId]?.trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "creatorContent", postId, "comments"), {
        postId,
        parentId,
        userId: currentUser.uid,
        userName:
          profile?.displayName || currentUser.displayName || "Anonymous",
        userPhoto: profile?.photoURL || currentUser.photoURL || "",
        content: text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo(null);
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      await updateDoc(doc(db, "creatorContent", postId, "comments", commentId), {
        content: editCommentContent.trim(),
        editedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
      setEditCommentContent("");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(true);
    try {
      await deleteDoc(doc(db, "creatorContent", postId, "comments", commentId));
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(-1),
      });
      setDeleteCommentId(null);
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setDeletingComment(false);
    }
  };

  const canonicalPath = creatorHandle
    ? `/${creatorHandle}/community/${postId}`
    : `/explore/posts/${postId}`;

  const handleShare = async () => {
    const shareUrl = `${baseUrl}${canonicalPath}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: post?.title || "Post on Agaseke", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        toast.error("Could not share link");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas pb-20 text-fg">
        <LoadingState
          variant="page"
          className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8"
        />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-20 text-fg">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="Post not found"
            description="This post may have been removed or is not available."
            action={
              <Link
                href={backHref || "/explore/posts"}
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {backLabel || "Back to posts"}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const unlocked = !post.isPrivate || access === "unlocked";
  const textBody = post.description || post.content || "";
  const youtubeUrl = (() => {
    if (!unlocked || !textBody) return null;
    const link = hasYouTubeLink(textBody);
    const id = link ? extractYouTubeId(link) : null;
    return id ? { videoId: id } : null;
  })();

  const pages =
    post.type === "document" && post.contentUrl
      ? Array.isArray(post.contentUrl)
        ? post.contentUrl
        : [post.contentUrl]
      : [];

  const totalCommentsCount = comments.reduce(
    (sum, item) => sum + 1 + (item.replies?.length || 0),
    0,
  );
  const likeDisplayCount =
    likes.size > 0 ? likes.size : Number(post.likesCount || 0);
  const resolvedBackHref =
    backHref || (username ? `/${username}` : "/explore/posts");
  const resolvedBackLabel =
    backLabel || (username ? `Back to ${creatorName}` : "All posts");
  const loginHref = `/login?redirect=${encodeURIComponent(canonicalPath)}`;

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={resolvedBackHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-control text-label font-semibold text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {resolvedBackLabel}
          </Link>

          <div className="flex items-center gap-2">
            <IconButton
              variant="secondary"
              label="Share post"
              icon={<Share2 />}
              onClick={handleShare}
            />
            {creatorHandle && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSupportOpen(true)}
                leadingIcon={<Heart className="size-4" aria-hidden="true" />}
              >
                Support
              </Button>
            )}
          </div>
        </div>

        <article className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {unlocked && post.type === "image" && !Array.isArray(post.contentUrl) && post.contentUrl && (
            <button
              type="button"
              className="block w-full overflow-hidden border-b border-line bg-surface-raised text-left"
              onClick={() => setViewingImage(post.contentUrl)}
              aria-label="View full size image"
            >
              <MediaAsset
                postId={post.id}
                isPrivate={!!post.isPrivate}
                url={post.contentUrl}
                alt={post.title || "Post image"}
                className="max-h-[34rem] w-full cursor-zoom-in object-contain transition-opacity hover:opacity-95"
              />
            </button>
          )}

          {unlocked && post.type === "video" && post.contentUrl && (
            <div className="overflow-hidden border-b border-line bg-black">
              <MediaAsset
                postId={post.id}
                isPrivate={!!post.isPrivate}
                url={post.contentUrl}
                as="video"
                controls
                controlsList="nodownload"
                className="aspect-video w-full"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-semibold text-muted-fg">
              <span className="uppercase tracking-wider text-brand-strong">
                {typeLabel(post.type)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatDate(post.publishedAt || post.createdAt)}</span>
              {typeof post.views === "number" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3.5" aria-hidden="true" />
                    {post.views}
                  </span>
                </>
              )}
              {post.isPrivate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-warning">
                    <Lock className="size-3.5" aria-hidden="true" />
                    Supporters only
                  </span>
                </>
              )}
            </div>

            {post.title && (
              <h1 className="mt-3 text-heading font-black tracking-tight text-fg sm:text-display">
                {post.title}
              </h1>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
              <Link
                href={creatorHandle ? `/${creatorHandle}` : "/explore"}
                className="group flex min-w-0 items-center gap-3"
              >
                <Avatar src={creatorPhoto} name={creatorName} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-label font-bold text-fg transition-colors group-hover:text-brand-strong">
                      {creatorName}
                    </span>
                    {creatorData?.verified && (
                      <CheckCircle2
                        className="size-4 shrink-0 text-success"
                        aria-label="Verified creator"
                      />
                    )}
                  </div>
                  {creatorHandle && (
                    <p className="truncate text-caption text-muted-fg">
                      @{creatorHandle}
                    </p>
                  )}
                </div>
              </Link>

              {creatorHandle && (
                <Link
                  href={`/${creatorHandle}`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  View creator page
                </Link>
              )}
            </div>

            {!unlocked ? (
              <div className="py-10 text-center">
                <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                  <Lock className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-title font-bold text-fg">
                  {currentUser
                    ? `Supporters-only post by ${creatorName}`
                    : "Sign in to view this post"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-body text-muted-fg">
                  {currentUser
                    ? `Support ${creatorName} on Agaseke to unlock this post and future supporter-only releases.`
                    : `Log in to check access or support ${creatorName}.`}
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
                    Support {creatorName}
                  </Button>
                ) : (
                  <Link
                    href={loginHref}
                    className={buttonClasses({
                      variant: "primary",
                      size: "lg",
                      className: "mt-6",
                    })}
                  >
                    <LogIn className="size-5" aria-hidden="true" />
                    Log in
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {post.type === "article" ? (
                  <>
                    {(post.coverUrl || post.contentUrl) && (
                      <MediaAsset
                        postId={post.id}
                        isPrivate={!!post.isPrivate}
                        url={post.coverUrl || post.contentUrl}
                        alt={post.title || "Article cover"}
                        className="max-h-[26rem] w-full rounded-control object-cover"
                      />
                    )}
                    {post.shortDescription && (
                      <p className="border-y border-line py-4 text-body-lg leading-relaxed text-muted-fg">
                        {post.shortDescription}
                      </p>
                    )}
                    <RichContentRenderer html={post.htmlContent || ""} />
                  </>
                ) : textBody ? (
                  <div className="whitespace-pre-wrap text-body-lg leading-relaxed text-fg/90">
                    <LinkifyText text={textBody} />
                  </div>
                ) : null}

                {post.type === "document" && pages.length > 0 && (
                  <div className="rounded-card border border-line bg-surface-sunken p-4 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                        <FileText className="size-5" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="text-label font-bold text-fg">Document</p>
                        <p className="text-caption text-muted-fg">
                          {pages.length} page{pages.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      {pages.length > 1 && (
                        <div className="flex items-center gap-2">
                          <IconButton
                            size="sm"
                            variant="secondary"
                            label="Previous document page"
                            icon={<ChevronLeft />}
                            disabled={documentIndex === 0}
                            onClick={() =>
                              setDocumentIndex(Math.max(0, documentIndex - 1))
                            }
                          />
                          <span className="text-caption font-semibold text-fg">
                            {documentIndex + 1} / {pages.length}
                          </span>
                          <IconButton
                            size="sm"
                            variant="secondary"
                            label="Next document page"
                            icon={<ChevronRight />}
                            disabled={documentIndex === pages.length - 1}
                            onClick={() =>
                              setDocumentIndex(
                                Math.min(pages.length - 1, documentIndex + 1),
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                    {mediaSrc(pages[documentIndex]) ? (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                          mediaSrc(pages[documentIndex]) as string,
                        )}&embedded=true`}
                        className="h-[31rem] w-full rounded-control border border-line bg-surface"
                        title="Document viewer"
                      />
                    ) : (
                      <div className="flex h-[24rem] items-center justify-center rounded-control border border-line bg-surface text-label text-muted-fg">
                        Preparing document…
                      </div>
                    )}
                  </div>
                )}

                {youtubeUrl && (
                  <div className="overflow-hidden rounded-card bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeUrl.videoId}`}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Video: ${post.title || "Creator post"}`}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  aria-pressed={userLiked}
                  disabled={liking}
                  onClick={handleLike}
                  leadingIcon={
                    <Heart
                      className={cn(
                        "size-4",
                        userLiked && "fill-current text-brand-strong",
                      )}
                      aria-hidden="true"
                    />
                  }
                >
                  {likeDisplayCount}
                </Button>
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line bg-surface-raised px-3 text-label font-semibold text-muted-fg">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {totalCommentsCount}
                </span>
              </div>

              {creatorHandle && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSupportOpen(true)}
                  leadingIcon={<Heart className="size-4" aria-hidden="true" />}
                >
                  Support {creatorName}
                </Button>
              )}
            </div>
          </div>
        </article>

        <Card className="mt-6 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-title font-bold text-fg">
            <MessageCircle className="size-5 text-brand-strong" aria-hidden="true" />
            Comments ({totalCommentsCount})
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
                  placeholder="Add a comment…"
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
                href={loginHref}
                className="font-semibold text-brand-strong hover:underline"
              >
                Log in
              </Link>{" "}
              to join the conversation.
            </p>
          )}

          {comments.length > 0 ? (
            <div className="mt-6 space-y-5">
              {comments.map((comment) => {
                const body = comment.content || comment.text || "";
                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar
                      src={comment.userPhoto}
                      name={comment.userName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="rounded-card bg-surface-raised px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-caption font-bold text-fg">
                            {comment.userName}
                          </p>
                          <span className="text-caption text-muted-fg">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <Input
                              aria-label="Edit comment"
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleEditComment(comment.id);
                                }
                              }}
                              containerClassName="flex-1"
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleEditComment(comment.id)}
                                leadingIcon={<Check className="size-4" aria-hidden="true" />}
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
                                leadingIcon={<X className="size-4" aria-hidden="true" />}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-body text-fg/90">
                            <LinkifyText text={body} />
                          </p>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 px-1">
                        {currentUser && (
                          <button
                            type="button"
                            onClick={() =>
                              setReplyingTo(
                                replyingTo === comment.id ? null : comment.id,
                              )
                            }
                            className="inline-flex min-h-10 items-center text-caption font-semibold text-muted-fg hover:text-fg"
                          >
                            Reply
                          </button>
                        )}
                        {currentUser?.uid === comment.userId && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditCommentContent(body);
                              }}
                              className="inline-flex min-h-10 items-center gap-1 text-caption font-semibold text-muted-fg hover:text-fg"
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCommentId(comment.id)}
                              className="inline-flex min-h-10 items-center gap-1 text-caption font-semibold text-danger hover:underline"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>

                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            aria-label="Write a reply"
                            placeholder="Write a reply…"
                            value={replyText[comment.id] || ""}
                            onChange={(e) =>
                              setReplyText((prev) => ({
                                ...prev,
                                [comment.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleReply(comment.id);
                              }
                            }}
                            containerClassName="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleReply(comment.id)}
                            disabled={!replyText[comment.id]?.trim()}
                          >
                            Reply
                          </Button>
                        </div>
                      )}

                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-2 border-l-2 border-line pl-3">
                          {comment.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="flex items-start gap-2.5 rounded-control bg-surface-raised px-3 py-2"
                            >
                              <Avatar
                                src={reply.userPhoto}
                                name={reply.userName}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-caption font-bold text-fg">
                                  {reply.userName}
                                </p>
                                <p className="mt-0.5 whitespace-pre-wrap text-label text-muted-fg">
                                  <LinkifyText text={reply.content || reply.text || ""} />
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-6 text-center text-label text-muted-fg">
              No comments yet.
            </p>
          )}
        </Card>

        {initialMoreContent.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-title font-bold text-fg">
              More from {creatorName}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {initialMoreContent.map((item) => (
                <Link
                  key={item.id}
                  href={
                    item.type === "article" && item.slug
                      ? `/articles/${item.slug}`
                      : creatorHandle
                        ? `/${creatorHandle}/community/${item.id}`
                        : `/explore/posts/${item.id}`
                  }
                  className="group overflow-hidden rounded-card border border-line bg-surface transition-shadow hover:shadow-card"
                >
                  {item.type === "video" ? (
                    <div className="relative flex aspect-video items-center justify-center bg-surface-raised">
                      <span className="flex size-11 items-center justify-center rounded-full bg-brand-strong text-on-brand">
                        <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
                      </span>
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
                        <FileText className="size-6 text-muted-fg" aria-hidden="true" />
                      ) : (
                        <Type className="size-6 text-muted-fg" aria-hidden="true" />
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="line-clamp-2 text-label font-bold text-fg transition-colors group-hover:text-brand-strong">
                      {item.title}
                    </p>
                    <p className="mt-1 text-caption text-muted-fg">
                      {typeLabel(item.type)} ·{" "}
                      {formatDate(item.publishedAt || item.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <Dialog
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        title={post.title || "Post image"}
        size="xl"
        contentClassName="p-2 sm:p-4"
      >
        {viewingImage && (
          <MediaAsset
            postId={post.id}
            isPrivate={!!post.isPrivate}
            url={viewingImage}
            alt={post.title || "Post image"}
            className="max-h-[75dvh] w-full rounded-control object-contain"
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
        title="Delete comment"
        description="This comment will be permanently removed."
        confirmLabel="Delete"
        loading={deletingComment}
      />

      {creatorHandle && (
        <SupportModal
          isOpen={supportOpen}
          onClose={() => setSupportOpen(false)}
          creatorName={creatorName}
          creatorId={creatorHandle}
          uid={creatorUid}
          includeReferral={false}
          defaultMessage={
            post.title ? `I love this post! "${post.title}"` : "I love this post!"
          }
        />
      )}
    </div>
  );
}
