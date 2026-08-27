/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Lock,
  Globe,
  Trash2,
  ArrowLeft,
  Loader,
  Edit3,
  Eye,
  FileText,
  MessageCircle,
  Search,
  FilePlus2,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useRouter } from "next/navigation";

export default function ArticlesPage() {
  const { creator } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!creator?.handle) return;

    const q = query(
      collection(db, "creatorContent"),
      where("creatorId", "==", creator.handle),
      where("type", "==", "article"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setArticles(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [creator?.handle]);

  const deleteArticle = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "creatorContent", deleteId));
      toast.success("Article deleted successfully");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete article");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = articles.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      (a.title || "").toLowerCase().includes(q) ||
      (a.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/creator/content")}
              className="p-2 hover:bg-muted rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight">
                Articles
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your published articles
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/creator/content/new"
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl text-sm font-bold hover:bg-muted transition"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">New Post</span>
            </Link>
            <Link
              href="/creator/content/articles/new"
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition"
            >
              <Plus size={16} />
              New Article
            </Link>
          </div>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader className="animate-spin text-orange-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border-strong">
            <div className="bg-card w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <FilePlus2 className="text-muted-foreground" size={24} />
            </div>
            <h3 className="font-bold text-foreground">
              {searchQuery ? "No matching articles" : "No articles yet"}
            </h3>
            <p className="text-muted-foreground text-sm mt-2">
              {searchQuery
                ? "Try a different search term."
                : "Create your first article to share long-form content with your audience."}
            </p>
            {!searchQuery && (
              <Link
                href="/creator/content/articles/new"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition"
              >
                <Plus size={16} /> New Article
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((article) => (
              <div
                key={article.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col sm:flex-row"
              >
                <div className="sm:w-40 flex items-center justify-center bg-muted overflow-hidden">
                  {article.coverUrl || article.contentUrl ? (
                    <img
                      src={article.coverUrl || article.contentUrl}
                      alt={article.title}
                      className="w-full h-40 sm:h-full object-cover"
                    />
                  ) : (
                    <FileText
                      size={32}
                      className="text-muted-foreground/40 my-8 sm:my-0"
                    />
                  )}
                </div>
                <div className="flex-1 p-5 flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded uppercase tracking-widest">
                      Article
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                        article.isPrivate
                          ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                          : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                      }`}
                    >
                      {article.isPrivate ? (
                        <>
                          <Lock size={10} /> Supporters
                        </>
                      ) : (
                        <>
                          <Globe size={10} /> Public
                        </>
                      )}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground truncate">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {article.shortDescription ||
                      article.description ||
                      "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span>
                      {article.createdAt?.toDate?.().toLocaleDateString() ||
                        "Recently"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {article.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} />{" "}
                      {article.commentCount || 0}
                    </span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center gap-2 p-4 sm:border-l border-border shrink-0">
                  <button
                    onClick={() =>
                      router.push(`/creator/content/articles/${article.id}`)
                    }
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted transition text-sm"
                    title="Edit article"
                  >
                    <Edit3 size={16} className="text-muted-foreground" />
                    <span className="sm:hidden">Edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteId(article.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-red-50 transition text-sm"
                    title="Delete article"
                  >
                    <Trash2 size={16} className="text-muted-foreground hover:text-red-500" />
                    <span className="sm:hidden">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteArticle}
        title="Delete Article?"
        message="This will permanently delete this article, its comments, and likes."
        confirmText="Delete"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}