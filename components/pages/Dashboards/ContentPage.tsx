/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
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
} from "firebase/firestore";

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 2. Add Content to Firestore
  const handleAddContent = async () => {
    const user = auth.currentUser;
    if (!user || !newPost.title) return;

    setIsUploading(true);
    try {
      await addDoc(collection(db, "creatorContent"), {
        creatorId: user.uid,
        title: newPost.title,
        description: newPost.description,
        type: newPost.type,
        isPrivate: newPost.isPrivate,
        createdAt: serverTimestamp(),
        stats: { views: 0, likes: 0 },
      });

      setIsCreating(false);
      setNewPost({ title: "", description: "", type: "text", isPrivate: true });
    } catch (error) {
      console.error("Error adding content:", error);
      alert("Failed to publish content.");
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Delete Content
  const deletePost = async (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      await deleteDoc(doc(db, "creatorContent", id));
    }
  };

  // 4. Filter and Search Logic
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
            <h1 className="text-3xl font-black tracking-tight uppercase">
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
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-orange-500 transition-colors">
                        {post.type === "video" ? (
                          <Video size={20} />
                        ) : post.type === "image" ? (
                          <ImageIcon size={20} />
                        ) : post.type === "link" ? (
                          <LinkIcon size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition truncate max-w-[200px] md:max-w-md">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                            <Clock size={10} />{" "}
                            {post.createdAt?.toDate
                              ? post.createdAt.toDate().toLocaleDateString()
                              : "Just now"}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase ${post.isPrivate ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                          >
                            {post.isPrivate ? (
                              <Lock size={10} />
                            ) : (
                              <Globe size={10} />
                            )}
                            {post.isPrivate ? "Supporters" : "Public"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2">
                    {post.description}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-20 flex flex-col items-center text-center">
              <Inbox size={48} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-black text-slate-400">
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
            <div className="bg-white w-full max-w-lg rounded-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter">
                  New Post
                </h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-lg">
                  {["text", "video", "image", "link"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewPost({ ...newPost, type: t })}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newPost.type === t ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Catchy Title"
                  className="w-full text-xl font-bold outline-none placeholder:text-slate-200 border-b-2 border-slate-50 pb-2 focus:border-orange-500 transition"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                />

                <div className="space-y-2">
                  {newPost.type !== "text" && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-700 text-[11px] font-bold flex items-center gap-2">
                      <Plus size={14} /> Note: Uploading is coming soon. Please
                      paste the URL to your {newPost.type} below.
                    </div>
                  )}
                  <textarea
                    placeholder={
                      newPost.type === "text"
                        ? "Share the story behind this..."
                        : `Paste the link to your ${newPost.type} here...`
                    }
                    className="w-full h-32 text-sm outline-none resize-none placeholder:text-slate-300 font-medium bg-slate-50 p-4 rounded-lg focus:bg-white border border-transparent focus:border-slate-100 transition"
                    value={newPost.description}
                    onChange={(e) =>
                      setNewPost({ ...newPost, description: e.target.value })
                    }
                  />
                </div>

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
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">
                        {newPost.isPrivate ? "Supporters Only" : "Everyone"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        Visibility setting
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setNewPost({ ...newPost, isPrivate: !newPost.isPrivate })
                    }
                    className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-orange-100 shadow-sm transition active:scale-95"
                  >
                    Change
                  </button>
                </div>

                <button
                  onClick={handleAddContent}
                  disabled={!newPost.title || isUploading}
                  className="w-full bg-slate-900 text-white py-5 rounded-lg font-black text-lg shadow-xl shadow-slate-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  {isUploading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    "Publish Post"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
