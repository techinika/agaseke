/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { db, auth } from "@/db/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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

export default function ContentManager() {
  const { creator, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [loadingComments, setLoadingComments] = useState(false);

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    type: "text",
    isPrivate: true,
  });

  useEffect(() => {
    if (!creator?.handle) return;

    const q = query(
      collection(db, "creatorContent"),
      where("creatorId", "==", creator.handle),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contentData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(contentData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [creator?.handle]);

  const fetchComments = async (postId: string) => {
    try {
      const q = query(collection(db, "postComments"), where("postId", "==", postId), orderBy("createdAt", "desc"));
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
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText[postId]?.trim() || !profile?.displayName) return;
    try {
      const newComment = {
        postId,
        text: commentText[postId],
        userId: creator?.uid || auth.currentUser?.uid || "",
        userName: profile.displayName,
        userPhoto: profile.photoURL || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "postComments"), newComment);
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      fetchComments(postId);
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };

  const handleAddReply = async (postId: string, parentId: string) => {
    if (!replyText[parentId]?.trim() || !profile?.displayName) return;
    try {
      const newReply = {
        postId,
        parentId,
        text: replyText[parentId],
        userId: creator?.uid || auth.currentUser?.uid || "",
        userName: profile.displayName,
        userPhoto: profile.photoURL || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "postComments"), newReply);
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      setReplyingTo((prev) => ({ ...prev, [parentId]: null }));
      fetchComments(postId);
    } catch (e) {
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("creatorHandle", creator?.handle || "");
      formData.append("type", newPost.type === "document" ? "perk_file" : newPost.type);

      let endpoint = "/api/upload/content/image";
      if (newPost.type === "video") endpoint = "/api/upload/content/video";
      if (newPost.type === "document") endpoint = "/api/upload/content/docs";

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (data.url) {
        setUploadedUrl(data.url);
        toast.success("File uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload file");
      setFilePreview(null);
      setUploadedUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddContent = async () => {
    const user = auth.currentUser;
    if (!user || !newPost.title || !creator?.handle) return;

    setIsUploading(true);
    try {
      const contentData = {
        creatorId: creator.handle,
        title: newPost.title,
        description: newPost.description,
        type: newPost.type,
        contentUrl: uploadedUrl,
        isPrivate: newPost.isPrivate,
        createdAt: serverTimestamp(),
        stats: { views: 0, likes: 0 },
      };

      if (editingPost) {
        await updateDoc(doc(db, "creatorContent", editingPost.id), contentData);
        toast.success("Post updated!");
      } else {
        const docRef = await addDoc(collection(db, "creatorContent"), contentData);
        toast.success("Content published!");

        try {
          const response = await fetch("/api/comms/email/content/new", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creatorId: creator.handle,
              creatorName: creator?.name || "Creator",
              creatorHandle: creator?.handle,
              contentTitle: newPost.title,
              contentDescription: newPost.description,
              contentType: newPost.isPrivate ? "private" : "public",
              contentId: docRef.id,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.sentCount > 0) {
              toast.success(`Notified ${data.sentCount} supporter(s) about your new content!`);
            }
          }
        } catch (notifyError) {
          console.error("Failed to notify supporters:", notifyError);
        }
      }

      setIsCreating(false);
      setEditingPost(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to save post.");
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (post: any) => {
    setEditingPost(post);
    setNewPost({
      title: post.title,
      description: post.description,
      type: post.type,
      isPrivate: post.isPrivate,
    });
    setUploadedUrl(post.contentUrl);
    setIsCreating(true);
  };

  const resetForm = () => {
    setNewPost({ title: "", description: "", type: "text", isPrivate: true });
    setFilePreview(null);
    setUploadedUrl("");
  };

  const deletePost = async () => {
    if (!deletePostId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "creatorContent", deletePostId));
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
    const matchesTab = activeTab === "All" ||
      (activeTab === "Videos" && post.type === "video") ||
      (activeTab === "Images" && post.type === "image") ||
      (activeTab === "Documents" && post.type === "document");
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <aside className={`${showSidebar ? 'flex' : 'hidden'} lg:flex w-full lg:w-72 bg-white border-r border-gray-200 p-4 flex-col fixed lg:relative inset-0 z-50 lg:z-auto`}>
        <div className="flex items-center justify-between lg:hidden mb-4">
          <h2 className="text-lg font-bold text-gray-900">Your Content</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2">
            <X size={24} />
          </button>
        </div>
        
        <button onClick={() => window.history.back()} className="hidden lg:flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        
        <h2 className="text-lg font-bold text-gray-900 mb-4 hidden lg:block">Your Content</h2>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {["All", "Videos", "Images", "Documents"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin text-gray-400" size={24} />
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => handleSelectPost(post)}
                className={`p-3 rounded-lg cursor-pointer transition border ${
                  selectedPost?.id === post.id
                    ? "bg-orange-50 border-orange-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    {post.type === "video" ? <Video size={16} className="text-gray-500" /> :
                     post.type === "image" ? <ImageIcon size={16} className="text-gray-500" /> :
                     <FileText size={16} className="text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      {post.isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                      {post.isPrivate ? "Supporters" : "Public"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No content yet</p>
          )}
        </div>

        <button
          onClick={() => { setIsCreating(true); setShowSidebar(false); }}
          className="mt-4 w-full bg-orange-500 text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition"
        >
          <Plus size={18} /> New Post
        </button>
      </aside>

      <main className="flex-1 p-4 lg:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">Content Manager</h1>
              <p className="text-xs lg:text-sm text-gray-500 mt-1 hidden lg:block">Manage your posts and see comments</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-orange-500 text-white px-3 lg:px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-orange-600 transition"
          >
            <Plus size={18} /> <span className="hidden sm:inline">New Post</span>
          </button>
        </div>

        {selectedPost ? (
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">{selectedPost.title}</h1>
                <p className="text-xs lg:text-sm text-gray-500 flex flex-wrap items-center gap-1 lg:gap-2 mt-1">
                  {selectedPost.isPrivate ? <Lock size={14} className="text-amber-500" /> : <Globe size={14} className="text-green-500" />}
                  <span className="hidden sm:inline">{selectedPost.isPrivate ? "Supporters Only" : "Public"}</span>
                  <span className="text-gray-300">|</span>
                  {selectedPost.stats?.views || 0} views
                  <span className="text-gray-300">|</span>
                  {selectedPost.stats?.likes || 0} likes
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(selectedPost)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                  <Edit3 size={18} className="text-gray-600" />
                </button>
                <button onClick={() => setDeletePostId(selectedPost.id)} className="p-2 bg-gray-100 rounded-lg hover:bg-red-50 transition">
                  <Trash2 size={18} className="text-gray-600 hover:text-red-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200">
              {selectedPost.type === "image" && selectedPost.contentUrl && (
                <div className="aspect-video bg-gray-100">
                  <img src={selectedPost.contentUrl} alt={selectedPost.title} className="w-full h-full object-contain" />
                </div>
              )}
              {selectedPost.type === "video" && selectedPost.contentUrl && (
                <div className="aspect-video bg-black">
                  <video src={selectedPost.contentUrl} controls className="w-full h-full" />
                </div>
              )}

              <div className="p-4 lg:p-6">
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap text-sm lg:text-base">{selectedPost.description}</div>

                {selectedPost.type === "document" && selectedPost.contentUrl && (
                  <a href={selectedPost.contentUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                    <FileText size={24} className="text-orange-500" />
                    <span className="text-sm font-medium">View Document</span>
                  </a>
                )}
              </div>

              <div className="border-t border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm lg:text-base">
                  <MessageCircle size={18} /> Comments ({comments[selectedPost.id]?.length || 0})
                </h3>

                <div className="space-y-3 max-h-[250px] lg:max-h-[300px] overflow-y-auto mb-4">
                  {comments[selectedPost.id]?.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {comment.userPhoto ? <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-xs flex items-center justify-center h-full text-gray-500">{comment.userName?.[0]}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{comment.userName}</span>
                            {comment.userId === creator?.uid && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Owner</span>
                            )}
                            <span className="text-xs text-gray-400">{comment.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
                          <button onClick={() => setReplyingTo((prev) => ({ ...prev, [comment.id]: comment.id }))} className="text-xs text-blue-500 mt-1">Reply</button>
                          
                          {replyingTo[comment.id] && (
                            <div className="mt-2 flex gap-2">
                              <input value={replyText[comment.id] || ""} onChange={(e) => setReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))} placeholder="Write a reply..." className="flex-1 text-sm px-3 py-2 border rounded-lg" />
                              <button onClick={() => handleAddReply(selectedPost.id, comment.id)} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm">Send</button>
                            </div>
                          )}
                          
                          {(comment.replies || []).map((reply) => (
                            <div key={reply.id} className="mt-2 ml-4 pl-3 border-l-2 border-gray-200">
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                  {reply.userPhoto ? <img src={reply.userPhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] flex items-center justify-center h-full text-gray-500">{reply.userName?.[0]}</span>}
                                </div>
                                <div>
                                  <span className="font-medium text-xs">{reply.userName}</span>
                                  {reply.userId === creator?.uid && (
                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full ml-1">Owner</span>
                                  )}
                                  <p className="text-sm text-gray-600">{reply.text}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!comments[selectedPost.id] || comments[selectedPost.id].length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={commentText[selectedPost.id] || ""}
                    onChange={(e) => setCommentText((prev) => ({ ...prev, [selectedPost.id]: e.target.value }))}
                    placeholder="Write a comment..."
                    className="flex-1 text-sm px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(selectedPost.id)}
                  />
                  <button onClick={() => handleAddComment(selectedPost.id)} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 text-sm lg:text-base">Select content to preview</p>
            </div>
          </div>
        )}
      </main>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-lg p-4 lg:p-6 shadow-xl my-8">
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-xl font-bold">{editingPost ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => { setIsCreating(false); setEditingPost(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {!editingPost && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  {["text", "video", "image", "document"].map((t) => (
                    <button key={t} onClick={() => { resetForm(); setNewPost({ ...newPost, type: t }); }} className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase ${newPost.type === t ? "bg-white text-orange-600 shadow" : "text-gray-500"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {newPost.type !== "text" && !editingPost && (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-orange-400 transition">
                  <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept={newPost.type === "image" ? "image/*" : newPost.type === "video" ? "video/*" : ".pdf,.doc,.docx"} />
                  {isUploading ? <Loader className="animate-spin text-orange-500" size={24} /> : uploadedUrl ? <div className="text-green-600 text-sm font-medium">File ready</div> : <><UploadCloud size={24} className="text-gray-400 mb-2" /><p className="text-sm text-gray-500">Click to upload {newPost.type}</p></>}
                </div>
              )}

              <input type="text" placeholder="Post Title" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} className="w-full text-sm lg:text-lg font-medium px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              
              <textarea placeholder="Write your content..." value={newPost.description} onChange={(e) => setNewPost({ ...newPost, description: e.target.value })} className="w-full h-32 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${newPost.isPrivate ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                    {newPost.isPrivate ? <Lock size={18} /> : <Globe size={18} />}
                  </div>
                  <span className="text-sm font-medium">{newPost.isPrivate ? "Supporters Only" : "Public"}</span>
                </div>
                <button onClick={() => setNewPost({ ...newPost, isPrivate: !newPost.isPrivate })} className="text-xs text-orange-600 font-medium px-3 py-1.5 bg-white border border-orange-200 rounded-lg hover:bg-orange-50">
                  Change
                </button>
              </div>

              <button onClick={handleAddContent} disabled={!newPost.title || isUploading} className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-orange-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {isUploading ? <Loader className="animate-spin" size={18} /> : editingPost ? "Save Changes" : "Publish"}
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