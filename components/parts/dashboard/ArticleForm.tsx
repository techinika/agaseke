"use client";

import { useState, useEffect, useRef } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import { sanitizeArticleHtml, articleToPlainText } from "@/lib/articleHtml";
import {
  Loader,
  ArrowLeft,
  Lock,
  Globe,
  ImagePlus,
  X,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/uploadService";
import { slugify, fallbackSlug } from "@/lib/slug";
import { baseUrl } from "@/lib/baseUrl";
import RichTextEditor from "@/components/parts/dashboard/RichTextEditor";

const SHORT_DESC_MAX = 160;

interface ArticleFormProps {
  articleId?: string;
}

export default function ArticleForm({ articleId }: ArticleFormProps) {
  const { creator } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const backHref = "/creator/content/articles";

  useEffect(() => {
    if (!articleId) return;
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "creatorContent", articleId));
        if (!snap.exists()) {
          toast.error("Article not found");
          router.push(backHref);
          return;
        }
        const data = snap.data();
        setTitle(data.title || "");
        setSlug(data.slug || "");
        setShortDescription(
          data.shortDescription || data.description || "",
        );
        setBodyHtml(data.htmlContent || "");
        setIsPrivate(!!data.isPrivate);
        setCoverUrl(data.coverUrl || data.contentUrl || "");
        if (data.creatorId !== creator?.handle && data.creatorUid !== creator?.uid) {
          toast.error("You don't have permission to edit this article");
          router.push(backHref);
        }
      } catch (err) {
        console.error("Failed to load article", err);
        toast.error("Failed to load article");
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creator?.handle) return;
    setIsUploadingCover(true);
    try {
      const data = await uploadFile(file, "post_image", creator.handle);
      if (!data.url) throw new Error("Upload failed");
      setCoverUrl(data.url);
      toast.success("Cover image uploaded!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!creator?.uid || !creator?.handle) {
      toast.error("Please sign in as a creator");
      return;
    }
    if (!title.trim()) {
      toast.error("A title is required for articles");
      return;
    }

    const cleanBody = sanitizeArticleHtml(bodyHtml);
    if (!cleanBody) {
      toast.error("Article content cannot be empty");
      return;
    }

    const desc = shortDescription.trim()
      ? shortDescription.trim().slice(0, SHORT_DESC_MAX)
      : articleToPlainText(cleanBody, SHORT_DESC_MAX);

    setSaving(true);
    try {
      let finalSlug = (slugTouched ? slug.trim() : slugify(title)) || "";
      const hasSlug = !!finalSlug;

      if (hasSlug) {
        const slugSnap = await getDocs(
          query(
            collection(db, "creatorContent"),
            where("slug", "==", finalSlug),
          ),
        );
        const slugTaken = slugSnap.docs.some((d) => d.id !== articleId);

        if (slugTaken && articleId) {
          toast.error(
            `Slug "${finalSlug}" is already in use by another article. Choose a different slug.`,
          );
          setSaving(false);
          return;
        }

        if (slugTaken) {
          const alt = `${finalSlug}-${Math.random().toString(36).slice(2, 8)}`;
          toast.warning(
            `Slug "${finalSlug}" is taken — publishing as /articles/${alt}`,
          );
          finalSlug = alt;
        }
      }

      if (articleId) {
        await updateDoc(doc(db, "creatorContent", articleId), {
          title: title.trim(),
          ...(hasSlug && { slug: finalSlug }),
          description: desc,
          shortDescription: desc,
          htmlContent: cleanBody,
          coverUrl: coverUrl || null,
          contentUrl: coverUrl || null,
          isPrivate,
          updatedAt: serverTimestamp(),
        });
        toast.success("Article updated!");
      } else {
        const docRef = await addDoc(collection(db, "creatorContent"), {
          creatorId: creator.handle,
          creatorUid: creator.uid,
          type: "article",
          title: title.trim(),
          ...(hasSlug && { slug: finalSlug }),
          description: desc,
          shortDescription: desc,
          htmlContent: cleanBody,
          coverUrl: coverUrl || null,
          contentUrl: coverUrl || null,
          isPrivate,
          createdAt: serverTimestamp(),
          views: 0,
        });

        toast.success("Article published!");

        try {
          const response = await sendCommsEmail("content_new", {
            creatorId: creator.handle,
            creatorName: creator?.name || "Creator",
            creatorHandle: creator?.handle,
            contentTitle: title.trim(),
            contentDescription: desc,
            contentType: isPrivate ? "private" : "public",
            contentId: docRef.id,
          });
          if (response.success && response.recipientCount > 0) {
            toast.success(
              `Notified ${response.recipientCount} supporter(s) about your new article!`,
            );
          }
        } catch (notifyError) {
          console.error("Failed to notify supporters:", notifyError);
        }
      }

      router.push(backHref);
    } catch (error) {
      console.error("Failed to save article", error);
      toast.error(articleId ? "Failed to update article." : "Failed to publish article.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(backHref)}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            {articleId ? "Edit Article" : "New Article"}
          </h1>
          {articleId && loading && (
            <Loader className="animate-spin text-orange-500" size={18} />
          )}
        </div>

        {loading && articleId ? (
          <div className="flex items-center justify-center py-32">
            <Loader className="animate-spin text-orange-500" size={32} />
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-8">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Article Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="A compelling title (required)"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                className="w-full bg-muted p-4 rounded-xl text-base font-bold outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Article Slug{" "}
                <span className="normal-case font-medium tracking-normal">
                  (optional; unique — enables a public page at
                  /articles/your-slug)
                </span>
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  placeholder="your-article-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  className="flex-1 bg-muted p-4 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-100"
                />
                <button
                  onClick={() => {
                    setSlug(slugify(title) || fallbackSlug(slugify(title) || undefined));
                    setSlugTouched(false);
                  }}
                  className="px-4 py-2 bg-muted rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-orange-600 hover:bg-muted transition"
                  title="Regenerate from title"
                >
                  Generate
                </button>
              </div>
              {slug || (title && slugify(title)) ? (
                <p className="text-xs text-muted-foreground mt-2 break-all">
                  Article URL:{" "}
                  <span className="text-orange-600 font-medium">
                    {baseUrl}/articles/
                    {slug ||
                      slugify(title) ||
                      fallbackSlug(slugify(title) || undefined)}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  No public URL yet — add a slug to publish at{" "}
                  <span className="text-orange-600 font-medium">
                    {baseUrl}/articles/your-slug
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Cover Image
              </label>
              {coverUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img
                    src={coverUrl}
                    alt="Article cover"
                    className="w-full max-h-72 object-cover"
                  />
                  <button
                    onClick={() => setCoverUrl("")}
                    className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
                    title="Remove cover"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center cursor-pointer hover:border-orange-400 transition bg-muted/40"
                >
                  <input
                    type="file"
                    ref={coverInputRef}
                    hidden
                    accept="image/*"
                    onChange={handleCoverUpload}
                  />
                  {isUploadingCover ? (
                    <Loader className="animate-spin text-orange-500" size={24} />
                  ) : (
                    <>
                      <ImagePlus size={24} className="text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Upload a cover image (used for previews &amp; SEO)
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest block">
                  Short Description
                </label>
                <span
                  className={`text-xs ${
                    shortDescription.length > SHORT_DESC_MAX
                      ? "text-red-500 font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {shortDescription.length}/{SHORT_DESC_MAX}
                </span>
              </div>
              <textarea
                placeholder="A short summary (~160 characters) shown in feeds and search engines. Leave blank to auto-generate from content."
                value={shortDescription}
                maxLength={SHORT_DESC_MAX}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100 resize-none h-24"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                Article Content <span className="text-red-500">*</span>
                <span className="normal-case font-medium tracking-normal text-muted-foreground ml-2">
                  Images & videos upload through Agaseke
                </span>
              </label>
              <RichTextEditor
                content={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Write your article... Use the toolbar to add headings, quotes, links, and media."
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isPrivate
                      ? "bg-amber-100 text-amber-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {isPrivate ? <Lock size={18} /> : <Globe size={18} />}
                </div>
                <span className="text-sm font-medium">
                  {isPrivate ? "Supporters Only" : "Public"}
                </span>
              </div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className="text-xs text-orange-600 font-medium px-3 py-1.5 bg-card border border-orange-200 rounded-lg hover:bg-orange-50"
              >
                Change
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push(backHref)}
                className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || saving}
                className="flex-[2] bg-foreground text-background py-4 rounded-xl font-bold text-lg hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader className="animate-spin" size={20} />
                ) : null}
                {saving
                  ? articleId
                    ? "Saving..."
                    : "Publishing..."
                  : articleId
                    ? "Save Changes"
                    : "Publish Article"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}