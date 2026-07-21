/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Loader,
  FileText,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Share2,
} from "lucide-react";
import { SupportModal } from "@/components/parts/public/SupportModal";
import { db } from "@/db/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
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

export default function ExplorePostDetailPage({ postId }: { postId: string }) {
  const { user: currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [creatorData, setCreatorData] = useState<any>({});
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [userLiked, setUserLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
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
    fetch();
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
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (!currentUser?.uid || !postId) return;
    const checkLike = async () => {
      const likeRef = collection(db, "creatorContent", postId, "likes");
      const q = query(likeRef, where("userId", "==", currentUser.uid));
      const snap = await getDocs(q);
      setUserLiked(!snap.empty);
    };
    checkLike();
  }, [currentUser?.uid, postId]);

  useEffect(() => {
    if (!postId) return;
    const likesRef = collection(db, "creatorContent", postId, "likes");
    const unsub = onSnapshot(likesRef, (snap) => {
      setLikes(new Set(snap.docs.map((d) => d.data().userId)));
    }, () => {});
    return () => unsub();
  }, [postId]);

  const handleLike = useCallback(async () => {
    if (!currentUser?.uid) {
      toast.error("Please log in to like");
      return;
    }
    const postRef = doc(db, "creatorContent", postId);
    const likeRef = collection(db, "creatorContent", postId, "likes");
    const q = query(likeRef, where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref);
      await updateDoc(postRef, { "stats.likes": increment(-1) });
    } else {
      await addDoc(likeRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
      await updateDoc(postRef, { "stats.likes": increment(1) });
    }
  }, [currentUser?.uid, postId]);

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
    try {
      await deleteDoc(doc(db, "creatorContent", postId, "comments", commentId));
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(-1),
      });
      setDeleteCommentId(null);
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/explore/posts/${postId}`;
    if (navigator.share) {
      await navigator.share({ title: post?.title || "Post", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handle = creatorData.handle || post?.creatorId || "";
  const creatorName = creatorData.name || handle || "Creator";
  const creatorPhoto = creatorData.profilePicture || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <Link href="/explore/posts" className="text-orange-600 font-medium mt-4 inline-block hover:underline">
            &larr; Back to posts
          </Link>
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

  const pages = post.type === "document" && post.contentUrl
    ? (Array.isArray(post.contentUrl) ? post.contentUrl : [post.contentUrl])
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-8">
        {/* Back link */}
        <Link
          href="/explore/posts"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={18} /> Back to posts
        </Link>

        {/* Author Header */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-card rounded-xl border border-border">
          <Link href={`/${handle}`} className="shrink-0">
            <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
              {creatorPhoto ? (
                <img src={creatorPhoto} alt={creatorName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={24} className="text-muted-foreground" />
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1">
            <Link href={`/${handle}`} className="font-bold text-lg hover:text-orange-600 transition-colors">
              {creatorName}
            </Link>
            {handle && (
              <p className="text-sm text-muted-foreground">@{handle}</p>
            )}
          </div>
          <button
            onClick={handleShare}
            className="p-3 bg-muted rounded-full hover:bg-muted/80 transition-colors"
            title="Share"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Post Content */}
        <article className="bg-card rounded-2xl border border-border p-6 md:p-8">
          {/* Type Badge + Date */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded uppercase tracking-widest text-muted-foreground">
              {post.type === "video" ? "Video" : post.type === "image" ? "Image" : post.type === "document" ? "Document" : "Post"}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={12} />
              {post.createdAt?.toDate?.().toLocaleDateString() || "Recently"}
            </span>
          </div>

          {/* Media */}
          {post.type === "image" && post.contentUrl && (
            <div
              className="mb-6 rounded-xl overflow-hidden cursor-zoom-in"
              onClick={() => setViewingImage(post.contentUrl)}
            >
              <img
                src={post.contentUrl}
                alt={post.title}
                className="w-full max-h-[500px] object-contain bg-muted"
              />
            </div>
          )}

          {post.type === "video" && post.contentUrl && (
            <div className="mb-6 rounded-xl overflow-hidden bg-black">
              <video
                src={post.contentUrl}
                controls
                controlsList="nodownload"
                className="w-full aspect-video"
              />
            </div>
          )}

          {post.type === "document" && pages.length > 0 && (
            <div className="mb-6 bg-muted rounded-xl p-6 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FileText size={32} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold">Document</p>
                  <p className="text-sm text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              {pages.length > 1 && (
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setDocumentIndex(Math.max(0, documentIndex - 1))}
                    disabled={documentIndex === 0}
                    className="p-2 bg-card border rounded-lg disabled:opacity-50"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-medium">{documentIndex + 1} of {pages.length}</span>
                  <button
                    onClick={() => setDocumentIndex(Math.min(pages.length - 1, documentIndex + 1))}
                    disabled={documentIndex === pages.length - 1}
                    className="p-2 bg-card border rounded-lg disabled:opacity-50"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              <iframe
                src={pages[documentIndex]}
                className="w-full h-[500px] rounded-lg border border-border"
                title="Document viewer"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{post.title || "Untitled"}</h1>

          {/* Description */}
          {post.description || post.content ? (
            <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-base">
              <LinkifyText text={post.description || post.content} />
            </div>
          ) : null}

          {/* YouTube Embed */}
          {youtubeUrl && (
            <div className="mt-6 rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeUrl.videoId}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
            {post.views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye size={16} /> {post.views} views
              </span>
            )}
            <span className="flex items-center gap-1">
              <Heart size={16} /> {likes.size}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={16} /> {comments.length}
            </span>
          </div>
        </article>

        {/* Like & Comment Section */}
        <div className="mt-8 bg-card rounded-2xl border border-border p-6">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all text-sm ${
              userLiked
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
            }`}
          >
            <Heart size={18} fill={userLiked ? "currentColor" : "none"} />
            {userLiked ? "Liked" : "Like"} ({likes.size})
          </button>

          {/* Comment Form */}
          {currentUser ? (
            <div className="mt-6 flex gap-3">
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
                  {submittingComment ? <Loader size={16} className="animate-spin" /> : "Post"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              <Link href="/login" className="text-orange-600 font-medium hover:underline">Log in</Link> to like and comment.
            </p>
          )}

          {/* Comments List */}
          {comments.length > 0 && (
            <div className="mt-6 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                    {comment.userPhoto ? (
                      <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" />
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
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            className="flex-1 bg-background border rounded-lg px-3 py-1 text-sm outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleEditComment(comment.id)} className="text-orange-600 text-sm font-medium">Save</button>
                          <button onClick={() => { setEditingCommentId(null); setEditCommentContent(""); }} className="text-muted-foreground text-sm">Cancel</button>
                        </div>
                      ) : (
                        <p className="text-sm mt-0.5">{comment.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt?.toDate?.().toLocaleDateString() || ""}
                      </span>
                      {currentUser?.uid === comment.userId && (
                        <>
                          <button
                            onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }}
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
              <button onClick={() => handleDeleteComment(deleteCommentId)} className="text-sm font-bold text-red-600 hover:underline">Yes</button>
              <button onClick={() => setDeleteCommentId(null)} className="text-sm text-muted-foreground hover:underline">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Post image" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      {/* Support Modal */}
      {isModalOpen && handle && (
        <SupportModal
          creatorHandle={handle}
          creatorName={creatorName}
          creatorPhoto={creatorPhoto}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
