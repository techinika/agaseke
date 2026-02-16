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
  Clock,
  ArrowLeft,
  X,
  Loader,
  Link as LinkIcon,
  Inbox,
  UploadCloud,
  Eye,
  Edit3,
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
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";

export default function ContentManager() {
  const { creator } = useAuth();
  const [activeTab, setActiveTab] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewPost, setPreviewPost] = useState<any | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    type: "text",
    isPrivate: true,
  });

  // 1. Fetch Content from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "creatorContent"),
      where("creatorId", "==", user.uid),
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
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Data = reader.result;
      let endpoint = "/api/upload/content/image";
      if (newPost.type === "video") endpoint = "/api/upload/content/video";
      if (newPost.type === "document") endpoint = "/api/upload/content/docs";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Data,
            video: base64Data,
            file: base64Data,
            type: newPost.type === "document" ? "perk_file" : newPost.type,
            isPublic: !newPost.isPrivate,
            creatorHandle: creator?.handle,
          }),
        });

        const data = await res.json();
        if (data.url) {
          setUploadedUrl(data.url);
          toast.success("File ready!");
        } else {
          throw new Error("Upload failed");
        }
      } catch (err) {
        toast.error("Failed to upload to server.");
        setFilePreview(null);
      } finally {
        setIsUploading(false);
      }
    };
  };
  const handleAddContent = async () => {
    const user = auth.currentUser;
    if (!user || !newPost.title) return;

    setIsUploading(true);
    try {
      const contentData = {
        creatorId: user.uid,
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
        await addDoc(collection(db, "creatorContent"), contentData);
        toast.success("Content published!");
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

  const deletePost = async (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      await deleteDoc(doc(db, "creatorContent", id));
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Videos" && post.type === "video") ||
      (activeTab === "Images" && post.type === "image") ||
      (activeTab === "Links" && post.type === "link") ||
      (activeTab === "Documents" && post.type === "document");

    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex text-slate-900">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition"
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Back
          </span>
        </button>
        <div className="space-y-1">
          {["All", "Videos", "Images", "Documents", "Links"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-orange-50 text-orange-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-8 max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase">
              Library
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Manage what your supporters see.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition shadow-lg shadow-orange-100"
          >
            <Plus size={18} /> New Post
          </button>
        </header>

        {/* --- Search Bar --- */}
        <div className="relative mb-8">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full bg-white border border-slate-200 rounded-lg py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-orange-100 outline-none transition shadow-sm font-medium"
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader className="animate-spin mb-4" />
              <p className="text-sm font-bold">Loading your library...</p>
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-orange-200 transition-all shadow-sm group"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                        {post.type === "video" ? (
                          <Video size={20} />
                        ) : post.type === "image" ? (
                          <ImageIcon size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase ${post.isPrivate ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                          >
                            {post.isPrivate ? (
                              <Lock size={10} />
                            ) : (
                              <Globe size={10} />
                            )}{" "}
                            {post.isPrivate ? "Supporters" : "Public"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewPost(post)}
                        className="p-2 text-slate-400 hover:text-blue-500 transition"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => startEdit(post)}
                        className="p-2 text-slate-400 hover:text-orange-500 transition"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-20 flex flex-col items-center text-center">
              <Inbox size={48} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">
                No content found
              </h3>
              <p className="text-sm text-slate-400 max-w-xs mt-2 font-medium">
                Start building your community by sharing your first piece of
                work.
              </p>
            </div>
          )}
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold uppercase tracking-tighter">
                  {editingPost ? "Edit Post" : "New Post"}
                </h2>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPost(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {!editingPost && (
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-lg">
                    {["text", "video", "image", "document"].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          resetForm();
                          setNewPost({ ...newPost, type: t });
                        }}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${newPost.type === t ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {newPost.type !== "text" && !editingPost && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      hidden
                      onChange={handleFileChange}
                      accept={
                        newPost.type === "image"
                          ? "image/*"
                          : newPost.type === "video"
                            ? "video/*"
                            : ".pdf,.doc,.docx"
                      }
                    />
                    {isUploading ? (
                      <Loader
                        className="animate-spin text-orange-600"
                        size={32}
                      />
                    ) : filePreview ? (
                      <img
                        src={filePreview}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : uploadedUrl ? (
                      <div className="text-green-600 font-bold text-xs uppercase flex items-center gap-2">
                        <ImageIcon size={16} /> File ready
                      </div>
                    ) : (
                      <>
                        <UploadCloud
                          size={24}
                          className="text-slate-400 group-hover:text-orange-500"
                        />
                        <p className="text-sm font-bold text-center">
                          Click to upload {newPost.type}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Post Title"
                  className="w-full text-xl font-bold outline-none border-b-2 border-slate-50 pb-2 focus:border-orange-500 transition"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                />
                <textarea
                  placeholder="Tell your supporters more..."
                  className="w-full h-32 text-sm outline-none resize-none bg-slate-50 p-4 rounded-lg focus:bg-white border border-transparent focus:border-slate-100 transition"
                  value={newPost.description}
                  onChange={(e) =>
                    setNewPost({ ...newPost, description: e.target.value })
                  }
                />

                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg ${newPost.isPrivate ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}
                    >
                      {newPost.isPrivate ? (
                        <Lock size={18} />
                      ) : (
                        <Globe size={18} />
                      )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-tight">
                      {newPost.isPrivate ? "Supporters Only" : "Everyone"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setNewPost({ ...newPost, isPrivate: !newPost.isPrivate })
                    }
                    className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-orange-100 shadow-sm transition"
                  >
                    Change
                  </button>
                </div>

                <button
                  onClick={handleAddContent}
                  disabled={!newPost.title || isUploading}
                  className="w-full bg-slate-900 text-white py-5 rounded-lg font-bold text-lg shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {isUploading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : editingPost ? (
                    "Save Changes"
                  ) : (
                    "Publish Post"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {previewPost && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setPreviewPost(null)}
                className="absolute top-6 right-6 z-10 p-2 bg-black/10 hover:bg-black/20 rounded-full transition text-slate-800"
              >
                <X size={24} />
              </button>
              <div className="max-h-[85vh] overflow-y-auto">
                {previewPost.type === "image" && (
                  <img
                    src={previewPost.contentUrl}
                    className="w-full aspect-video object-cover"
                  />
                )}
                {previewPost.type === "video" && (
                  <video
                    src={previewPost.contentUrl}
                    controls
                    className="w-full aspect-video bg-black"
                  />
                )}

                <div className="p-10">
                  <span className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">
                    Preview Mode
                  </span>
                  <h2 className="text-3xl font-black mb-4 leading-tight">
                    {previewPost.title}
                  </h2>
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {previewPost.description}
                  </p>

                  {previewPost.type === "document" && (
                    <a
                      href={previewPost.contentUrl}
                      target="_blank"
                      className="mt-8 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                        <FileText />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Download Document</p>
                        <p className="text-xs text-slate-400">
                          Supporters only
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
