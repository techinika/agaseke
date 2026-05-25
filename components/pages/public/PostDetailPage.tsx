/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Loader, FileText, Lock, Globe, MessageCircle, Share2, Pencil, Trash2, Check, X } from "lucide-react";
import { db } from "@/db/firebase";
import { doc, getDoc, getDocs, collection, query, where, orderBy, addDoc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, increment } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";
import DetailSkeleton from "@/components/ui/DetailSkeleton";

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
  const viewCounted = useRef(false);

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
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [username, postId]);

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
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
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
      setLikes(new Set(snap.docs.map(d => d.data().userId)));
    });
    return () => unsub();
  }, [postId]);

  const handleLike = useCallback(async () => {
    if (!currentUser?.uid) { toast.error("Please log in to like"); return; }
    const likeRef = collection(db, "creatorContent", postId, "likes");
    const q = query(likeRef, where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref);
      setUserLiked(false);
    } else {
      await addDoc(likeRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
      setUserLiked(true);
      if (currentUser.uid !== creatorData?.uid) {
        fetch("/api/comms/post/notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorUid: creatorData?.uid,
            type: "like",
            actorName: profile?.displayName || currentUser.displayName || "Anonymous",
            actorId: currentUser.uid,
            postTitle: post?.title,
            postId,
            username,
          }),
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
      setNewComment("");
      if (currentUser.uid !== creatorData?.uid) {
        fetch("/api/comms/post/notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorUid: creatorData?.uid,
            type: "comment",
            actorName: profile?.displayName || currentUser.displayName || "Anonymous",
            actorId: currentUser.uid,
            postTitle: post?.title,
            postId,
            username,
          }),
        }).catch(() => {});
      }
    } catch { toast.error("Failed to add comment"); }
    finally { setSubmittingComment(false); }
  }, [currentUser, newComment, postId, profile, creatorData, post, username]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "creatorContent", postId, "comments", commentId));
      toast.success("Comment deleted");
    } catch { toast.error("Failed to delete comment"); }
  }, [postId]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-muted-foreground">Post not found</p>
          <Link href={`/${username}`} className="text-orange-500 font-bold mt-4 inline-block">Go Back</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href={`/${username}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8 inline-flex">
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Profile</span>
        </Link>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded uppercase tracking-widest text-muted-foreground">
              {post.type === "video" ? "Video" : post.type === "image" ? "Image" : post.type === "document" ? "Document" : "Post"}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${post.isPrivate ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400" : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"}`}>
              {post.isPrivate ? <><Lock size={10} /> Supporters Only</> : <><Globe size={10} /> Public</>}
            </span>
          </div>

          {post.type === "image" && post.contentUrl && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img src={post.contentUrl} alt={post.title} className="w-full max-h-[500px] object-cover" />
            </div>
          )}
          {post.type === "video" && post.contentUrl && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <video src={post.contentUrl} controls className="w-full max-h-[500px] object-cover bg-black" />
            </div>
          )}
          {post.type === "document" && post.contentUrl && (
            <a href={post.contentUrl} target="_blank" rel="noopener noreferrer"
              className="mb-4 flex items-center gap-3 p-4 bg-muted rounded-lg border border-border hover:bg-card-hover transition-colors">
              <FileText size={24} className="text-orange-500" />
              <span className="text-sm font-medium text-foreground">Download Document</span>
            </a>
          )}

          <h1 className="text-2xl font-bold mb-3 text-foreground">{post.title}</h1>
          {(post.description || post.content) && (
            <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {post.description || post.content}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
            <span>{post.createdAt?.toDate?.().toLocaleDateString() || "Recently"}</span>
            {post.views && <span>{post.views} views</span>}
          </div>

          <div className="mt-4 flex items-center gap-4 pt-4 border-t border-border">
            <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${userLiked ? "bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400" : "bg-muted text-muted-foreground hover:bg-card-hover"}`}>
              <Heart size={16} className={userLiked ? "fill-current" : ""} /> {likes.size}
            </button>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground">
              <MessageCircle size={16} /> {comments.length}
            </span>
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
                      <button onClick={() => { setEditingCommentId(null); setEditCommentContent(""); }} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"><X size={16} /></button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
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
      <Footer />
    </div>
  );
}
