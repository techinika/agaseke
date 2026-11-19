/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Share2,
  Heart,
} from "lucide-react";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import { usePostMediaSrc } from "@/lib/usePostMediaSrc";
import { db } from "@/db/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { LinkifyText } from "@/components/ui/LinkifyText";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

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
  if (match) return match[0];
  return null;
};

function typeLabel(type?: string) {
  if (type === "video") return "Video";
  if (type === "image") return "Image";
  if (type === "document") return "Document";
  if (type === "article") return "Article";
  return "Post";
}

export default function ExplorePostDetailPage({ postId }: { postId: string }) {
  const { user: currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const { mediaSrc } = usePostMediaSrc(post?.id, !!post?.isPrivate);
  const [creatorData, setCreatorData] = useState<any>({});
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const viewCounted = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const postRef = doc(db, "creatorContent", postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
          setLoading(false);
          return;
        }
        const postData: any = { id: postSnap.id, ...postSnap.data() };
        setPost(postData);

        const creatorHandle = postData.creatorId || postData.creatorUid || "";
        if (creatorHandle) {
          const creatorRef = doc(db, "creators", creatorHandle);
          const creatorSnap = await getDoc(creatorRef);
          if (creatorSnap.exists()) {
            setCreatorData(creatorSnap.data());
          } else if (postData.creatorUid) {
            const profileRef = doc(db, "profiles", postData.creatorUid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
              const pdata = profileSnap.data();
              setCreatorData({
                name: pdata.displayName || creatorHandle,
                handle: pdata.username || creatorHandle,
                profilePicture: pdata.photoURL || null,
                uid: postData.creatorUid,
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to load post", e);
        toast.error("Failed to load post");
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [postId]);

  useEffect(() => {
    if (loading || !postId || viewCounted.current) return;
    viewCounted.current = true;
    const postRef = doc(db, "creatorContent", postId);
    updateDoc(postRef, { views: increment(1) }).catch(() => {});
  }, [loading, postId]);

  useEffect(() => {
    if (!postId) return;
    const commentsRef = collection(db, "creatorContent", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {},
    );
    return () => unsub();
  }, [postId]);

  const handleComment = async () => {
    if (!currentUser?.uid) {
      toast.error("Please log in to comment");
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const commentsRef = collection(db, "creatorContent", postId, "comments");
      await addDoc(commentsRef, {
        userId: currentUser.uid,
        userName: profile?.displayName || currentUser.displayName || "Anonymous",
        userPhoto: profile?.photoURL || currentUser.photoURL || "",
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "creatorContent", postId), {
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
      await updateDoc(doc(db, "creatorContent", postId, "comments", commentId), {
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

  const handleShare = async () => {
    const url = `${window.location.origin}/explore/posts/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title || "Post", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        toast.error("Failed to share");
      }
    }
  };

  const handle = creatorData.handle || post?.creatorId || "";
  const creatorName = creatorData.name || handle || "Creator";
  const creatorPhoto = creatorData.profilePicture || null;
  const creatorUid = creatorData.uid || post?.creatorUid || "";
  const defaultMessage = post?.title
    ? `I love this post! "${post.title}"`
    : "I love this post!";

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas pb-20 text-fg">
        <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 lg:px-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14" rounded="full" />
              <div className="flex-1">
                <SkeletonText lines={2} />
              </div>
            </div>
          </Card>
          <Card className="mt-5 p-6 sm:p-8">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-6 h-10 w-3/4" />
            <SkeletonText lines={7} className="mt-6" />
          </Card>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-20 text-fg">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="Post not found"
            description="This post may have been removed or is no longer public."
            action={
              <Link
                href="/explore/posts"
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-strong px-5 text-label font-semibold text-on-brand"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to posts
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const youtubeUrl = (() => {
    const text = post.description || post.content || "";
    const link = hasYouTubeLink(text);
    if (!link) return null;
    const id = extractYouTubeId(link);
    return id ? { videoId: id } : null;
  })();

  const pages =
    post.type === "document" && post.contentUrl
      ? Array.isArray(post.contentUrl)
        ? post.contentUrl
        : [post.contentUrl]
      : [];

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/explore/posts"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-control text-label font-semibold text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Explore
        </Link>

        <Card className="mb-5 flex flex-wrap items-center gap-4 p-4">
          <Link href={`/${handle}`} className="shrink-0">
            <Avatar src={creatorPhoto} name={creatorName} size="lg" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/${handle}`}
              className="text-title font-bold text-fg transition-colors hover:text-brand-strong"
            >
              {creatorName}
            </Link>
            {handle && <p className="truncate text-label text-muted-fg">@{handle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {handle && (
              <Link
                href={`/${handle}`}
                className="hidden min-h-11 items-center gap-2 rounded-control bg-brand-strong px-4 text-label font-semibold text-on-brand transition-colors hover:bg-brand-strong-hover sm:inline-flex"
              >
                <User className="size-4" aria-hidden="true" />
                View profile
              </Link>
            )}
            <IconButton
              variant="secondary"
              label="Share post"
              icon={<Share2 />}
              onClick={handleShare}
            />
          </div>
        </Card>

        <article>
          <Card className="p-5 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Badge tone="brand">{typeLabel(post.type)}</Badge>
              <span className="flex items-center gap-1.5 text-caption text-muted-fg">
                <Calendar className="size-3.5" aria-hidden="true" />
                {post.createdAt?.toDate?.().toLocaleDateString() || "Recently"}
              </span>
            </div>

            {post.type === "image" && post.contentUrl && (
              <button
                type="button"
                className="mb-6 block w-full overflow-hidden rounded-card text-left"
                onClick={() => setViewingImage(post.contentUrl)}
                aria-label="Open image in full screen"
              >
                <MediaAsset
                  postId={post.id}
                  isPrivate={!!post.isPrivate}
                  url={post.contentUrl}
                  alt={post.title || "Post image"}
                  className="max-h-[32rem] w-full cursor-zoom-in bg-surface-raised object-contain"
                />
              </button>
            )}

            {post.type === "video" && post.contentUrl && (
              <div className="mb-6 overflow-hidden rounded-card bg-black">
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

            {post.type === "document" && pages.length > 0 && (
              <div className="mb-6 rounded-card border border-line bg-surface-sunken p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-4">
                  <span className="flex size-14 items-center justify-center rounded-control bg-brand-soft text-brand-strong">
                    <FileText className="size-7" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-label font-bold text-fg">Document</p>
                    <p className="text-caption text-muted-fg">
                      {pages.length} page{pages.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {pages.length > 1 && (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <IconButton
                      variant="secondary"
                      label="Previous document page"
                      icon={<ChevronLeft />}
                      disabled={documentIndex === 0}
                      onClick={() => setDocumentIndex(Math.max(0, documentIndex - 1))}
                    />
                    <span className="text-label font-semibold text-fg">
                      {documentIndex + 1} of {pages.length}
                    </span>
                    <IconButton
                      variant="secondary"
                      label="Next document page"
                      icon={<ChevronRight />}
                      disabled={documentIndex === pages.length - 1}
                      onClick={() =>
                        setDocumentIndex(Math.min(pages.length - 1, documentIndex + 1))
                      }
                    />
                  </div>
                )}
                {mediaSrc(pages[documentIndex]) ? (
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                      mediaSrc(pages[documentIndex]) as string,
                    )}&embedded=true`}
                    className="h-[31rem] w-full rounded-control border border-line"
                    title="Document viewer"
                  />
                ) : (
                  <div className="flex h-[31rem] w-full items-center justify-center rounded-control border border-line bg-surface text-label text-muted-fg">
                    Preparing document...
                  </div>
                )}
              </div>
            )}

            {post.title && (
              <h1 className="text-heading font-black tracking-tight text-fg sm:text-display">
                {post.title}
              </h1>
            )}

            <div className="mt-4">
              {post.type === "article" ? (
                <>
                  {(post.coverUrl || post.contentUrl) && (
                    <MediaAsset
                      postId={post.id}
                      isPrivate={!!post.isPrivate}
                      url={post.coverUrl || post.contentUrl}
                      alt={post.title || "Article cover"}
                      className="mb-6 max-h-[26rem] w-full rounded-card object-cover"
                    />
                  )}
                  {post.shortDescription && (
                    <p className="mb-6 border-l-4 border-brand-strong pl-4 text-body-lg italic leading-relaxed text-muted-fg">
                      {post.shortDescription}
                    </p>
                  )}
                  <RichContentRenderer html={post.htmlContent || ""} />
                </>
              ) : post.description || post.content ? (
                <div className="whitespace-pre-wrap text-body leading-relaxed text-muted-fg">
                  <LinkifyText text={post.description || post.content} />
                </div>
              ) : null}
            </div>

            {youtubeUrl && (
              <div className="mt-6 overflow-hidden rounded-card bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeUrl.videoId}`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`YouTube video: ${post.title || "Creator post"}`}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-4 text-label text-muted-fg">
                {post.views !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Eye className="size-4" aria-hidden="true" /> {post.views} views
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="size-4" aria-hidden="true" />{" "}
                  {comments.length}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(true)}
                leadingIcon={<Heart className="size-4" aria-hidden="true" />}
              >
                Support
              </Button>
            </div>
          </Card>
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
                href={`/login?redirect=${encodeURIComponent(`/explore/posts/${postId}`)}`}
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
                      <p className="text-caption font-bold text-fg">{comment.userName}</p>
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
            className="max-h-[70dvh] w-full rounded-control object-contain"
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
        title="Delete comment"
        description="This comment will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        loading={deletingComment}
      />

      {isModalOpen && handle && (
        <SupportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          creatorName={creatorName}
          creatorId={handle}
          uid={creatorUid}
          defaultMessage={defaultMessage}
        />
      )}
    </div>
  );
}
