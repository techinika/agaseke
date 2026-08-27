/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, FileText, Lock, MessageCircle, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { SupportModal } from "@/components/parts/public/SupportModal";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, orderBy, addDoc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, increment } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import DetailSkeleton from "@/components/ui/DetailSkeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LinkifyText } from "@/components/ui/LinkifyText";

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
  const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)[^\s]+/gi;
  const match = text.match(urlPattern);
  if (match) return match[0];
  return null;
};

export default function PostDetailPage({ username, postId }: { username: string; postId: string }) {
  const { user: currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [userLiked, setUserLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [viewingImage, setViewingImage] = useState<{ url: string } | null>(null);
  const viewCounted = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (!creatorSnap.exists()) { setLoading(false); return; }
        setCreatorData(creatorSnap.data());

        const postRef = doc(db, "creatorContent", postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) { setLoading(false); return; }
        const postData = { id: postSnap.id, ...postSnap.data() };
        setPost(postData);
      } catch (e) { console.error("Failed to load post", e); toast.error("Failed to load post"); }
      finally { setLoading(false); }
    };
    fetch();
  }, [username, postId]);

  useEffect(() => {
    if (loading || !postId || viewCounted.current) return;
    viewCounted.current = true;
    const postRef = doc(db, "creatorContent", postId);
    updateDoc(postRef, { views: increment(1) }).catch((err) => { console.error("Failed to update view count", err); });
  }, [loading, postId]);

  useEffect(() => {
    if (!postId) return;
    const commentsRef = collection(db, "creatorContent", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q,
      (snap) => { setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
      () => {},
    );
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
    const unsub = onSnapshot(likesRef,
      (snap) => { setLikes(new Set(snap.docs.map(d => d.data().userId))); },
      () => {},
    );
    return () => unsub();
  }, [postId]);

  const handleLike = useCallback(async () => {
    if (!currentUser?.uid) { toast.error("Please log in to like"); return; }
    const postRef = doc(db, "creatorContent", postId);
    const likeRef = collection(db, "creatorContent", postId, "likes");
    const q = query(likeRef, where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref);
      await updateDoc(postRef, { "stats.likes": increment(-1) });
      setUserLiked(false);
    } else {
      await addDoc(likeRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
      await updateDoc(postRef, { "stats.likes": increment(1) });
      setUserLiked(true);
      if (currentUser.uid !== creatorData?.uid) {
        currentUser.getIdToken().then((token) => {
          fetch(`${GENERAL_WORKER_URL}/api/general/notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              userId: creatorData?.uid,
              type: "new_like",
              title: "New Like!",
              message: `${profile?.displayName || currentUser.displayName || "Someone"} liked your post${post?.title ? ` "${post.title}"` : ""}`,
              link: `/${username}/community/${postId}`,
              actorName: profile?.displayName || currentUser.displayName || "Anonymous",
              actorId: currentUser.uid,
              metadata: { postId, postTitle: post?.title, username },
            }),
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, [currentUser, postId, creatorData, profile, post, username]);

  const handleComment = useCallback(async () => {
    if (!currentUser?.uid) { toast.error("Please log in to comment"); return; }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, "creatorContent", postId, "comments"), {
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
      if (currentUser.uid !== creatorData?.uid) {
        currentUser.getIdToken().then((token) => {
          fetch(`${GENERAL_WORKER_URL}/api/general/notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              userId: creatorData?.uid,
              type: "new_comment",
              title: "New Comment!",
              message: `${profile?.displayName || currentUser.displayName || "Someone"} commented on your post${post?.title ? ` "${post.title}"` : ""}`,
              link: `/${username}/community/${postId}`,
              actorName: profile?.displayName || currentUser.displayName || "Anonymous",
              actorId: currentUser.uid,
              metadata: { postId, postTitle: post?.title, username },
            }),
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch { toast.error("Failed to add comment"); }
    finally { setSubmittingComment(false); }
  }, [currentUser, newComment, postId, profile, creatorData, post, username]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setDeleteCommentId(commentId);
  }, []);

  const confirmDeleteComment = useCallback(async () => {
    if (!deleteCommentId) return;
    try {
      await deleteDoc(doc(db, "creatorContent", postId, "comments", deleteCommentId));
      toast.success("Comment deleted");
      setDeleteCommentId(null);
    } catch { toast.error("Failed to delete comment"); }
  }, [postId, deleteCommentId]);

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      await updateDoc(doc(db, "creatorContent", postId, "comments", commentId), {
        content: editCommentContent.trim(),
        editedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
      setEditCommentContent("");
      toast.success("Comment updated");
    } catch { toast.error("Failed to update comment"); }
  }, [editCommentContent, postId]);

  const startEditing = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  if (loading) return <DetailSkeleton />;
  if (!post || !creatorData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Post not found</p>
          <Link href={`/${username}`} className="text-orange-500 font-bold mt-4 inline-block">Go Back</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/${username}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition inline-flex">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Profile</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 transition"
          >
            <Heart size={18} className="fill-current" />
            Support
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/${username}`} className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                  {creatorData?.name?.[0] || "?"}
                </div>
              </Link>
              <div>
                <Link href={`/${username}`} className="font-semibold text-foreground hover:text-orange-600">
                  {creatorData?.name || username}
                </Link>
                <p className="text-xs text-muted-foreground">
                  @{username} &middot; {post.createdAt?.toDate?.().toLocaleDateString()}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded uppercase tracking-widest text-muted-foreground">
                  {post.type === "video" ? "Video" : post.type === "image" ? "Image" : post.type === "document" ? "Document" : post.type === "article" ? "Article" : "Post"}
                </span>
                {post.isPrivate && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <Lock size={10} /> Supporters Only
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-3">{post.title}</h1>

            {post.type === "article" ? (
              <div className="mb-4">
                {(post.coverUrl || post.contentUrl) && (
                  <img
                    src={post.coverUrl || post.contentUrl}
                    alt={post.title}
                    className="w-full max-h-[420px] object-cover rounded-xl mb-4"
                  />
                )}
                {post.shortDescription && (
                  <p className="text-sm text-muted-foreground italic mb-4">
                    {post.shortDescription}
                  </p>
                )}
                <RichContentRenderer html={post.htmlContent || ""} />
              </div>
            ) : (
              <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
                <LinkifyText text={post.description || post.content} />
              </div>
            )}

            {(() => {
              const text = post.description || post.content || "";
              const youtubeUrl = hasYouTubeLink(text);
              if (!youtubeUrl) return null;
              const videoId = extractYouTubeId(youtubeUrl);
              if (!videoId) return null;
              return (
                <div className="rounded-lg overflow-hidden bg-black mb-4">
                  <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              );
            })()}

            {post.type === "image" && !Array.isArray(post.contentUrl) && post.contentUrl && (
              <div className="rounded-lg overflow-hidden bg-muted mb-4 cursor-zoom-in" onClick={() => setViewingImage({ url: post.contentUrl })}>
                <img src={post.contentUrl} alt={post.title} className="w-full max-h-[500px] object-contain hover:opacity-90 transition-opacity" />
              </div>
            )}

            {post.type === "video" && post.contentUrl && (
              <div className="rounded-lg overflow-hidden bg-black mb-4">
                <video src={post.contentUrl} controls controlsList="nodownload" className="w-full aspect-video" />
              </div>
            )}

            {post.type === "document" && (() => {
              const pages = post.contentUrl && Array.isArray(post.contentUrl) ? post.contentUrl : post.contentUrl ? [post.contentUrl] : [];
              if (pages.length === 0) return null;
              return (
                <div className="bg-muted rounded-lg p-4 border border-border mb-4">
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
                      <button onClick={() => setDocumentIndex((i) => Math.max(0, i - 1))} disabled={documentIndex === 0} className="p-1.5 bg-card border rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
                      <span className="text-sm text-muted-foreground">{documentIndex + 1} of {pages.length}</span>
                      <button onClick={() => setDocumentIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={documentIndex === pages.length - 1} className="p-1.5 bg-card border rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
                    </div>
                  )}
                  <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(pages[documentIndex])}&embedded=true`} className="w-full h-[500px] rounded-lg bg-card" title="Document" />
                </div>
              );
            })()}

            <div className="flex items-center gap-4 pt-4 border-t border-border text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Eye size={16} /> {post.views || 0}</span>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${userLiked ? "bg-red-50 text-red-500" : "bg-muted text-muted-foreground hover:bg-gray-200"}`}>
                <Heart size={18} className={userLiked ? "fill-current" : ""} /> {likes.size}
              </button>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground">
                <MessageCircle size={18} /> {comments.length}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 text-foreground">Comments ({comments.length})</h3>
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 bg-card p-4 rounded-xl border border-border">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-xs font-bold text-orange-600 dark:text-orange-300 flex-shrink-0 overflow-hidden">
                  {c.userPhoto ? <img src={c.userPhoto} alt="" className="w-full h-full object-cover" /> : (c.userName?.[0] || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{c.userName}</p>
                  {editingCommentId === c.id ? (
                    <div className="mt-1 flex gap-2">
                      <input value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)}
                        className="flex-1 bg-background border border-border-strong rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900 outline-none text-foreground"
                        onKeyDown={e => e.key === "Enter" && handleEditComment(c.id)} />
                      <button onClick={() => handleEditComment(c.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition"><Check size={16} /></button>
                      <button onClick={() => { setEditingCommentId(null); setEditCommentContent(""); }} className="p-1.5 text-muted-foreground hover:bg-muted dark:hover:bg-card-hover rounded-lg transition"><X size={16} /></button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap"><LinkifyText text={c.content} /></p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] text-muted-foreground">{c.createdAt?.toDate?.().toLocaleDateString() || ""}</p>
                    {(currentUser?.uid === c.userId) && !editingCommentId && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditing(c)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition"><Pencil size={12} /></button>
                        <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">No comments yet. Be the first to comment!</p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={currentUser ? "Write a comment..." : "Log in to comment"}
              disabled={!currentUser} onKeyDown={e => e.key === "Enter" && handleComment()}
              className="flex-1 bg-background border border-border-strong rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900 outline-none text-foreground placeholder:text-muted-foreground" />
            <button onClick={handleComment} disabled={!currentUser || !newComment.trim() || submittingComment}
              className="px-5 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-50">
              {submittingComment ? <Loader className="animate-spin" size={16} /> : "Post"}
            </button>
          </div>
        </div>
      </div>
      {viewingImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingImage(null)}>
          <button className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition" onClick={() => setViewingImage(null)}>
            <X size={28} />
          </button>
          <img src={viewingImage.url} alt="Full size" className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-200" />
        </div>
      )}

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorName={creatorData?.name || username}
        creatorId={username}
        uid={creatorData?.uid || ""}
        includeReferral={false}
      />

      <ConfirmModal
        isOpen={deleteCommentId !== null}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={confirmDeleteComment}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
