/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Plus,
  Video,
  Image as ImageIcon,
  FileText,
  Lock,
  Globe,
  Search,
  Trash2,
  ArrowLeft,
  X,
  Loader,
  Inbox,
  UploadCloud,
  Eye,
  Edit3,
  MessageCircle,
  Send,
  Heart,
  Menu,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { db, auth } from "@/db/firebase";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteCreatorPost,
  subscribeToCreatorContent,
} from "@/lib/contentManagerService";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LinkifyText } from "@/components/ui/LinkifyText";
import RichContentRenderer from "@/components/ui/RichContentRenderer";
import {
  uploadFile,
  storedAssetValue,
  storedAssetVisibility,
  type AssetVisibility,
} from "@/lib/uploadService";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import { usePostMediaSrc } from "@/lib/usePostMediaSrc";

import { AudienceSelector } from "@/components/parts/dashboard/AudienceSelector";
import {
  formatVisibilityLabel,
  resolvePostVisibility,
  type PostVisibility,
} from "@/lib/contentAccess";

interface Comment {
  id: string;
  content?: string;
  text?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: any;
  parentId?: string;
  replies?: Comment[];
}

export default function ContentManager() {
  const { creator, profile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedVisibility, setUploadedVisibility] = useState<AssetVisibility | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const { mediaSrc } = usePostMediaSrc(selectedPost?.id, !!selectedPost?.isPrivate);
  const selectedDocumentUrl = Array.isArray(selectedPost?.contentUrl)
    ? selectedPost.contentUrl[0]
    : selectedPost?.contentUrl;
  const selectedDocumentSrc = mediaSrc(selectedDocumentUrl);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [loadingComments, setLoadingComments] = useState(false);

  const [newPost, setNewPost] = useState<{
    title: string;
    description: string;
    type: string;
    visibility: PostVisibility;
    requiredTierIds: string[];
    requiredTierNames: string[];
  }>({
    title: "",
    description: "",
    type: "text",
    visibility: "supporters",
    requiredTierIds: [],
    requiredTierNames: [],
  });

  useEffect(() => {
    if (!creator?.handle) return;
    const unsubscribe = subscribeToCreatorContent(creator.handle, (items) => {
      setPosts(items as any[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [creator?.handle]);

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const q = query(
        collection(db, "creatorContent", postId, "comments"),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const commentList = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[];

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
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const trimmed = commentText[postId]?.trim();
    if (!trimmed) return;
    const displayName = profile?.displayName || creator?.name || "Creator";
    try {
      const newComment = {
        content: trimmed,
        userId: auth.currentUser?.uid || creator?.uid || "",
        userName: displayName,
        userPhoto: profile?.photoURL || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "creatorContent", postId, "comments"), newComment);
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleAddReply = async (postId: string, parentId: string) => {
    const trimmed = replyText[parentId]?.trim();
    if (!trimmed) return;
    const displayName = profile?.displayName || creator?.name || "Creator";
    try {
      const newReply = {
        parentId,
        content: trimmed,
        userId: auth.currentUser?.uid || creator?.uid || "",
        userName: displayName,
        userPhoto: profile?.photoURL || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "creatorContent", postId, "comments"), newReply);
      await updateDoc(doc(db, "creatorContent", postId), {
        commentCount: increment(1),
      });
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [parentId]: null }));
      fetchComments(postId);
    } catch {
      toast.error("Failed to add reply");
    }
  };

  const handleSelectPost = (post: any) => {
    setSelectedPost(post);
    setShowSidebar(false);
    setComments({});
    fetchComments(post.id);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    }

    setIsUploading(true);
    setUploadedUrl("");

    try {
      const assetType =
        newPost.type === "video"
          ? "post_video"
          : newPost.type === "document"
            ? "post_document"
            : "post_image";
      const data = await uploadFile(
        file,
        assetType,
        creator?.handle || "",
        undefined,
        newPost.visibility !== "public" ? "private" : "public",
      );
      const stored = storedAssetValue(data);
      if (stored) {
        setUploadedUrl(stored);
        setUploadedVisibility(data.visibility);
        toast.success("File uploaded successfully!");
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload file");
      setFilePreview(null);
      setUploadedUrl("");
      setUploadedVisibility(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddContent = async () => {
    const user = auth.currentUser;
    if (!user || !newPost.title || !creator?.handle) return;
    const isGated = newPost.visibility !== "public";
    if (newPost.visibility === "tier" && newPost.requiredTierIds.length === 0) {
      toast.error("Select at least one membership tier.");
      return;
    }
    if (isGated && uploadedUrl && uploadedVisibility !== "private") {
      toast.error("Re-upload the file so it is stored privately for gated access.");
      return;
    }
    if (!isGated && uploadedVisibility === "private") {
      toast.error("Re-upload the file now that the post is public.");
      return;
    }

    setIsUploading(true);
    try {
      const sharedFields = {
        title: newPost.title,
        description: newPost.description,
        type: newPost.type,
        contentUrl: uploadedUrl || null,
        isPrivate: isGated,
        visibility: newPost.visibility,
        requiredTierIds:
          newPost.visibility === "tier" ? newPost.requiredTierIds : [],
        requiredTierNames:
          newPost.visibility === "tier" ? newPost.requiredTierNames : [],
        updatedAt: serverTimestamp(),
      };

      if (editingPost) {
        await updateDoc(doc(db, "creatorContent", editingPost.id), sharedFields);
        setSelectedPost((prev: any) =>
          prev?.id === editingPost.id ? { ...prev, ...sharedFields } : prev,
        );
        toast.success("Post updated!");
      } else {
        const docRef = await addDoc(collection(db, "creatorContent"), {
          ...sharedFields,
          creatorId: creator.handle,
          creatorUid: creator.uid,
          createdAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
          views: 0,
        });
        toast.success("Content published!");

        try {
          const response = await sendCommsEmail("content_new", {
            creatorId: creator.handle,
            creatorName: creator?.name || "Creator",
            creatorHandle: creator?.handle,
            contentTitle: newPost.title,
            contentDescription: newPost.description,
            contentType: isGated ? "private" : "public",
            contentId: docRef.id,
          });
          if (response.success && response.recipientCount > 0) {
            toast.success(
              `Notified ${response.recipientCount} supporter(s) about your new content!`,
            );
          }
        } catch (notifyError) {
          console.error("Failed to notify supporters:", notifyError);
        }
      }

      setEditingPost(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to save post.");
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (post: any) => {
    if (post.type === "article") {
      router.push(`/creator/content/articles/${post.id}`);
      return;
    }
    setEditingPost(post);
    setNewPost({
      title: post.title || "",
      description: post.description || "",
      type: post.type || "text",
      visibility: resolvePostVisibility(post),
      requiredTierIds: Array.isArray(post.requiredTierIds)
        ? post.requiredTierIds
        : [],
      requiredTierNames: Array.isArray(post.requiredTierNames)
        ? post.requiredTierNames
        : [],
    });
    setUploadedUrl(post.contentUrl || "");
    setUploadedVisibility(storedAssetVisibility(post.contentUrl || ""));
  };

  const resetForm = () => {
    setNewPost({
      title: "",
      description: "",
      type: "text",
      visibility: "supporters",
      requiredTierIds: [],
      requiredTierNames: [],
    });
    setFilePreview(null);
    setUploadedUrl("");
    setUploadedVisibility(null);
  };

  const deletePost = async () => {
    if (!deletePostId) return;
    setDeleting(true);
    try {
      await deleteCreatorPost(deletePostId);
      toast.success("Post deleted successfully");
      setDeletePostId(null);
      if (selectedPost?.id === deletePostId) {
        setSelectedPost(null);
      }
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setDeleting(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Videos" && post.type === "video") ||
      (activeTab === "Images" && post.type === "image") ||
      (activeTab === "Documents" && post.type === "document") ||
      (activeTab === "Articles" && post.type === "article");
    const matchesSearch =
      (post.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-muted flex flex-col lg:flex-row">
      <aside
        className={`${showSidebar ? "flex" : "hidden"} lg:flex w-full lg:w-72 bg-card border-r border-border p-4 flex-col fixed lg:relative inset-0 z-50 lg:z-auto`}
      >
        <div className="flex items-center justify-between lg:hidden mb-4">
          <h2 className="text-lg font-bold text-foreground">Your Content</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2">
            <X size={24} />
          </button>
        </div>

        <button
          onClick={() => window.history.back()}
          className="hidden lg:flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h2 className="text-lg font-bold text-foreground mb-4 hidden lg:block">
          Your Content
        </h2>

        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {["All", "Videos", "Images", "Documents", "Articles"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${activeTab === tab ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => handleSelectPost(post)}
                className={`p-3 rounded-lg cursor-pointer transition border ${
                  selectedPost?.id === post.id
                    ? "bg-orange-50 border-orange-300"
                    : "bg-card border-border hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    {post.type === "video" ? (
                      <Video size={16} className="text-muted-foreground" />
                    ) : post.type === "image" ? (
                      <ImageIcon size={16} className="text-muted-foreground" />
                    ) : post.type === "article" ? (
                      <BookOpen size={16} className="text-muted-foreground" />
                    ) : (
                      <FileText size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {post.title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {resolvePostVisibility(post) !== "public" ? (
                        <Lock size={10} />
                      ) : (
                        <Globe size={10} />
                      )}
                      <span className="truncate">
                        {formatVisibilityLabel(
                          resolvePostVisibility(post),
                          post.requiredTierNames,
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No content yet
            </p>
          )}
        </div>

        <Link
          href="/creator/content/new"
          onClick={() => setShowSidebar(false)}
          className="mt-4 w-full bg-orange-500 text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition"
        >
          <Plus size={18} /> New Post
        </Link>

        <Link
          href="/creator/content/articles/new"
          onClick={() => setShowSidebar(false)}
          className="mt-2 w-full bg-foreground text-background py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition"
        >
          <BookOpen size={18} /> New Article
        </Link>
      </aside>

      <div className="flex-1 p-4 lg:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 bg-muted rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground">
                Content Manager
              </h1>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1 hidden lg:block">
                Manage your posts and see comments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/creator/content/articles"
              className="bg-foreground text-background px-3 lg:px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-orange-600 hover:text-white transition"
            >
              <BookOpen size={18} /> <span className="hidden sm:inline">Articles</span>
            </Link>
            <Link
              href="/creator/content/new"
              className="bg-orange-500 text-white px-3 lg:px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-orange-600 transition"
            >
              <Plus size={18} /> <span className="hidden sm:inline">New Post</span>
            </Link>
          </div>
        </div>

        {selectedPost ? (
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl font-bold text-foreground truncate">
                  {selectedPost.title}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground lg:gap-2 lg:text-sm">
                  {resolvePostVisibility(selectedPost) !== "public" ? (
                    <Lock size={14} className="text-amber-500" />
                  ) : (
                    <Globe size={14} className="text-green-500" />
                  )}
                  <span>
                    {formatVisibilityLabel(
                      resolvePostVisibility(selectedPost),
                      selectedPost.requiredTierNames,
                    )}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="tabular-nums">{selectedPost.views || 0} views</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="tabular-nums">
                    {selectedPost.likes || selectedPost.stats?.likes || 0} likes
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedPost.status !== "draft" && (
                  <Link
                    href={
                      selectedPost.type === "article" && selectedPost.slug
                        ? `/articles/${selectedPost.slug}`
                        : `/${creator?.handle}/community/${selectedPost.id}`
                    }
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition"
                  >
                    <ExternalLink size={14} />
                    View live
                  </Link>
                )}
                <button
                  onClick={() => startEdit(selectedPost)}
                  className="p-2 bg-muted rounded-lg hover:bg-muted transition"
                  aria-label="Edit post"
                >
                  <Edit3 size={18} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => setDeletePostId(selectedPost.id)}
                  className="p-2 bg-muted rounded-lg hover:bg-red-50 transition"
                  aria-label="Delete post"
                >
                  <Trash2
                    size={18}
                    className="text-muted-foreground hover:text-red-500"
                  />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-card rounded-lg border border-border">
              {selectedPost.type === "image" && selectedPost.contentUrl && (
                <div className="aspect-video bg-muted">
                  <MediaAsset
                    postId={selectedPost.id}
                    isPrivate={!!selectedPost.isPrivate}
                    url={selectedPost.contentUrl}
                    alt={selectedPost.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              {selectedPost.type === "video" && selectedPost.contentUrl && (
                <div className="aspect-video bg-black">
                  <MediaAsset
                    postId={selectedPost.id}
                    isPrivate={!!selectedPost.isPrivate}
                    url={selectedPost.contentUrl}
                    as="video"
                    controls
                    className="w-full h-full"
                  />
                </div>
              )}
              {selectedPost.type === "article" &&
                (selectedPost.coverUrl || selectedPost.contentUrl) && (
                  <div className="aspect-video bg-muted">
                    <MediaAsset
                      postId={selectedPost.id}
                      isPrivate={!!selectedPost.isPrivate}
                      url={selectedPost.coverUrl || selectedPost.contentUrl}
                      alt={selectedPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

              <div className="p-4 lg:p-6">
                {selectedPost.type === "article" ? (
                  <RichContentRenderer
                    html={selectedPost.htmlContent || ""}
                    className="text-sm lg:text-base"
                  />
                ) : (
                  <div className="prose max-w-none text-foreground whitespace-pre-wrap text-sm lg:text-base">
                    <LinkifyText text={selectedPost.description} />
                  </div>
                )}

                {selectedPost.type === "document" && selectedDocumentSrc && (
                  <a
                    href={selectedDocumentSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-3 p-4 bg-muted rounded-lg border border-border hover:bg-muted transition"
                  >
                    <FileText size={24} className="text-orange-500" />
                    <span className="text-sm font-medium">View Document</span>
                  </a>
                )}
              </div>

              <div className="border-t border-border p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm lg:text-base">
                  <MessageCircle size={18} /> Comments (
                  {comments[selectedPost.id]?.length || 0})
                </h3>

                <div className="space-y-3 max-h-[250px] lg:max-h-[300px] overflow-y-auto mb-4">
                  {comments[selectedPost.id]?.map((comment) => (
                    <div key={comment.id} className="bg-muted rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {comment.userPhoto ? (
                            <img
                              src={comment.userPhoto}
                              alt={comment.userName || "Commenter"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs flex items-center justify-center h-full text-muted-foreground">
                              {comment.userName?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {comment.userName}
                            </span>
                            {comment.userId === creator?.uid && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                Owner
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt?.toDate?.()?.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            <LinkifyText text={comment.content || comment.text || ""} />
                          </p>
                          <button
                            onClick={() =>
                              setReplyingTo((prev) => ({
                                ...prev,
                                [comment.id]: comment.id,
                              }))
                            }
                            className="text-xs text-blue-500 mt-1"
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
                                className="flex-1 text-sm px-3 py-2 border rounded-lg"
                              />
                              <button
                                onClick={() =>
                                  handleAddReply(selectedPost.id, comment.id)
                                }
                                className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm"
                              >
                                Send
                              </button>
                            </div>
                          )}

                          {(comment.replies || []).map((reply) => (
                            <div
                              key={reply.id}
                              className="mt-2 ml-4 pl-3 border-l-2 border-border"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                  {reply.userPhoto ? (
                                    <img
                                      src={reply.userPhoto}
                                      alt={reply.userName || "Commenter"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] flex items-center justify-center h-full text-muted-foreground">
                                      {reply.userName?.[0]}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-medium text-xs">
                                    {reply.userName}
                                  </span>
                                  {reply.userId === creator?.uid && (
                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full ml-1">
                                      Owner
                                    </span>
                                  )}
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    <LinkifyText text={reply.content || reply.text || ""} />
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!comments[selectedPost.id] ||
                    comments[selectedPost.id].length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={commentText[selectedPost.id] || ""}
                    onChange={(e) =>
                      setCommentText((prev) => ({
                        ...prev,
                        [selectedPost.id]: e.target.value,
                      }))
                    }
                    placeholder="Write a comment..."
                    className="flex-1 text-sm px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddComment(selectedPost.id)
                    }
                  />
                  <button
                    onClick={() => handleAddComment(selectedPost.id)}
                    className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="text-muted-foreground" size={24} />
              </div>
              <p className="text-muted-foreground text-sm lg:text-base">
                Select content to preview
              </p>
            </div>
          </div>
        )}
      </div>

      {editingPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-lg p-4 lg:p-6 shadow-xl my-8">
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-xl font-bold">Edit Post</h2>
              <button
                onClick={() => {
                  setEditingPost(null);
                  resetForm();
                }}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Post Title"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="w-full text-sm lg:text-lg font-medium px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              <textarea
                placeholder="Write your content..."
                value={newPost.description}
                onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                className="w-full h-32 px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Who can see this post?
                </label>
                <AudienceSelector
                  visibility={newPost.visibility}
                  requiredTierIds={newPost.requiredTierIds}
                  tiers={creator?.communityTiers || []}
                  onChange={(next) =>
                    setNewPost((prev) => ({
                      ...prev,
                      visibility: next.visibility,
                      requiredTierIds: next.requiredTierIds,
                      requiredTierNames: next.requiredTierNames,
                    }))
                  }
                />
              </div>

              <button
                onClick={handleAddContent}
                disabled={!newPost.title || isUploading}
                className="w-full bg-foreground text-background py-3 rounded-lg font-medium hover:bg-orange-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deletePostId !== null}
        onClose={() => setDeletePostId(null)}
        onConfirm={deletePost}
        title="Delete Post?"
        message="This will permanently delete this post."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
