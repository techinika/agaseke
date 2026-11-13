"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Globe,
  Image as ImageIcon,
  Lock,
  Loader,
  Type as TypeIcon,
  FileText,
  Video,
  UploadCloud,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { publishCreatorContent } from "../api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { uploadFile, storedAssetValue, type AssetVisibility } from "@/lib/uploadService";
import { sendCommsEmail } from "@/lib/commsService";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/* eslint-disable @next/next/no-img-element -- blob preview */

export type ComposerType = "text" | "image" | "video" | "document";

export type ComposerVisibility = "public" | "private";

interface ComposerDraft {
  type: ComposerType;
  title: string;
  content: string;
  visibility: ComposerVisibility;
  price: string;
}

const DRAFT_KEY = "agaseke:composer:draft";

const STEPS = [
  { id: "type", label: "Type" },
  { id: "content", label: "Content" },
  { id: "visibility", label: "Visibility" },
  { id: "preview", label: "Preview" },
] as const;

const TYPE_OPTIONS: {
  id: ComposerType;
  label: string;
  hint: string;
  icon: typeof TypeIcon;
}[] = [
  { id: "text", label: "Text", hint: "A written post", icon: TypeIcon },
  { id: "image", label: "Image", hint: "Photo post", icon: ImageIcon },
  { id: "video", label: "Video", hint: "Video post", icon: Video },
  { id: "document", label: "Document", hint: "File or PDF", icon: FileText },
];

const VISIBILITIES: {
  id: ComposerVisibility;
  label: string;
  icon: typeof Globe;
  description: string;
}[] = [
  { id: "public", label: "Public", icon: Globe, description: "Anyone can see it." },
  {
    id: "private",
    label: "Supporters only",
    icon: Lock,
    description: "Your supporters pay to unlock it.",
  },
];

function readDraft(): ComposerDraft {
  const fallback: ComposerDraft = {
    type: "text",
    title: "",
    content: "",
    visibility: "public",
    price: "",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ComposerDraft>;
      return {
        type:
          parsed.type && TYPE_OPTIONS.some((t) => t.id === parsed.type)
            ? parsed.type
            : "text",
        title: parsed.title ?? "",
        content: parsed.content ?? "",
        visibility: parsed.visibility === "private" ? "private" : "public",
        price: parsed.price ?? "",
      };
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function StepComposer() {
  const { creator } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ComposerType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedVisibility, setUploadedVisibility] = useState<AssetVisibility | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ComposerVisibility>("public");
  const [price, setPrice] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDraft = useCallback((next: Partial<ComposerDraft>) => {
    if (typeof window === "undefined") return;
    try {
      const current = readDraft();
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify(Object.assign({}, current, next)),
      );
    } catch {
      // Storage can be blocked; the composer keeps working in-memory.
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restore local draft after mount */
    const draft = readDraft();
    setType(draft.type);
    setTitle(draft.title);
    setContent(draft.content);
    setVisibility(draft.visibility);
    setPrice(draft.price);
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft({ type, title, content, visibility, price });
  }, [draftLoaded, saveDraft, type, title, content, visibility, price]);

  const resetAll = () => {
    setType("text");
    setTitle("");
    setContent("");
    setFilePreview(null);
    setUploadedUrl("");
    setUploadedVisibility(null);
    setUploadError(null);
    setVisibility("public");
    setPrice("");
    setStep(0);
    setIsPublishing(false);
  };

  const handlePublish = async () => {
    if (!creator?.uid || !creator?.handle) {
      toast.error("Please sign in to publish content.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please add a title before publishing.");
      return;
    }
    if (type !== "text" && !uploadedUrl) {
      toast.error("Please add a media file before publishing.");
      return;
    }
    if (visibility === "private" && uploadedUrl && uploadedVisibility !== "private") {
      toast.error("Re-upload the file now that the post is supporters-only.");
      return;
    }
    if (visibility === "public" && uploadedVisibility === "private") {
      toast.error("Re-upload the file now that the post is public.");
      return;
    }

    setIsPublishing(true);
    try {
      const contentId = await publishCreatorContent({
        creatorHandle: creator.handle,
        creatorUid: creator.uid,
        title: title.trim(),
        description: content,
        type,
        contentUrl: uploadedUrl,
        isPrivate: visibility === "private",
      });
      toast.success("Content published!");

      try {
        const response = await sendCommsEmail("content_new", {
          creatorId: creator.handle,
          creatorName: creator?.name || "Creator",
          creatorHandle: creator?.handle,
          contentTitle: title.trim(),
          contentDescription: content,
          contentType: visibility === "private" ? "private" : "public",
          contentId,
        });
        if (response.success && response.recipientCount > 0) {
          toast.success(
            "Notified " +
              response.recipientCount +
              " supporter(s) about your new content!",
          );
        }
      } catch (notifyError) {
        console.error("Failed to notify supporters:", notifyError);
        toast.error("Could not notify supporters: " + String(notifyError));
      }

      window.localStorage.removeItem(DRAFT_KEY);
      resetAll();
      router.push("/creator/content");
    } catch (error) {
      console.error("Publish error:", error);
      toast.error("Failed to save post.");
    } finally {
      setIsPublishing(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const stepTitles = [
    "Choose your content type",
    "Add your content",
    "Who can see it?",
    "Preview & publish",
  ];
  const canNext =
    step === 0
      ? true
      : step === 1
        ? type !== "text"
          ? Boolean(uploadedUrl)
          : Boolean(title.trim() && content.trim())
        : true;

  const goNext = () => {
    if (!canNext) {
      if (step === 1) {
        toast.error(
          type === "text"
            ? "Please add a title and content."
            : "Please add a media file.",
        );
      }
      return;
    }
    next();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => back()}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-fg hover:bg-muted focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Back"
            tabIndex={step > 0 ? 0 : -1}
            style={step > 0 ? undefined : { pointerEvents: "none", opacity: 0.5 }}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">New Post</h1>
        </div>

        {step < STEPS.length - 1 && (
          <ol
            className="flex items-center gap-2 mb-8"
            aria-label={STEPS.map((s) => s.label).join(", ")}
          >
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                aria-current={i === step ? "step" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                    i === step
                      ? "bg-brand-strong text-on-brand"
                      : i < step
                        ? "bg-success-bg text-success"
                        : "bg-surface-raised text-muted-fg",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-caption font-semibold",
                    i === step ? "text-fg" : "text-muted-fg",
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "h-px min-w-2 flex-1",
                      i < step ? "bg-success" : "bg-line-strong",
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
        )}

        {step === 0 && (
          <Card className="p-4 sm:p-6 space-y-3">
            <h2 className="text-title font-bold text-fg">{stepTitles[0]}</h2>
            <div className="grid gap-3">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = type === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setType(option.id);
                      saveDraft({ type: option.id });
                      setStep(1);
                    }}
                    className={cn(
                      "flex min-h-16 w-full items-center gap-3 rounded-control border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                      active
                        ? "border-brand-strong bg-brand/5"
                        : "border-line-strong bg-surface hover:bg-surface-raised",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full",
                        active
                          ? "bg-brand-strong text-on-brand"
                          : "bg-surface-raised text-muted-fg",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-fg">
                        {option.label}
                      </span>
                      <span className="block text-caption text-muted-fg">
                        {option.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-4 sm:p-6 space-y-4">
            <h2 className="text-title font-bold text-fg">{stepTitles[1]}</h2>
            {type === "text" ? (
              <>
                <div>
                  <label
                    htmlFor="composer-title"
                    className="text-label font-semibold text-fg"
                  >
                    Title
                  </label>
                  <input
                    id="composer-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      saveDraft({ title: e.target.value });
                    }}
                    className="mt-1.5 min-h-12 w-full rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    placeholder="Give your post a title"
                  />
                </div>
                <div>
                  <label
                    htmlFor="composer-content"
                    className="text-label font-semibold text-fg"
                  >
                    Content
                  </label>
                  <textarea
                    id="composer-content"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      saveDraft({ content: e.target.value });
                    }}
                    rows={6}
                    placeholder="Write your story..."
                    className="mt-1.5 min-h-32 w-full resize-none rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-40 rounded-control border-2 border-dashed border-line-strong bg-surface p-6 flex flex-col items-center justify-center cursor-pointer hover:border-brand-strong focus-visible:ring-2 focus-visible:ring-focus"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept={
                      type === "image"
                        ? "image/*"
                        : type === "video"
                          ? "video/*"
                          : ".pdf,.doc,.docx"
                    }
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setFilePreview(URL.createObjectURL(file));
                      setIsUploading(true);
                      setUploadError(null);
                      try {
                        const assetType =
                          type === "video"
                            ? "post_video"
                            : type === "document"
                              ? "post_document"
                              : "post_image";
                        const data = await uploadFile(
                          file,
                          assetType,
                          creator?.handle || "",
                          undefined,
                          visibility === "private" ? "private" : "public",
                        );
                        const stored = storedAssetValue(data);
                        if (stored) {
                          setUploadedUrl(stored);
                          setUploadedVisibility(data.visibility);
                        } else {
                          throw new Error("Upload failed");
                        }
                      } catch (err) {
                        setUploadError(
                          err instanceof Error ? err.message : "Upload failed",
                        );
                        setFilePreview(null);
                        setUploadedUrl("");
                        setUploadedVisibility(null);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                  {isUploading ? (
                    <Loader
                      className="animate-spin text-brand-strong"
                      size={28}
                      aria-hidden="true"
                    />
                  ) : uploadedUrl ? (
                    <div className="flex items-center gap-2 text-success font-semibold">
                      <UploadCloud className="size-5" aria-hidden="true" /> File ready
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="size-7 text-muted-fg" aria-hidden="true" />
                      <p className="mt-2 text-label text-muted-fg">
                        Tap to add {type} media
                      </p>
                    </>
                  )}
                </div>
                {filePreview && (
                  <div className="overflow-hidden rounded-control border border-line">
                    <img
                      src={filePreview}
                      alt="Upload preview"
                      className="max-h-48 w-full object-cover"
                    />
                  </div>
                )}
                {uploadError && (
                  <p
                    role="alert"
                    className="rounded-control bg-danger-bg p-3 text-label font-medium text-danger"
                  >
                    {uploadError}
                  </p>
                )}
              </div>
            )}

            {type === "text" && (
              <div>
                <label
                  htmlFor="composer-title2"
                  className="text-label font-semibold text-fg"
                >
                  Title
                </label>
                <input
                  id="composer-title2"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    saveDraft({ title: e.target.value });
                  }}
                  className="mt-1.5 min-h-12 w-full rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  placeholder="Give your post a title"
                />
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card className="p-4 sm:p-6 space-y-4">
            <h2 className="text-title font-bold text-fg">{stepTitles[2]}</h2>
            <div className="grid gap-3">
              {VISIBILITIES.map((option) => {
                const Icon = option.icon;
                const active = visibility === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setVisibility(option.id);
                      saveDraft({ visibility: option.id });
                    }}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-control border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                      active
                        ? "border-brand-strong bg-brand/5"
                        : "border-line-strong bg-surface hover:bg-surface-raised",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full",
                        active
                          ? "bg-brand-strong text-on-brand"
                          : "bg-surface-raised text-muted-fg",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-fg">
                        {option.label}
                      </span>
                      <span className="block text-caption text-muted-fg">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {visibility === "private" && (
              <div>
                <label
                  htmlFor="composer-price"
                  className="text-label font-semibold text-fg"
                >
                  Support price (optional)
                </label>
                <input
                  id="composer-price"
                  type="number"
                  min={0}
                  step={100}
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    saveDraft({ price: e.target.value });
                  }}
                  className="mt-1.5 min-h-12 w-full rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  placeholder="0"
                />
                <p className="mt-1 text-caption text-muted-fg">
                  0 means supporters get it with any support.
                </p>
              </div>
            )}
          </Card>
        )}

        {step === 3 && (
          <Card className="p-4 sm:p-6 space-y-4">
            <h2 className="text-title font-bold text-fg">{stepTitles[3]}</h2>
            <div className="rounded-control border border-line bg-surface-raised p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-label">
                <span className="text-muted-fg">Type</span>
                <span className="font-semibold text-fg capitalize">{type}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-label">
                <span className="text-muted-fg">Title</span>
                <span className="font-semibold text-fg">{title || "—"}</span>
              </div>
              {type === "text" && (
                <div className="flex items-center justify-between gap-3 text-label">
                  <span className="text-muted-fg">Body</span>
                  <span className="font-semibold text-fg">
                    {content.trim() ? content.trim().length + " chars" : "—"}
                  </span>
                </div>
              )}
              {type !== "text" && (
                <div className="flex items-center justify-between gap-3 text-label">
                  <span className="text-muted-fg">Media</span>
                  <span className="font-semibold text-fg">
                    {uploadedUrl ? "Ready" : "Not added"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 text-label">
                <span className="text-muted-fg">Visibility</span>
                <span className="font-semibold text-fg">
                  {visibility === "private" ? "Supporters only" : "Public"}
                </span>
              </div>
              {visibility === "private" && (
                <div className="flex items-center justify-between gap-3 text-label">
                  <span className="text-muted-fg">Support price</span>
                  <span className="font-semibold text-fg">
                    {price ? price + " RWF" : "Free for supporters"}
                  </span>
                </div>
              )}
            </div>
            <Button
              fullWidth
              size="lg"
              loading={isPublishing}
              disabled={!canNext}
              onClick={handlePublish}
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </Card>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="secondary"
              onClick={back}
              leadingIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 && <Button onClick={goNext}>Next</Button>}
        </div>
      </div>
    </div>
  );
}
