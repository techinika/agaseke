"use client";

import { useState, useEffect, useRef } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import { sanitizeArticleHtml, articleToPlainText } from "@/lib/articleHtml";
import {
  Loader,
  ArrowLeft,
  ImagePlus,
  X,
  Save,
  Rocket,
  Monitor,
  Copy,
  Check,
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
import {
  uploadFile,
  storedAssetValue,
  storedAssetVisibility,
  type AssetVisibility,
} from "@/lib/uploadService";
import { MediaAsset } from "@/components/parts/public/MediaAsset";
import { slugify, fallbackSlug } from "@/lib/slug";
import { baseUrl } from "@/lib/baseUrl";
import RichTextEditor from "@/components/parts/dashboard/RichTextEditor";

import { AudienceSelector } from "@/components/parts/dashboard/AudienceSelector";
import {
  resolvePostVisibility,
  type PostVisibility,
} from "@/lib/contentAccess";

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
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [requiredTierIds, setRequiredTierIds] = useState<string[]>([]);
  const [requiredTierNames, setRequiredTierNames] = useState<string[]>([]);
  const isPrivate = visibility !== "public";
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadedVisibility, setUploadedVisibility] =
    useState<AssetVisibility | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isUploadingEditorMedia, setIsUploadingEditorMedia] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [loading, setLoading] = useState(Boolean(articleId));
  const [copiedLink, setCopiedLink] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<File | null>(null);
  const coverUploadPromiseRef = useRef<
    Promise<{ url: string; visibility: AssetVisibility } | null> | null
  >(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

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
        setVisibility(resolvePostVisibility(data));
        setRequiredTierIds(
          Array.isArray(data.requiredTierIds) ? data.requiredTierIds : [],
        );
        setRequiredTierNames(
          Array.isArray(data.requiredTierNames) ? data.requiredTierNames : [],
        );
        const storedCover = data.coverUrl || data.contentUrl || "";
        setCoverPreview(null);
        coverFileRef.current = null;
        setCoverUrl(storedCover);
        setUploadedVisibility(storedAssetVisibility(storedCover));
        setStatus(data.status === "draft" ? "draft" : "published");
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

  const uploadCoverFile = (
    file: File,
    targetPrivate: boolean = isPrivate,
  ): Promise<{ url: string; visibility: AssetVisibility } | null> => {
    if (!creator?.handle) {
      toast.error("Please wait for your creator profile to load.");
      return Promise.resolve(null);
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Cover must be an image file.");
      return Promise.resolve(null);
    }

    coverFileRef.current = file;
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setIsUploadingCover(true);

    let run: Promise<{ url: string; visibility: AssetVisibility } | null> | null =
      null;
    run = (async () => {
      try {
        const data = await uploadFile(
          file,
          "post_image",
          creator.handle,
          undefined,
          targetPrivate ? "private" : "public",
        );
        const stored = storedAssetValue(data);
        if (!stored) throw new Error("Upload failed");
        setCoverUrl(stored);
        setUploadedVisibility(data.visibility);
        toast.success("Cover image uploaded!");
        return { url: stored, visibility: data.visibility };
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to upload cover image",
        );
        setCoverPreview(null);
        return null;
      } finally {
        setIsUploadingCover(false);
        if (coverUploadPromiseRef.current === run) {
          coverUploadPromiseRef.current = null;
        }
      }
    })();

    coverUploadPromiseRef.current = run;
    return run;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadCoverFile(file);
  };

  const handleSubmit = async (publish: boolean) => {
    if (!creator?.uid || !creator?.handle) {
      toast.error("Please sign in as a creator");
      return;
    }
    if (publish && !title.trim()) {
      toast.error("A title is required for articles");
      return;
    }

    if (visibility === "tier" && requiredTierIds.length === 0) {
      toast.error("Select at least one membership tier or choose another audience.");
      return;
    }

    if (isUploadingEditorMedia) {
      toast.info("Please wait for editor image uploads to finish.");
      return;
    }

    const cleanBody = sanitizeArticleHtml(bodyHtml);
    if (publish && !cleanBody) {
      toast.error("Article content cannot be empty");
      return;
    }

    let activeCoverUrl = coverUrl;
    let activeCoverVisibility = uploadedVisibility ?? storedAssetVisibility(coverUrl);

    if (coverUploadPromiseRef.current) {
      const uploaded = await coverUploadPromiseRef.current;
      if (uploaded) {
        activeCoverUrl = uploaded.url;
        activeCoverVisibility = uploaded.visibility;
      }
    }

    if (
      (isPrivate && activeCoverUrl && activeCoverVisibility !== "private") ||
      (!isPrivate && activeCoverVisibility === "private")
    ) {
      if (coverFileRef.current) {
        const reuploaded = await uploadCoverFile(coverFileRef.current, isPrivate);
        if (!reuploaded) return;
        activeCoverUrl = reuploaded.url;
        activeCoverVisibility = reuploaded.visibility;
      } else if (isPrivate) {
        toast.error("Re-upload the cover now that the article has restricted access.");
        return;
      } else {
        toast.error("Re-upload the cover now that the article is public.");
        return;
      }
    }

    const desc = shortDescription.trim()
      ? shortDescription.trim().slice(0, SHORT_DESC_MAX)
      : articleToPlainText(cleanBody, SHORT_DESC_MAX);

    const nextStatus: "draft" | "published" = publish ? "published" : "draft";
    const isExistingDraft = !!articleId && status === "draft";

    let finalSlug = (slugTouched ? slug.trim() : slugify(title)) || "";
    const hasSlug = !!finalSlug;

    setSaving(publish ? "publish" : "draft");
    try {
      let destination = backHref;

      if (publish && isExistingDraft) {
        await updateDoc(doc(db, "creatorContent", articleId), {
          title: title.trim(),
          ...(hasSlug && { slug: finalSlug }),
          description: desc,
          shortDescription: desc,
          htmlContent: cleanBody,
          coverUrl: activeCoverUrl || null,
          contentUrl: activeCoverUrl || null,
          isPrivate,
          visibility,
          requiredTierIds: visibility === "tier" ? requiredTierIds : [],
          requiredTierNames: visibility === "tier" ? requiredTierNames : [],
          status: "published",
          publishedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        try {
          const response = await sendCommsEmail("content_new", {
            creatorId: creator.handle,
            creatorName: creator.name || "Creator",
            creatorHandle: creator.handle,
            contentTitle: title.trim(),
            contentDescription: desc,
            contentType: isPrivate ? "private" : "public",
            contentId: articleId,
          });
          if (response.success && response.recipientCount > 0) {
            toast.success(
              `Notified ${response.recipientCount} supporter(s) about your new article!`,
            );
          }
        } catch (notifyError) {
          console.error("Failed to notify supporters:", notifyError);
          toast.error(`Could not notify supporters: ${String(notifyError)}`);
        }
        toast.success("Article published!");
        router.push(backHref);
        return;
      }

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
          setSaving(null);
          return;
        }

        if (slugTaken) {
          const alt = `${finalSlug}-${crypto.randomUUID().slice(0, 6)}`;
          toast.warning(
            `Slug "${finalSlug}" is taken — publishing as /articles/${alt}`,
          );
          finalSlug = alt;
        }
      }

      const wasPublished = articleId && status === "published";
      const shouldNotify = publish && (!articleId || !wasPublished);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        ...(hasSlug && { slug: finalSlug }),
        description: desc,
        shortDescription: desc,
        htmlContent: cleanBody,
        coverUrl: activeCoverUrl || null,
        contentUrl: activeCoverUrl || null,
        isPrivate,
        visibility,
        requiredTierIds: visibility === "tier" ? requiredTierIds : [],
        requiredTierNames: visibility === "tier" ? requiredTierNames : [],
        status: nextStatus,
        updatedAt: serverTimestamp(),
      };
      if (publish && !wasPublished) {
        payload.publishedAt = serverTimestamp();
      }

      if (articleId) {
        await updateDoc(doc(db, "creatorContent", articleId), payload);
        toast.success(
          publish
            ? wasPublished
              ? "Article updated!"
              : "Article published!"
            : "Draft saved",
        );
      } else {
        const docRef = await addDoc(collection(db, "creatorContent"), {
          ...payload,
          creatorId: creator.handle,
          creatorUid: creator.uid,
          type: "article",
          createdAt: serverTimestamp(),
          views: 0,
        });

        toast.success(publish ? "Article published!" : "Draft saved");

        if (shouldNotify) {
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
            toast.error(`Could not notify supporters: ${String(notifyError)}`);
          }
        }

        if (!publish) {
          destination = `/creator/content/articles/${docRef.id}`;
        }
      }

      router.push(destination);
    } catch (error) {
      console.error("Failed to save article", error);
      toast.error(articleId ? "Failed to update article." : "Failed to save article.");
    } finally {
      setSaving(null);
    }
  };

  const articleUrlSlug =
    slug ||
    slugify(title) ||
    fallbackSlug(slugify(title) || undefined);

  const copyArticleLink = async () => {
    if (!articleUrlSlug) return;
    try {
      await navigator.clipboard?.writeText(
        `${baseUrl}/articles/${articleUrlSlug}`,
      );
      setCopiedLink(true);
      toast.success("Article link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-24">
        {/* Top toolbar */}
        <div className="sticky top-0 z-30 -mx-4 lg:-mx-8 px-4 lg:px-8 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 h-16">
            <button
              onClick={() => router.push(backHref)}
              className="p-2 hover:bg-muted rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight truncate">
                {articleId ? "Edit Article" : "New Article"}
              </h1>
              <span
                className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                  status === "draft"
                    ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                    : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                }`}
              >
                {status === "draft" ? "Draft" : "Published"}
              </span>
            </div>

            {articleId && loading && (
              <Loader className="animate-spin text-orange-500" size={18} />
            )}

            <div className="flex-1" />

            <button
              onClick={() => router.push(backHref)}
              className="hidden sm:inline-flex px-4 py-2.5 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!!saving || isUploadingCover || isUploadingEditorMedia}
              className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition disabled:opacity-50"
              title="Saves a private draft that only you can see and edit"
            >
              {saving === "draft" ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              {saving === "draft" ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={
                !title.trim() ||
                !!saving ||
                isUploadingCover ||
                isUploadingEditorMedia
              }
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition-all disabled:opacity-50"
            >
              {saving === "publish" ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <Rocket size={16} />
              )}
              {saving === "publish"
                ? status === "published"
                  ? "Updating..."
                  : "Publishing..."
                : status === "published"
                  ? "Update"
                  : "Publish"}
            </button>
          </div>
        </div>

        {/* Big-screen notice */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
          <div className="mt-0.5">
            <Monitor size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p>
            <strong>Writing tip:</strong> for the best writing experience,
            create articles on a big screen — a tablet or computer. The editor
            and formatting tools are optimized for larger displays.
          </p>
        </div>

        {loading && articleId ? (
          <div className="flex items-center justify-center py-32">
            <Loader className="animate-spin text-orange-500" size={32} />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            {/* Main editor area (left) */}
            <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest block">
                  Article Content <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground normal-case tracking-normal">
                  Drag &amp; drop or use toolbar to upload images
                </span>
              </div>
              <RichTextEditor
                content={bodyHtml}
                onChange={setBodyHtml}
                onUploadingChange={setIsUploadingEditorMedia}
                placeholder="Write your article... Drag & drop images or use the toolbar for headings, quotes, links, and media."
              />
            </div>

            {/* Metadata panel (right) */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-6 lg:sticky lg:top-[88px]">
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
                {articleUrlSlug ? (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground break-all min-w-0">
                      Article URL:{" "}
                      <span className="text-orange-600 font-medium">
                        {baseUrl}/articles/{articleUrlSlug}
                      </span>
                    </p>
                    <button
                      onClick={copyArticleLink}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-orange-600 hover:bg-muted transition"
                      title="Copy public link"
                    >
                      {copiedLink ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                      {copiedLink ? "Copied" : "Copy"}
                    </button>
                  </div>
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
                {coverUrl || coverPreview ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(true);
                    }}
                    onDragLeave={() => setIsDraggingCover(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(false);
                      const file = e.dataTransfer?.files?.[0];
                      if (file) void uploadCoverFile(file);
                    }}
                    className={`relative rounded-xl overflow-hidden border transition ${
                      isDraggingCover ? "border-orange-500 ring-2 ring-orange-200" : "border-border"
                    }`}
                  >
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPreview}
                        alt="Article cover preview"
                        className="w-full max-h-72 object-cover"
                      />
                    ) : isPrivate && articleId ? (
                      <MediaAsset
                        postId={articleId}
                        isPrivate
                        url={coverUrl}
                        alt="Article cover"
                        className="w-full max-h-72 object-cover"
                      />
                    ) : storedAssetVisibility(coverUrl) === "private" ? (
                      <div className="w-full max-h-72 min-h-40 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                        Private cover uploaded
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt="Article cover"
                        className="w-full max-h-72 object-cover"
                      />
                    )}
                    {isUploadingCover && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white text-xs font-semibold">
                        <Loader className="animate-spin" size={22} />
                        <span>Uploading cover...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (coverPreview) URL.revokeObjectURL(coverPreview);
                        coverFileRef.current = null;
                        setCoverPreview(null);
                        setCoverUrl("");
                        setUploadedVisibility(null);
                      }}
                      className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
                      title="Remove cover"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(true);
                    }}
                    onDragLeave={() => setIsDraggingCover(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(false);
                      const file = e.dataTransfer?.files?.[0];
                      if (file) void uploadCoverFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center cursor-pointer transition ${
                      isDraggingCover
                        ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/30"
                        : "border-border hover:border-orange-400 bg-muted/40"
                    }`}
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
                        <p className="text-sm text-muted-foreground text-center">
                          Click or drop a cover image (used for previews &amp; SEO)
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Who can read this?
                </label>
                <AudienceSelector
                  visibility={visibility}
                  requiredTierIds={requiredTierIds}
                  tiers={creator?.communityTiers || []}
                  onChange={(next) => {
                    setVisibility(next.visibility);
                    setRequiredTierIds(next.requiredTierIds);
                    setRequiredTierNames(next.requiredTierNames);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}