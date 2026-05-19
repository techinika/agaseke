/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Zap,
  Loader,
  User,
  MapPin,
  X,
  CheckCircle2,
  Eye,
  FileText,
  ShoppingBag,
  Package,
  Heart,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Play,
  Paperclip,
  Calendar,
  TrendingUp,
  Sparkles,
  Download,
} from "lucide-react";
import Navbar from "@/components/parts/Navigation";
import { useAuth } from "@/auth/AuthContext";
import Loading from "@/app/loading";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function SupporterSpace() {
  const auth = useAuth();
  const router = useRouter();
  const [creators, setCreators] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<"all" | "following" | "public">(
    "all",
  );

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>(
    {} as Record<string, Comment[]>,
  );
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>(
    {},
  );
  const [loadingComments, setLoadingComments] = useState<
    Record<string, boolean>
  >({});
  const [documentIndex, setDocumentIndex] = useState<Record<string, number>>(
    {},
  );
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedDocIds, setLikedDocIds] = useState<Record<string, string>>({});
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null);
  const [seenPosts, setSeenPosts] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string } | null>(
    null,
  );
  const postRefs = useRef<Record<string, HTMLDivElement>>({});

  let supportedCreatorUids = new Set<string>();

  useEffect(() => {
    const fetchSupporterData = async () => {
      if (!auth.user?.uid) return;
      setLoading(true);

      try {
        const supportRef = collection(db, "supportedCreators");
        const qSupport = query(
          supportRef,
          where("supporterId", "==", auth.user.uid),
        );
        const supportSnap = await getDocs(qSupport);

        supportedCreatorUids = new Set(
          supportSnap.docs.map((d) => d.data().creatorId),
        );

        const purchasesQuery = query(
          collection(db, "storeOrders"),
          where("buyerId", "==", auth.user.uid),
        );

        const [
          contentSnap,
          gatheringSnap,
          creatorsSnap,
          purchasesSnap,
          commentsSnap,
        ] = await Promise.all([
          getDocs(
            query(
              collection(db, "creatorContent"),
              orderBy("createdAt", "desc"),
            ),
          ),
          getDocs(
            query(
              collection(db, "creatorGatherings"),
              orderBy("createdAt", "desc"),
            ),
          ),
          getDocs(collection(db, "creators")),
          getDocs(purchasesQuery),
          getDocs(collection(db, "postComments")),
        ]);

        const counts: Record<string, number> = {};
        commentsSnap.docs.forEach((d) => {
          const postId = d.data().postId;
          counts[postId] = (counts[postId] || 0) + 1;
        });
        setCommentCounts(counts);

        let profileMap = new Map();
        if (supportedCreatorUids.size > 0) {
          const profilesSnap = await getDocs(
            query(
              collection(db, "profiles"),
              where("uid", "in", Array.from(supportedCreatorUids)),
            ),
          );
          profilesSnap.docs.forEach((d) => {
            const data = d.data();
            profileMap.set(data.uid, data.photoURL);
          });
        }

        const creatorMap = new Map();
        const supportedHandles = new Set<string>();
        creatorsSnap.docs.forEach((d) => {
          const data = d.data();
          creatorMap.set(d.id, {
            name: data.name,
            handle: d.id,
            uid: data.uid,
            photoURL: data.profilePicture || profileMap.get(data.uid) || null,
          });
          if (supportedCreatorUids.has(data.uid)) {
            supportedHandles.add(d.id);
          }
        });

        const contents = contentSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item: any) => {
            const isSupportedByHandle = supportedHandles.has(item.creatorId);
            const isSupportedByUid = supportedCreatorUids.has(item.creatorId);
            const isSupported = isSupportedByHandle || isSupportedByUid;
            return !item.isPrivate || isSupported;
          });

        const gatherings = gatheringSnap.docs
          .map((d) => ({ id: d.id, ...d.data(), type: "gathering" }))
          .filter((item: any) => {
            const isSupportedByHandle = supportedHandles.has(item.creatorId);
            const isSupportedByUid = supportedCreatorUids.has(item.creatorId);
            return isSupportedByHandle || isSupportedByUid;
          });

        const combinedFeed = [...contents, ...gatherings].map((item: any) => {
          let creator = creatorMap.get(item.creatorId);
          if (!creator) {
            for (const [handle, data] of creatorMap) {
              if (data.uid === item.creatorId) {
                creator = data;
                break;
              }
            }
          }
          const isFollowingByHandle = supportedHandles.has(item.creatorId);
          const isFollowingByUid = supportedCreatorUids.has(item.creatorId);
          const isFollowing = isFollowingByHandle || isFollowingByUid;
          return {
            ...item,
            creatorName:
              creator?.name || item.creatorId?.substring(0, 8) || "Unknown",
            creatorHandle: creator?.handle || item.creatorId || "creator",
            creatorPhoto: creator?.photoURL || null,
            creatorUid: creator?.uid || item.creatorId,
            isFollowing,
            isPublic: !item.isPrivate,
            likes: item.stats?.likes || 0,
            commentCount: counts[item.id] || 0,
          };
        });

        const favoritesData = creatorsSnap.docs
          .filter((d) => supportedCreatorUids.has(d.data().uid))
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              photoURL: data.profilePicture || profileMap.get(data.uid) || null,
              handle: d.id,
              updates: 0,
            };
          });

        setFavorites(favoritesData);
        setFeed(combinedFeed);

        const purchasesData = purchasesSnap.docs
          .map((d) => {
            const data = d.data();
            const creator = creatorMap.get(data.creatorUid);
            return {
              id: d.id,
              ...data,
              creatorName: creator?.name || "Unknown Creator",
              creatorHandle: creator?.handle || "creator",
              creatorPhoto: creator?.photoURL || null,
            };
          })
          .sort(
            (a: any, b: any) =>
              (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
          );
        setPurchases(purchasesData);

        const discoveryList = creatorsSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              handle: d.id,
              ...data,
              photoURL: data.profilePicture || null,
            };
          })
          .filter((c: any) => !supportedCreatorUids.has(c.uid));
        setCreators(discoveryList);
      } catch (error) {
        console.error("Fetch Supporter Space Error:", error);
        toast.error("Failed to load your feed.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupporterData();
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user?.uid) return;

    const likedRef = collection(db, "postLikes");
    const likedQuery = query(likedRef, where("userId", "==", auth.user.uid));
    const unsubscribe = onSnapshot(likedQuery, (snap) => {
      const liked = new Set<string>();
      const docIds: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const postId = d.data().postId;
        liked.add(postId);
        docIds[postId] = d.id;
      });
      setLikedPosts(liked);
      setLikedDocIds(docIds);
    });

    return () => unsubscribe();
  }, [auth.user?.uid]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute("data-post-id");
          if (postId && entry.isIntersecting && !seenPosts.has(postId)) {
            setSeenPosts((prev) => new Set(prev).add(postId));

            const item = feed.find(
              (f) => f.id === postId && f.type === "content",
            );
            if (item) {
              updateDoc(doc(db, "creatorContent", postId), {
                views: increment(1),
              }).catch(() => {});
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    Object.values(postRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [feed, seenPosts]);

  const fetchComments = async (postId: string) => {
    if (comments[postId] && comments[postId].length > 0) return;
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const q = query(
        collection(db, "postComments"),
        where("postId", "==", postId),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const commentList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Comment[];

      const organizedComments: Comment[] = [];
      const replyMap: Record<string, Comment[]> = {};

      commentList.forEach((c) => {
        if (c.parentId) {
          if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
          replyMap[c.parentId].push(c);
        } else {
          organizedComments.push(c);
        }
      });

      organizedComments.forEach((c) => {
        c.replies = replyMap[c.id] || [];
      });

      setComments((prev) => ({ ...prev, [postId]: organizedComments }));
    } catch (e) {
      console.error("Failed to load comments", e);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText[postId]?.trim() || !auth.user) return;
    try {
      const newComment = {
        postId,
        text: commentText[postId],
        userId: auth.user.uid,
        userName: auth.profile?.displayName || "Anonymous",
        userPhoto: auth.profile?.photoURL || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "postComments"), newComment);
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
      toast.success("Comment added");
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };

  const handleAddReply = async (postId: string, parentId: string) => {
    if (!replyText[parentId]?.trim() || !auth.user) return;
    try {
      const newReply = {
        postId,
        parentId,
        text: replyText[parentId],
        userId: auth.user.uid,
        userName: auth.profile?.displayName || "Anonymous",
        userPhoto: auth.profile?.photoURL || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "postComments"), newReply);
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [parentId]: null }));
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[postId];
        return newComments;
      });
      fetchComments(postId);
      setCommentCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + 1,
      }));
    } catch (e) {
      toast.error("Failed to add reply");
    }
  };

  const handleLike = async (item: any) => {
    if (!auth.user) return toast.error("Please login");
    const postKey = item.id;

    if (likedPosts.has(postKey)) {
      const likeDocId = likedDocIds[postKey];
      if (likeDocId) {
        try {
          await deleteDoc(doc(db, "postLikes", likeDocId));
          await updateDoc(doc(db, "creatorContent", item.id), {
            "stats.likes": increment(-1),
          });
          setFeed((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, likes: Math.max(0, (f.likes || 0) - 1) }
                : f,
            ),
          );
        } catch (e) {
          console.error("Unlike error", e);
        }
      }
      return;
    }

    setLikedPosts((prev) => new Set(prev).add(postKey));
    setFeed((prev) =>
      prev.map((f) =>
        f.id === item.id ? { ...f, likes: (f.likes || 0) + 1 } : f,
      ),
    );

    try {
      const docRef = await addDoc(collection(db, "postLikes"), {
        postId: item.id,
        userId: auth.user.uid,
        createdAt: serverTimestamp(),
      });
      setLikedDocIds((prev) => ({ ...prev, [item.id]: docRef.id }));
      await updateDoc(doc(db, "creatorContent", item.id), {
        "stats.likes": increment(1),
      });
    } catch (e) {
      console.error("Like error", e);
    }
  };

  const toggleExpand = async (item: any) => {
    if (expandedPostId === item.id) {
      setExpandedPostId(null);
      setShowCommentFor(null);
      return;
    }
    setExpandedPostId(item.id);
    setDocumentIndex((prev) => ({ ...prev, [item.id]: 0 }));
  };

  const toggleComments = (item: any) => {
    if (showCommentFor === item.id) {
      setShowCommentFor(null);
    } else {
      setShowCommentFor(item.id);
      fetchComments(item.id);
    }
  };

  const filteredFeed = feed.filter((item) => {
    if (feedFilter === "following") return item.isFollowing;
    if (feedFilter === "public") return item.isPublic && !item.isFollowing;
    return true;
  });

  const renderYouTubeEmbed = (text: string) => {
    const youtubeUrl = hasYouTubeLink(text);
    if (!youtubeUrl) return null;

    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) return null;

    return (
      <div className="mt-3 rounded-lg overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  };

  const renderContentMedia = (item: any) => {
    const contentUrl = item.contentUrl || item.imageUrl || item.docUrl;
    const isVideo = item.type === "video";

    if (!contentUrl) return null;

    if (isVideo) {
      return (
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mt-3">
          <video
            src={contentUrl}
            controls
            controlsList="nodownload"
            className="w-full h-full"
          />
        </div>
      );
    }

    if (item.type === "document" || item.contentType === "document") {
      const pages = Array.isArray(contentUrl) ? contentUrl : [contentUrl];
      const currentIndex = documentIndex[item.id] || 0;
      const currentUrl = pages[currentIndex];

      return (
        <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900">Document</p>
              <p className="text-xs text-gray-500">
                {pages.length} page{pages.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {pages.length > 1 && (
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDocumentIndex((prev) => ({
                    ...prev,
                    [item.id]: Math.max(0, currentIndex - 1),
                  }));
                }}
                disabled={currentIndex === 0}
                className="p-1.5 bg-white border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} of {pages.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDocumentIndex((prev) => ({
                    ...prev,
                    [item.id]: Math.min(pages.length - 1, currentIndex + 1),
                  }));
                }}
                disabled={currentIndex === pages.length - 1}
                className="p-1.5 bg-white border rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <button
            onClick={() =>
              setViewingDocument({ url: currentUrl, title: item.title })
            }
            className="block w-full text-center py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition"
          >
            Read Document
          </button>
        </div>
      );
    }

    return (
      <div className="mt-3 rounded-lg overflow-hidden bg-gray-100">
        <img
          src={contentUrl}
          alt={item.title}
          className="w-full h-auto max-h-[500px] object-contain"
        />
      </div>
    );
  };

  const renderPostText = (text: string, itemId: string, isExpanded: boolean) => {
    if (isExpanded || text.length <= 200) {
      return (
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
          {text}
        </p>
      );
    }

    const firstPart = text.substring(0, 200);

    return (
      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
        {firstPart}...
        <button
          onClick={() => setExpandedPostId(itemId)}
          className="text-orange-500 hover:underline font-medium"
        >
          Read more
        </button>
      </p>
    );
  };

  const renderPostComments = (item: any) => (
    <div className="px-4 pb-4 border-t border-gray-100 pt-3 bg-gray-50">
      <h4 className="text-xs font-semibold text-gray-500 mb-3">
        Comments ({comments[item.id]?.length || 0})
      </h4>

      {loadingComments[item.id] ? (
        <div className="flex items-center justify-center py-4">
          <Loader className="animate-spin text-gray-400" size={20} />
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments[item.id]?.slice(0, 5).map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg p-2.5">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {comment.userPhoto ? (
                    <img
                      src={comment.userPhoto}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] flex items-center justify-center h-full text-gray-500">
                      {comment.userName?.[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">
                      {comment.userName}
                    </span>
                    {comment.userId === item.creatorId && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Owner
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {comment.createdAt?.toDate?.()?.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{comment.text}</p>
                  <button
                    onClick={() =>
                      setReplyingTo((prev) => ({
                        ...prev,
                        [comment.id]: comment.id,
                      }))
                    }
                    className="text-[10px] text-blue-500 mt-1"
                  >
                    Reply
                  </button>

                  {replyingTo[comment.id] && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={replyText[comment.id] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({
                            ...prev,
                            [comment.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a reply..."
                        className="flex-1 text-xs px-2 py-1.5 border rounded-lg"
                      />
                      <button
                        onClick={() => handleAddReply(item.id, comment.id)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {(comment.replies || []).slice(0, 2).map((reply) => (
                    <div
                      key={reply.id}
                      className="mt-2 ml-3 pl-2 border-l-2 border-gray-200"
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {reply.userPhoto ? (
                            <img
                              src={reply.userPhoto}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] flex items-center justify-center h-full text-gray-500">
                              {reply.userName?.[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-[10px]">
                            {reply.userName}
                          </span>
                          {reply.userId === item.creatorId && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full ml-1">
                              Owner
                            </span>
                          )}
                          <p className="text-xs text-gray-600">{reply.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(comment.replies?.length || 0) > 2 && (
                    <button className="text-[10px] text-blue-500 mt-1">
                      View {(comment.replies?.length || 0) - 2} more replies
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!comments[item.id] || comments[item.id].length === 0) && (
            <p className="text-xs text-gray-400 text-center py-2">
              No comments yet
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={commentText[item.id] || ""}
          onChange={(e) =>
            setCommentText((prev) => ({ ...prev, [item.id]: e.target.value }))
          }
          placeholder="Write a comment..."
          className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && handleAddComment(item.id)}
        />
        <button
          onClick={() => handleAddComment(item.id)}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );

  if (auth.loading || loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back,{" "}
              {auth.profile?.displayName?.split(" ")[0] || "Supporter"}
            </h1>
            <p className="text-sm text-gray-500">
              {feed.length} posts from your feed
            </p>
          </div>
          <Link
            href={auth?.isCreator ? "/creator" : "/onboarding"}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center gap-2"
          >
            <Zap size={16} />
            {auth?.isCreator ? "Go to Creator" : "Become Creator"}
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: "All" },
            { key: "following", label: "Following" },
            { key: "public", label: "For You" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFeedFilter(filter.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                feedFilter === filter.key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="space-y-4">
              {filteredFeed.length > 0 ? (
                filteredFeed.map((item) => {
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        if (el) postRefs.current[item.id] = el;
                      }}
                      data-post-id={item.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/${item.creatorHandle}`}
                              className="shrink-0"
                            >
                              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
                                {item.creatorPhoto ? (
                                  <img
                                    src={item.creatorPhoto}
                                    alt={item.creatorName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                                    {item.creatorName?.[0] || "?"}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div>
                              <Link
                                href={`/${item.creatorHandle}`}
                                className="font-semibold text-gray-900 hover:text-blue-600"
                              >
                                {item.creatorName}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">
                                  @{item.creatorHandle}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${item.isFollowing ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
                                >
                                  {item.isFollowing ? "Following" : "Public"}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ·{" "}
                                  {item.createdAt
                                    ?.toDate?.()
                                    ?.toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">
                            {item.title}
                          </h3>
                          <div>
                            {renderPostText(
                              item.description || "",
                              item.id,
                              expandedPostId === item.id,
                            )}
                          </div>
                          {renderYouTubeEmbed(item.description || "")}
                        </div>

                        {item.contentUrl && expandedPostId !== item.id && (
                          <div className="mt-3 rounded-lg overflow-hidden bg-gray-100">
                            {item.type === "video" ? (
                              <video
                                src={item.contentUrl}
                                controls
                                controlsList="nodownload"
                                className="w-full aspect-video"
                              />
                            ) : item.type === "document" ? (
                              <div className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <FileText
                                      size={20}
                                      className="text-orange-600"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Document
                                    </p>
                                    <p className="text-xs text-gray-500">PDF</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setViewingDocument({
                                      url: item.contentUrl,
                                      title: item.title,
                                    })
                                  }
                                  className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
                                >
                                  Read Document
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() =>
                                  item.contentUrl &&
                                  setViewingImage({ url: item.contentUrl })
                                }
                                className="cursor-zoom-in"
                              >
                                <img
                                  src={item.contentUrl}
                                  alt={item?.title}
                                  className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {expandedPostId === item.id && (
                          <div className="mt-4">
                            {renderContentMedia(item)}

                            {item.docUrl && !Array.isArray(item.docUrl) && (
                              <Link
                                href={item.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 flex items-center gap-2 text-blue-600 text-sm hover:underline"
                              >
                                <Paperclip size={14} /> View Attached Document
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="px-4 pb-3 pt-2 flex items-center justify-between border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(item)}
                            className={`flex items-center gap-1.5 text-sm ${likedPosts.has(item.id) ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
                          >
                            <Heart
                              size={18}
                              className={
                                likedPosts.has(item.id) ? "fill-current" : ""
                              }
                            />
                            {item.likes || 0}
                          </button>
                          <button
                            onClick={() => toggleComments(item)}
                            className={`flex items-center gap-1.5 text-sm ${showCommentFor === item.id ? "text-blue-500" : "text-gray-500 hover:text-blue-500"}`}
                          >
                            <MessageCircle size={18} />
                            {commentCounts[item.id] || 0}
                          </button>
                          <span className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Eye size={16} /> {item.views || 0}
                          </span>
                        </div>
                        {item.type === "gathering" && (
                          <span className="text-xs text-orange-600 flex items-center gap-1">
                            <MapPin size={14} /> {item.location}
                          </span>
                        )}
                        {item.type === "content" &&
                          item.description &&
                          item.description.length > 200 && (
                            <button
                              onClick={() => setExpandedPostId(item.id)}
                              className="text-xs text-orange-500 hover:underline"
                            >
                              {expandedPostId === item.id
                                ? "Read less"
                                : "Read more"}
                            </button>
                          )}
                      </div>

                      {showCommentFor === item.id && renderPostComments(item)}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {feedFilter === "following"
                      ? "No posts from creators you follow"
                      : feedFilter === "public"
                        ? "No public posts available"
                        : "No posts in your feed yet"}
                  </p>
                  <button
                    onClick={() => router.push("/explore")}
                    className="mt-4 text-sm text-white bg-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    Explore Creators
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Your Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Supported</span>
                  <span className="font-semibold text-orange-600">
                    {(auth?.profile?.totalSupport || 0).toLocaleString()} RWF
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Following</span>
                  <span className="font-semibold text-gray-900">
                    {favorites.length} creators
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Purchases</span>
                  <span className="font-semibold text-gray-900">
                    {purchases.length} items
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Following
              </h3>
              <div className="space-y-2">
                {favorites.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/${c.handle}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                      {c.photoURL ? (
                        <img
                          src={c.photoURL}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm flex items-center justify-center h-full text-gray-400">
                          {c.name?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-gray-500">@{c.handle}</p>
                    </div>
                  </Link>
                ))}
                {favorites.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Not following anyone yet
                  </p>
                )}
              </div>
            </div>

            {purchases.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-emerald-500" />
                  Recent Purchases
                </h3>
                <div className="space-y-2">
                  {purchases.slice(0, 4).map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {purchase.productName || "Product"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          from @{purchase.creatorHandle}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-emerald-600">
                        {Number(purchase.totalAmount || 0).toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Discover Creators
              </h3>
              <div className="space-y-2">
                {creators.slice(0, 5).map((c) => (
                  <Link
                    key={c.handle}
                    href={`/${c.handle}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                      {c.photoURL ? (
                        <img
                          src={c.photoURL}
                          alt={c.handle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm flex items-center justify-center h-full text-gray-400">
                          {c.handle?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        @{c.handle}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.bio || "New Creator"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <button
                onClick={() => router.push("/explore")}
                className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900 text-center"
              >
                Explore more →
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-2">Start Creating</h3>
              <p className="text-sm text-white/80 mb-4">
                Share your content and grow your audience
              </p>
              <Link
                href={auth?.isCreator ? "/creator" : "/onboarding"}
                className="block w-full bg-white text-orange-600 text-center py-2 rounded-lg font-medium hover:bg-white/90 transition"
              >
                {auth?.isCreator ? "Go to Dashboard" : "Become Creator"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {viewingDocument && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <span className="font-medium truncate max-w-md">
                {viewingDocument.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* <Link
                href={viewingDocument.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} /> Download
              </Link> */}
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDocument.url)}&embedded=true`}
              className="w-full max-w-4xl h-full bg-white"
              title="PDF Viewer"
            />
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
            onClick={() => setViewingImage(null)}
          >
            <X size={28} />
          </button>
          <img
            src={viewingImage.url}
            alt="Full size"
            className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
}
