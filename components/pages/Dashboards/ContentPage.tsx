"use client";

import React, { useState } from "react";
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
  Loader2,
} from "lucide-react";

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [posts, setPosts] = useState([
    {
      id: "1",
      type: "video",
      title: "Behind the Scenes: Kigali Jazz Night",
      description:
        "A quick look at how we set up the stage for last night's show.",
      date: "2h ago",
      isPrivate: true,
      stats: { views: 42, likes: 12 },
      thumbnail: "VJ",
    },
    {
      id: "2",
      type: "image",
      title: "Digital Illustration Pack (Preview)",
      description: "Working on some new brushes for the Agaseke community.",
      date: "1d ago",
      isPrivate: false,
      stats: { views: 128, likes: 45 },
      thumbnail: "IP",
    },
  ]);

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    type: "text",
    isPrivate: true,
  });

  const handleAddContent = () => {
    setIsUploading(true);
    setTimeout(() => {
      const post = {
        ...newPost,
        id: Date.now().toString(),
        date: "Just now",
        stats: { views: 0, likes: 0 },
        thumbnail: newPost.title[0],
      };
      setPosts([post, ...posts]);
      setIsUploading(false);
      setIsCreating(false);
      setNewPost({ title: "", description: "", type: "text", isPrivate: true });
    }, 1500);
  };

  const deletePost = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:block p-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition"
        >
          <ArrowLeft size={16} />{" "}
          <span className="text-xs font-bold uppercase tracking-widest">
            Back
          </span>
        </button>
        <div className="space-y-1">
          {["All", "Videos", "Images", "Documents", "Links"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
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
        {/* --- Top Header --- */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Your Content</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage what your supporters see.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition shadow-lg shadow-slate-200"
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
            placeholder="Search your library..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-orange-100 outline-none transition shadow-sm"
          />
        </div>

        {/* --- Content Feed --- */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:border-orange-200 transition-all shadow-sm group"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold">
                      {post.type === "video" ? (
                        <Video size={20} />
                      ) : post.type === "image" ? (
                        <ImageIcon size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> {post.date}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 uppercase ${post.isPrivate ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                        >
                          {post.isPrivate ? (
                            <Lock size={10} />
                          ) : (
                            <Globe size={10} />
                          )}
                          {post.isPrivate ? "Supporters Only" : "Public"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deletePost(post?.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {post.description}
                </p>
                <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                  <div className="text-xs font-bold text-slate-400">
                    VIEWS{" "}
                    <span className="text-slate-900 ml-1">
                      {post.stats.views}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    LIKES{" "}
                    <span className="text-slate-900 ml-1">
                      {post.stats.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">Create Post</h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Selector */}
                <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                  {["text", "video", "image", "link"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewPost({ ...newPost, type: t })}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newPost.type === t ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Catchy Title"
                  className="w-full text-xl font-bold outline-none placeholder:text-slate-200 border-b border-slate-100 pb-2 focus:border-orange-500 transition"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                />

                <textarea
                  placeholder="Share the story behind this..."
                  className="w-full h-32 text-sm outline-none resize-none placeholder:text-slate-300"
                  value={newPost.description}
                  onChange={(e) =>
                    setNewPost({ ...newPost, description: e.target.value })
                  }
                />

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${newPost.isPrivate ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}
                    >
                      {newPost.isPrivate ? (
                        <Lock size={16} />
                      ) : (
                        <Globe size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold">
                        {newPost.isPrivate ? "Supporters Only" : "Everyone"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Visibility setting
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setNewPost({ ...newPost, isPrivate: !newPost.isPrivate })
                    }
                    className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline"
                  >
                    Change
                  </button>
                </div>

                <button
                  onClick={handleAddContent}
                  disabled={!newPost.title || isUploading}
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-100 hover:bg-orange-700 transition flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" size={20} />
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
