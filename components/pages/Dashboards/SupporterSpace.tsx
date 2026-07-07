/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Zap,
  Loader,
  User,
  MapPin,
  X,
  Eye,
  FileText,
  ShoppingBag,
  Package,
  Heart,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Clock,
  Home,
  Compass,
  Image,
  Video,
  File,
  Lock,
  Globe,
  ImageUp,
  Camera,
  Save,
  UploadCloud,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/parts/Navigation";
import MobileBottomBar from "@/components/parts/MobileBottomBar";
import { useAuth } from "@/auth/AuthContext";
import Loading from "@/app/loading";
import {
  collection,
  collectionGroup,
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
import { LinkifyText } from "@/components/ui/LinkifyText";
import { uploadFile } from "@/lib/uploadService";

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
  const viewedPosts = useRef<Set<string>>(new Set());
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string } | null>(
    null,
  );
  const postRefs = useRef<Record<string, HTMLDivElement>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPost, setNewPost] = useState({
    description: "",
    type: "text" as "text" | "image" | "video" | "document",
    isPrivate: false,
  });
  const [posting, setPosting] = useState(false);
  const [mediaType, setMediaType] = useState<
    "image" | "video" | "document" | null
  >(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.creator?.handle) return;
    const type = mediaType || "image";
    if (type === "image") {
      setFilePreview(URL.createObjectURL(file));
    }
    setIsUploading(true);
    setUploadedUrl("");
    setFailedFile(null);
    try {
      const assetType = type === "video" ? "post_video" : type === "document" ? "post_document" : "post_image";
      const data = await uploadFile(file, assetType, auth.creator.handle);
      if (data.url) {
        setUploadedUrl(data.url);
        setNewPost((prev) => ({ ...prev, type }));
        toast.success("File uploaded!");
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
      setFailedFile(file);
      setUploadedUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryUpload = async () => {
    if (!failedFile || !auth.creator?.handle) return;
    const type = mediaType || "image";
    setIsUploading(true);
    setUploadedUrl("");
    setFailedFile(null);
    try {
      const assetType = type === "video" ? "post_video" : type === "document" ? "post_document" : "post_image";
      const data = await uploadFile(failedFile, assetType, auth.creator.handle);
      if (data.url) {
        setUploadedUrl(data.url);
        setNewPost((prev) => ({ ...prev, type }));
        toast.success("File uploaded!");
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
      setFailedFile(failedFile);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (
      !auth.creator?.handle ||
      !auth.creator?.uid ||
      !newPost.description.trim()
    )
      return;
    setPosting(true);
    try {
      const contentData = {
        creatorId: auth.creator.handle,
        creatorUid: auth.creator.uid,
        description: newPost.description,
        type: newPost.type,
        contentUrl: uploadedUrl || null,
        isPrivate: newPost.isPrivate,
        createdAt: serverTimestamp(),
        views: 0,
      };
      const docRef = await addDoc(
        collection(db, "creatorContent"),
        contentData,
      );
      toast.success("Content published!");
      const newFeedItem = {
        id: docRef.id,
        ...contentData,
        createdAt: new Date(),
        creatorName: auth.creator?.name || "Creator",
        creatorHandle: auth.creator?.handle,
        creatorPhoto: auth.profile?.photoURL || null,
        creatorUid: auth.creator?.uid,
        isFollowing: true,
        isPublic: !newPost.isPrivate,
        likes: 0,
        commentCount: 0,
      };
      setFeed((prev) => [newFeedItem as any, ...prev]);
      setNewPost({
        description: "",
        type: "text",
        isPrivate: false,
      });
      setUploadedUrl("");
      setFilePreview(null);
      setMediaType(null);
      try {
        await sendCommsEmail("content_new", {
          creatorId: auth.creator.handle,
          creatorName: auth.creator?.name || "Creator",
          creatorHandle: auth.creator?.handle,
          contentTitle: newPost.description.slice(0, 80),
          contentDescription: newPost.description,
          contentType: newPost.isPrivate ? "private" : "public",
          contentId: docRef.id,
        });
      } catch {
        /* notify silently */
      }
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPosting(false);
    }
  };

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

        const supportedCreatorHandles = new Set(
          supportSnap.docs.map((d) => d.data().creatorId),
        );

        const purchasesQuery = query(
          collection(db, "storeOrders"),
          where("buyerId", "==", auth.user.uid),
        );

        const publicContentQ = query(
          collection(db, "creatorContent"),
          where("isPrivate", "==", false),
          orderBy("createdAt", "desc"),
        );

        const supportedIds = Array.from(supportedCreatorHandles).slice(0, 10);
        const privateContentQ =
          supportedIds.length > 0
            ? query(
                collection(db, "creatorContent"),
                where("isPrivate", "==", true),
                where("creatorId", "in", supportedIds),
                orderBy("createdAt", "desc"),
              )
            : null;

        const [publicSnap, gatheringSnap, creatorsSnap, purchasesSnap] =
          await Promise.all([
            getDocs(publicContentQ),
            getDocs(
              query(
                collection(db, "creatorGatherings"),
                orderBy("createdAt", "desc"),
              ),
            ),
            getDocs(collection(db, "creators")),
            getDocs(purchasesQuery),
          ]);

        let allContentDocs = [...publicSnap.docs];

        // Private content fetch — decoupled so a permission failure doesn't crash the page
        if (privateContentQ) {
          try {
            const privateSnap = await getDocs(privateContentQ);
            allContentDocs.push(...privateSnap.docs);
          } catch (privateErr) {
            console.warn(
              "Private content query failed (non-critical):",
              privateErr,
            );
          }
        }

        let profileMap = new Map();
        const supportedCreatorUids = new Set<string>();
        const supportedHandles = new Set<string>();
        const creatorMap = new Map();
        creatorsSnap.docs.forEach((d) => {
          const data = d.data();
          creatorMap.set(d.id, {
            name: data.name,
            handle: d.id,
            uid: data.uid,
            photoURL: data.profilePicture || null,
          });
          if (supportedCreatorHandles.has(d.id)) {
            supportedHandles.add(d.id);
            if (data.uid) supportedCreatorUids.add(data.uid);
          }
        });

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

        const contents = allContentDocs
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
            commentCount: item.commentCount || 0,
          };
        });

        const favoritesData = creatorsSnap.docs
          .filter((d) => supportedCreatorHandles.has(d.id))
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
          .filter((c: any) => !supportedCreatorHandles.has(c.handle));
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

    const likedRef = collectionGroup(db, "likes");
    const likedQuery = query(likedRef, where("userId", "==", auth.user.uid));
    const unsubscribe = onSnapshot(likedQuery, (snap) => {
      const liked = new Set<string>();
      const docIds: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const postId = d.data().postId || d.ref.parent.parent?.id;
        if (postId) {
          liked.add(postId);
          docIds[postId] = d.id;
        }
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
          if (
            postId &&
            entry.isIntersecting &&
            !viewedPosts.current.has(postId)
          ) {
            viewedPosts.current.add(postId);

            const item = feed.find(
              (f) => f.id === postId && f.type !== "gathering",
            );
            if (item) {
              updateDoc(doc(db, "creatorContent", postId), {
                views: increment(1),
              }).catch(() => {});
              setFeed((prev) =>
                prev.map((f) =>
                  f.id === postId ? { ...f, views: (f.views || 0) + 1 } : f,
                ),
              );
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
  }, [feed]);

  const fetchComments = async (postId: string) => {
    if (comments[postId] && comments[postId].length > 0) return;
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const q = query(
        collection(db, "creatorContent", postId, "comments"),
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
      await addDoc(collection(db, "creatorContent", postId, "comments"), {
        postId,
        text: commentText[postId],
        userId: auth.user.uid,
        userName: auth.profile?.displayName || "Anonymous",
        userPhoto: auth.profile?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      setFeed((prev) =>
        prev.map((f) =>
          f.id === postId
            ? { ...f, commentCount: (f.commentCount || 0) + 1 }
            : f,
        ),
      );
      fetchComments(postId);
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
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
      await addDoc(
        collection(db, "creatorContent", postId, "comments"),
        newReply,
      );
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [parentId]: null }));
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[postId];
        return newComments;
      });
      fetchComments(postId);
      setFeed((prev) =>
        prev.map((f) =>
          f.id === postId
            ? { ...f, commentCount: (f.commentCount || 0) + 1 }
            : f,
        ),
      );
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
          await deleteDoc(
            doc(db, "creatorContent", item.id, "likes", likeDocId),
          );
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
      const docRef = await addDoc(
        collection(db, "creatorContent", item.id, "likes"),
        {
          postId: item.id,
          userId: auth.user.uid,
          createdAt: serverTimestamp(),
        },
      );
      setLikedDocIds((prev) => ({ ...prev, [item.id]: docRef.id }));
      await updateDoc(doc(db, "creatorContent", item.id), {
        "stats.likes": increment(1),
      });
    } catch (e) {
      console.error("Like error", e);
    }
  };

  const handleCardClick = (item: any, e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(
        "button, a, input, textarea, video, iframe",
      )
    )
      return;
    const text = item.description || "";
    if (text.length > 200 && expandedPostId !== item.id) {
      setExpandedPostId(item.id);
      setDocumentIndex((prev) => ({ ...prev, [item.id]: 0 }));
    } else {
      router.push(`/supporter/${item.id}`);
    }
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
  const contentItems = filteredFeed.filter((item) => item.type !== "gathering");
  const gatheringItems = filteredFeed
    .filter((item) => item.type === "gathering")
    .filter((item) => {
      if (!item.date) return true;
      const eventDate = new Date(
        item.date.seconds ? item.date.seconds * 1000 : item.date,
      );
      const now = new Date();
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );
      return eventDate.getTime() >= endOfToday.getTime();
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
        <div className="relative aspect-video bg-foreground rounded-lg overflow-hidden mt-3">
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
        <div className="mt-3 bg-muted rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Document</p>
              <p className="text-xs text-muted-foreground">
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
                className="p-1.5 bg-card border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-muted-foreground">
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
                className="p-1.5 bg-card border rounded-lg disabled:opacity-50"
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
      <div className="mt-3 rounded-lg overflow-hidden bg-muted">
        <img
          src={contentUrl}
          alt={item.title}
          className="w-full h-auto max-h-[500px] object-contain"
        />
      </div>
    );
  };

  const renderPostText = (
    text: string,
    itemId: string,
    isExpanded: boolean,
  ) => {
    if (isExpanded || text.length <= 200) {
      return (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          <LinkifyText text={text} />
        </p>
      );
    }

    const firstPart = text.substring(0, 200);

    return (
      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        <LinkifyText text={firstPart} />
        <span>...</span>
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
    <div
      onClick={(e) => e.stopPropagation()}
      className="px-4 pb-4 border-t border-border pt-3 bg-muted"
    >
      <h4 className="text-xs font-semibold text-muted-foreground mb-3">
        Comments ({comments[item.id]?.length || 0})
      </h4>

      {loadingComments[item.id] ? (
        <div className="flex items-center justify-center py-4">
          <Loader className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {comments[item.id]?.slice(0, 5).map((comment) => (
            <div key={comment.id} className="bg-card rounded-lg p-2.5">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {comment.userPhoto ? (
                    <img
                      src={comment.userPhoto}
                      alt={comment.userName || "Commenter"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] flex items-center justify-center h-full text-muted-foreground">
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
                    <span className="text-[10px] text-muted-foreground">
                      {comment.createdAt?.toDate?.()?.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    <LinkifyText text={comment.text} />
                  </p>
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
                      className="mt-2 ml-3 pl-2 border-l-2 border-border"
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {reply.userPhoto ? (
                            <img
                              src={reply.userPhoto}
                              alt={reply.userName || "Commenter"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] flex items-center justify-center h-full text-muted-foreground">
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
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            <LinkifyText text={reply.text} />
                          </p>
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
            <p className="text-xs text-muted-foreground text-center py-2">
              No comments yet
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          value={commentText[item.id] || ""}
          onChange={(e) =>
            setCommentText((prev) => ({ ...prev, [item.id]: e.target.value }))
          }
          placeholder="Write a comment..."
          className="flex-1 text-xs px-3 py-2 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    <div className="min-h-screen bg-muted">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back,{" "}
              {auth.profile?.displayName?.split(" ")[0] || "Supporter"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {contentItems.length} posts in your feed
            </p>
          </div>
          <Link
            href={auth?.isCreator ? "/creator" : "/onboarding"}
            className="hidden lg:flex bg-orange-600 text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-orange-700 transition items-center gap-2 shadow-lg shadow-orange-200"
          >
            {auth?.isCreator ? "Creator Dashboard" : "Become Creator"}
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
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {auth.isCreator && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                {auth.profile?.displayName?.[0] || auth.user?.email?.[0] || "C"}
              </div>
              <div className="flex-1 min-w-0">
                <textarea
                  value={newPost.description}
                  onChange={(e) =>
                    setNewPost((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What's on your mind?"
                  rows={newPost.description ? 3 : 1}
                  className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground/50"
                />
                {(isUploading || filePreview || uploadedUrl || failedFile) && (
                  <div className="mb-2">
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                        <Loader size={14} className="animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : failedFile ? (
                      <div className="relative">
                        {newPost.type === "image" ? (
                          <img src={filePreview!} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-red-300" />
                        ) : newPost.type === "video" ? (
                          <video src={filePreview!} controls className="w-full max-h-48 rounded-lg border border-red-300" />
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                            <File size={14} />
                            <span>Upload failed</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <button onClick={handleRetryUpload} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition">
                            Retry
                          </button>
                          <button onClick={() => { setFailedFile(null); setFilePreview(null); setUploadedUrl(""); setNewPost((prev) => ({ ...prev, type: "text" })); }} className="p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ) : filePreview && !uploadedUrl ? (
                      <div className="relative">
                        {newPost.type === "image" ? (
                          <img src={filePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                        ) : newPost.type === "video" ? (
                          <video src={filePreview} controls className="w-full max-h-48 rounded-lg border border-border" />
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                            <File size={14} />
                            <span>Preparing file...</span>
                          </div>
                        )}
                      </div>
                    ) : uploadedUrl && (
                      <div className="relative">
                        {newPost.type === "image" ? (
                          <img src={uploadedUrl} alt="Uploaded" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                        ) : newPost.type === "video" ? (
                          <video src={uploadedUrl} controls className="w-full max-h-48 rounded-lg border border-border" />
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                            <FileText size={14} />
                            <span className="font-medium">File attached</span>
                          </div>
                        )}
                        <button onClick={() => { setUploadedUrl(""); setFilePreview(null); setFailedFile(null); setNewPost((prev) => ({ ...prev, type: "text" })); }} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMediaType("image");
                    if (fileInputRef.current) fileInputRef.current.accept = "image/*";
                    fileInputRef.current?.click();
                  }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-green-600 transition"
                  title="Add Image"
                >
                  <Image size={16} />
                </button>
                <button
                  onClick={() => {
                    setMediaType("video");
                    if (fileInputRef.current) fileInputRef.current.accept = "video/*";
                    fileInputRef.current?.click();
                  }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-600 transition"
                  title="Add Video"
                >
                  <Video size={16} />
                </button>
                <button
                  onClick={() => {
                    setMediaType("document");
                    if (fileInputRef.current) fileInputRef.current.accept = ".pdf,.doc,.docx";
                    fileInputRef.current?.click();
                  }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-orange-600 transition"
                  title="Add Document"
                >
                  <File size={16} />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  onClick={() =>
                    setNewPost((prev) => ({
                      ...prev,
                      isPrivate: !prev.isPrivate,
                    }))
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${newPost.isPrivate ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}
                >
                  {newPost.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  {newPost.isPrivate ? "Supporters" : "Public"}
                </button>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!newPost.description.trim() || posting}
                className="bg-foreground text-background px-5 py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition disabled:opacity-40 flex items-center gap-2"
              >
                {posting ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        )}

        {gatheringItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin size={16} className="text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Upcoming Events
              </h2>
              <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border">
                {gatheringItems.length} event
                {gatheringItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gatheringItems.map((item) => {
                const eventDate = item.date
                  ? new Date(
                      item.date.seconds ? item.date.seconds * 1000 : item.date,
                    )
                  : null;
                return (
                  <Link
                    key={item.id}
                    href={`/${item.creatorHandle}/gatherings/${item.id}`}
                    className="block bg-card rounded-xl border border-orange-200 overflow-hidden hover:shadow-md hover:border-orange-300 transition-all group"
                  >
                    <div className="flex">
                      <div className="w-20 bg-orange-500 flex flex-col items-center justify-center text-white p-3 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {eventDate
                            ? eventDate.toLocaleString("default", {
                                month: "short",
                              })
                            : "N/A"}
                        </span>
                        <span className="text-2xl font-bold">
                          {eventDate ? eventDate.getDate() : "?"}
                        </span>
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            Event
                          </span>
                          {item.ticketPrice > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              {Number(item.ticketPrice).toLocaleString()} RWF
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground group-hover:text-orange-600 transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {item.time || "All day"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} /> {item.attendeesCount || 0}{" "}
                            attending
                          </span>
                        </div>
                        {item.location && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {item.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="space-y-4">
              {contentItems.length > 0 ? (
                contentItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        if (el) postRefs.current[item.id] = el;
                      }}
                      data-post-id={item.id}
                      onClick={(e) => handleCardClick(item, e)}
                      className="bg-card rounded-lg shadow-sm border border-border overflow-hidden cursor-pointer"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/${item.creatorHandle}`}
                              className="shrink-0"
                            >
                              <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                                {item.creatorPhoto ? (
                                  <img
                                    src={item.creatorPhoto}
                                    alt={item.creatorName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-medium">
                                    {item.creatorName?.[0] || "?"}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div>
                              <Link
                                href={`/${item.creatorHandle}`}
                                className="font-semibold text-foreground hover:text-blue-600"
                              >
                                {item.creatorName}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  @{item.creatorHandle}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${item.isFollowing ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
                                >
                                  {item.isFollowing ? "Following" : "Public"}
                                </span>
                                <span className="text-xs text-muted-foreground">
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
                          {item.title && (
                          <h3 className="font-semibold text-lg text-foreground mb-2">
                            {item.title}
                          </h3>
                        )}
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
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 rounded-lg overflow-hidden bg-muted"
                          >
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
                                    <p className="text-sm font-medium text-foreground">
                                      Document
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      PDF
                                    </p>
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
                                  alt={item?.title || "Post image"}
                                  className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {expandedPostId === item.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4"
                          >
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

                      <div className="px-4 pb-3 pt-2 flex items-center justify-between border-t border-border">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(item);
                            }}
                            className={`flex items-center gap-1.5 text-sm ${likedPosts.has(item.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComments(item);
                            }}
                            className={`flex items-center gap-1.5 text-sm ${showCommentFor === item.id ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"}`}
                          >
                            <MessageCircle size={18} />
                            {item.commentCount || 0}
                          </button>
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Eye size={16} /> {item.views || 0}
                          </span>
                        </div>
                        {item.type === "gathering" && (
                          <span className="text-xs text-orange-600 flex items-center gap-1">
                            <MapPin size={14} /> {item.location}
                          </span>
                        )}
                        {item.type === "content" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/supporter/${item.id}`);
                            }}
                            className="text-xs text-orange-500 hover:underline font-medium"
                          >
                            View Post
                          </button>
                        )}
                      </div>

                      {showCommentFor === item.id && renderPostComments(item)}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-card rounded-lg border border-border">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-muted-foreground" size={24} />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {feedFilter === "following"
                      ? "No posts from creators you follow"
                      : feedFilter === "public"
                        ? "No public posts available"
                        : "No posts in your feed yet"}
                  </p>
                  <button
                    onClick={() => router.push("/explore")}
                    className="mt-4 text-sm text-background bg-foreground px-4 py-2 rounded-lg hover:bg-foreground/90 transition"
                  >
                    Explore Creators
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {auth.isCreator && (
                <Link
                  href="/creator"
                  className="hidden lg:flex bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white items-center gap-3 hover:from-orange-600 hover:to-orange-700 transition shadow-lg"
                >
                  <div className="flex-1">
                    <p className="font-bold text-sm">Creator Dashboard</p>
                    <p className="text-xs text-white/80">
                      Manage your community
                    </p>
                  </div>
                </Link>
              )}
              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  Your Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Supported
                    </span>
                    <span className="font-semibold text-orange-600">
                      {(auth?.profile?.totalSupport || 0).toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Following
                    </span>
                    <span className="font-semibold text-foreground">
                      {favorites.length} creators
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Purchases
                    </span>
                    <span className="font-semibold text-foreground">
                      {purchases.length} items
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  Following
                </h3>
                <div className="space-y-2">
                  {favorites.slice(0, 6).map((c) => (
                    <Link
                      key={c.id}
                      href={`/${c.handle}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                        {c.photoURL ? (
                          <img
                            src={c.photoURL}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm flex items-center justify-center h-full text-muted-foreground">
                            {c.name?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{c.handle}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {favorites.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Not following anyone yet
                    </p>
                  )}
                </div>
              </div>

              {purchases.length > 0 && (
                <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ShoppingBag size={18} className="text-emerald-500" />
                    Recent Purchases
                  </h3>
                  <div className="space-y-2">
                    {purchases.slice(0, 4).map((purchase) => (
                      <div
                        key={purchase.id}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted"
                      >
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <Package
                            size={14}
                            className="text-muted-foreground"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {purchase.productName || "Product"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            from @{purchase.creatorHandle}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-emerald-600">
                          {Number(purchase.totalAmount || 0).toLocaleString()}{" "}
                          {purchase.currency || "RWF"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  Discover Creators
                </h3>
                <div className="space-y-2">
                  {creators.slice(0, 5).map((c) => (
                    <Link
                      key={c.handle}
                      href={`/${c.handle}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                        {c.photoURL ? (
                          <img
                            src={c.photoURL}
                            alt={c.handle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm flex items-center justify-center h-full text-muted-foreground">
                            {c.handle?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          @{c.handle}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.bio || "New Creator"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <button
                  onClick={() => router.push("/explore")}
                  className="w-full bg-orange-600 text-white hover:bg-orange-700 py-2 rounded-lg mt-4 text-sm font-medium text-center"
                >
                  Explore more
                </button>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                <h3 className="font-semibold mb-2">Start Creating</h3>
                <p className="text-sm text-white/80 mb-4">
                  Share your content and grow your audience
                </p>
                <Link
                  href={auth?.isCreator ? "/creator" : "/onboarding"}
                  className="block w-full bg-card text-orange-600 text-center py-2 rounded-lg font-medium hover:bg-card/90 transition"
                >
                  {auth?.isCreator ? "Go to Dashboard" : "Become Creator"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomBar />

      {viewingDocument && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 bg-foreground text-background">
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
              className="w-full max-w-4xl h-full bg-card"
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
