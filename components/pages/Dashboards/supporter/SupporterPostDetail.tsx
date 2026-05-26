/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Loader,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/db/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/parts/Navigation";

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: any;
  parentId?: string;
  replies?: Comment[];
}

export default function SupporterPostDetail({ postId }: { postId: string }) {
  const { user: currentUser, profile: authProfile } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeDocId, setLikeDocId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [documentIndex, setDocumentIndex] = useState(0);
  const viewCounted = useRef(false);

  useEffect(() => {
    if (!postId) return;
    const fetch = async () => {
      try {
        const postRef = doc(db, "creatorContent", postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) { setLoading(false); return; }
        const postData = { id: postSnap.id, ...postSnap.data() };
        setPost(postData);

        const creatorRef = doc(db, "creators", (postData as any).creatorId);
        const creatorSnap = await getDoc(creatorRef);
        if (creatorSnap.exists()) setCreator(creatorSnap.data());

        if (currentUser?.uid) {
          const likeRef = collection(db, "creatorContent", postId, "likes");
          const userLikeQ = query(
            likeRef,
            where("userId", "==", currentUser.uid),
          );
          const userLikeSnap = await getDocs(userLikeQ);
          if (!userLikeSnap.empty) {
            setLiked(true);
            setLikeDocId(userLikeSnap.docs[0].id);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [postId, currentUser?.uid]);

  useEffect(() => {
    if (loading || !postId || viewCounted.current) return;
    viewCounted.current = true;
    updateDoc(doc(db, "creatorContent", postId), { views: increment(1) }).catch(() => {});
  }, [loading, postId]);

  useEffect(() => {
    if (!postId) return;
    const commentsRef = collection(db, "creatorContent", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[];
      const organized: Comment[] = [];
      const replyMap: Record<string, Comment[]> = {};
      list.forEach((c) => {
        if (c.parentId) {
          if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
          replyMap[c.parentId].push(c);
        } else {
          organized.push(c);
        }
      });
      organized.forEach((c) => { c.replies = replyMap[c.id] || []; });
      setComments(organized);
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const likesRef = collection(db, "creatorContent", postId, "likes");
    const unsub = onSnapshot(likesRef, (snap) => {
      setLikeCount(snap.size);
    });
    return () => unsub();
  }, [postId]);

  const handleLike = async () => {
    if (!currentUser?.uid) { toast.error("Please login"); return; }
    try {
      if (liked && likeDocId) {
        await deleteDoc(doc(db, "creatorContent", postId, "likes", likeDocId));
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
        setLikeDocId(null);
      } else {
        const ref = await addDoc(collection(db, "creatorContent", postId, "likes"), {
          postId,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        setLiked(true);
        setLikeDocId(ref.id);
        setLikeCount((c) => c + 1);
      }
    } catch { toast.error("Failed to update like"); }
  };

  const handleComment = async () => {
    if (!currentUser?.uid || !commentText.trim()) return;
    try {
      await addDoc(collection(db, "creatorContent", postId, "comments"), {
        postId,
        text: commentText.trim(),
        userId: currentUser.uid,
        userName: authProfile?.displayName || "Anonymous",
        userPhoto: authProfile?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setCommentText("");
      toast.success("Comment added");
    } catch { toast.error("Failed to add comment"); }
  };

  const handleReply = async (parentId: string) => {
    if (!currentUser?.uid || !replyText[parentId]?.trim()) return;
    try {
      await addDoc(collection(db, "creatorContent", postId, "comments"), {
        postId,
        parentId,
        text: replyText[parentId].trim(),
        userId: currentUser.uid,
        userName: authProfile?.displayName || "Anonymous",
        userPhoto: authProfile?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo(null);
      toast.success("Reply added");
    } catch { toast.error("Failed to add reply"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader className="animate-spin text-orange-500" size={32} />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-muted">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <p className="text-muted-foreground">Post not found</p>
          <button onClick={() => router.push("/supporter")} className="mt-4 text-orange-500 font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  const pages = post.contentUrl && Array.isArray(post.contentUrl) ? post.contentUrl : post.contentUrl ? [post.contentUrl] : [];

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-24">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/${post.creatorId}`} className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                  {creator?.name?.[0] || "?"}
                </div>
              </Link>
              <div>
                <Link href={`/${post.creatorId}`} className="font-semibold text-foreground hover:text-blue-600">
                  {creator?.name || post.creatorId}
                </Link>
                <p className="text-xs text-muted-foreground">
                  @{post.creatorId} Â· {post.createdAt?.toDate?.()?.toLocaleDateString()}
                </p>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-3">{post.title}</h1>

            <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
              {post.description || post.content}
            </div>

            {post.type === "image" && !Array.isArray(post.contentUrl) && post.contentUrl && (
              <div className="rounded-lg overflow-hidden bg-muted mb-4">
                <img src={post.contentUrl} alt={post.title} className="w-full max-h-[500px] object-contain" />
              </div>
            )}

            {post.type === "video" && post.contentUrl && (
              <div className="rounded-lg overflow-hidden bg-black mb-4">
                <video src={post.contentUrl} controls controlsList="nodownload" className="w-full aspect-video" />
              </div>
            )}

            {post.type === "document" && pages.length > 0 && (
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
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Eye size={16} /> {post.views || 0}</span>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${liked ? "bg-red-50 text-red-500" : "bg-muted text-muted-foreground hover:bg-gray-200"}`}>
                <Heart size={18} className={liked ? "fill-current" : ""} /> {likeCount}
              </button>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground">
                <MessageCircle size={18} /> {comments.length}
              </span>
            </div>
          </div>

          <div className="border-t border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Comments ({comments.length})</h3>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 overflow-hidden">
                      {comment.userPhoto ? <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" /> : comment.userName?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">{comment.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{comment.text}</p>
                      <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-xs text-blue-500 mt-1">
                        Reply
                      </button>
                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                          <input value={replyText[comment.id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [comment.id]: e.target.value }))} placeholder="Write a reply..." className="flex-1 text-xs px-3 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => handleReply(comment.id)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs">Send</button>
                        </div>
                      )}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-2 ml-3 space-y-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2 pl-2 border-l-2 border-border">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 overflow-hidden">
                                {reply.userPhoto ? <img src={reply.userPhoto} alt="" className="w-full h-full object-cover" /> : reply.userName?.[0] || "?"}
                              </div>
                              <div>
                                <span className="font-medium text-xs">{reply.userName}</span>
                                <p className="text-xs text-muted-foreground">{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." className="flex-1 text-sm px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={(e) => e.key === "Enter" && handleComment()} />
              <button onClick={handleComment} disabled={!commentText.trim()} className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"><Send size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
