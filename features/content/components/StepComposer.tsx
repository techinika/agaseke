"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
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
import {
  formatVisibilityLabel,
  type PostVisibility,
} from "@/lib/contentAccess";
import { AudienceSelector } from "@/components/parts/dashboard/AudienceSelector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/* eslint-disable @next/next/no-img-element -- blob preview */

export type ComposerType = "text" | "image" | "video" | "document";
export type ComposerVisibility = PostVisibility;

interface ComposerDraft {
  type: ComposerType;
  title: string;
  content: string;
  visibility: PostVisibility;
  requiredTierIds: string[];
  requiredTierNames: string[];
}

const DRAFT_KEY = "agaseke:composer:draft";

const STEPS = [
  { id: "type", label: "Type" },
  { id: "content", label: "Content" },
  { id: "visibility", label: "Audience" },
  { id: "preview", label: "Preview" },
] as const;

const TYPE_OPTIONS: {
  id: ComposerType;
  label: string;
  hint: string;
  icon: typeof TypeIcon;
}[] = [
  { id: "text", label: "Text", hint: "A written update or note", icon: TypeIcon },
  { id: "image", label: "Image", hint: "Photo post with caption", icon: ImageIcon },
  { id: "video", label: "Video", hint: "Video post with caption", icon: Video },
  { id: "document", label: "Document", hint: "File or PDF", icon: FileText },
];

function readDraft(): ComposerDraft {
  const fallback: ComposerDraft = {
    type: "text",
    title: "",
    content: "",
    visibility: "public",
    requiredTierIds: [],
    requiredTierNames: [],
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Omit<ComposerDraft, "visibility">> & {
        visibility?: string;
      };
      const rawVis = parsed.visibility;
      const vis: PostVisibility =
        rawVis === "supporters" ||
        rawVis === "members" ||
        rawVis === "tier"
          ? rawVis
          : rawVis === "private"
            ? "supporters"
            : "public";
      return {
        type:
          parsed.type && TYPE_OPTIONS.some((t) => t.id === parsed.type)
            ? parsed.type
            : "text",
        title: parsed.title ?? "",
        content: parsed.content ?? "",
        visibility: vis,
        requiredTierIds: Array.isArray(parsed.requiredTierIds)
          ? parsed.requiredTierIds
          : [],
        requiredTierNames: Array.isArray(parsed.requiredTierNames)
          ? parsed.requiredTierNames
          : [],
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [requiredTierIds, setRequiredTierIds] = useState<string[]>([]);
  const [requiredTierNames, setRequiredTierNames] = useState<string[]>([]);
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
    setRequiredTierIds(draft.requiredTierIds);
    setRequiredTierNames(draft.requiredTierNames);
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft({
      type,
      title,
      content,
      visibility,
      requiredTierIds,
      requiredTierNames,
    });
  }, [
    draftLoaded,
    saveDraft,
    type,
    title,
    content,
    visibility,
    requiredTierIds,
    requiredTierNames,
  ]);

  const resetAll = () => {
    setType("text");
    setTitle("");
    setContent("");
    setFilePreview(null);
    setUploadedUrl("");
    setUploadedVisibility(null);
    setUploadProgress(null);
    setUploadError(null);
    setVisibility("public");
    setRequiredTierIds([]);
    setRequiredTierNames([]);
    setStep(0);
    setIsPublishing(false);
  };

  const isGated = visibility !== "public";

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
    if (visibility === "tier" && requiredTierIds.length === 0) {
      toast.error("Select at least one membership tier or change audience.");
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

    setIsPublishing(true);
    try {
      const contentId = await publishCreatorContent({
        creatorHandle: creator.handle,
        creatorUid: creator.uid,
        title: title.trim(),
        description: content,
        type,
        contentUrl: uploadedUrl || null,
        isPrivate: isGated,
        visibility,
        requiredTierIds,
        requiredTierNames,
      });
      toast.success("Content published!");

      try {
        const response = await sendCommsEmail("content_new", {
          creatorId: creator.handle,
          creatorName: creator?.name || "Creator",
          creatorHandle: creator?.handle,
          contentTitle: title.trim(),
          contentDescription: content,
          contentType: isGated ? "private" : "public",
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
        ? type === "text"
          ? Boolean(title.trim() && content.trim())
          : Boolean(title.trim() && uploadedUrl)
        : step === 2
          ? visibility !== "tier" || requiredTierIds.length > 0
          : true;

  const goNext = () => {
    if (!canNext) {
      if (step === 1) {
        toast.error(
          type === "text"
            ? "Please add a title and content."
            : "Please add a title and upload a media file.",
        );
      } else if (step === 2) {
        toast.error("Select at least one membership tier.");
      }
      return;
    }
    next();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => back()}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-fg hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Back"
            tabIndex={step > 0 ? 0 : -1}
            style={step > 0 ? undefined : { pointerEvents: "none", opacity: 0.5 }}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <h1 className="text-heading font-bold tracking-tight text-fg">New Post</h1>
        </div>

        {step < STEPS.length - 1 && (
          <ol
            className="mb-8 flex items-center gap-2"
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
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums",
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
          <Card className="space-y-3 p-4 sm:p-6">
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
                      "flex min-h-16 w-full items-center gap-3 rounded-control border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
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
          <Card className="space-y-4 p-4 sm:p-6">
            <h2 className="text-title font-bold text-fg">{stepTitles[1]}</h2>

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
                className="mt-1.5 min-h-12 w-full rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"
                placeholder="Give your post a title"
              />
            </div>

            {type !== "text" && (
              <div className="space-y-3">
                <span className="block text-label font-semibold text-fg">
                  Upload {type}
                </span>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-control border-2 border-dashed border-line-strong bg-surface p-6 hover:border-brand-strong focus-visible:ring-2 focus-visible:ring-focus"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
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
                      if (file.type.startsWith("image/")) {
                        setFilePreview(URL.createObjectURL(file));
                      } else {
                        setFilePreview(null);
                      }
                      setIsUploading(true);
                      setUploadProgress(0);
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
                          isGated ? "private" : "public",
                          { onProgress: (pct) => setUploadProgress(pct) },
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
                        setUploadProgress(null);
                      }
                    }}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader
                        className="animate-spin text-brand-strong"
                        size={28}
                        aria-hidden="true"
                      />
                      <span className="text-caption font-semibold tabular-nums text-brand-strong">
                        Uploading{uploadProgress !== null ? ` (${uploadProgress}%)` : "..."}
                      </span>
                    </div>
                  ) : uploadedUrl ? (
                    <div className="flex items-center gap-2 font-semibold text-success">
                      <UploadCloud className="size-5" aria-hidden="true" /> File ready
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="size-7 text-muted-fg" aria-hidden="true" />
                      <p className="mt-2 text-label text-muted-fg">
                        Tap to add {type} media
                      </p>
                      <p className="mt-1 text-caption text-muted-fg">
                        {type === "video"
                          ? "Up to 100MB (MP4, MOV, WebM)"
                          : type === "document"
                            ? "Up to 25MB (PDF, DOC, DOCX)"
                            : "Up to 20MB (JPG, PNG, WebP)"}
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

            <div>
              <label
                htmlFor="composer-content"
                className="text-label font-semibold text-fg"
              >
                {type === "text" ? "Content" : "Caption (optional)"}
              </label>
              <textarea
                id="composer-content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  saveDraft({ content: e.target.value });
                }}
                rows={type === "text" ? 6 : 3}
                placeholder={
                  type === "text"
                    ? "Write your story..."
                    : "Add context or a caption for your audience..."
                }
                className="mt-1.5 min-h-24 w-full resize-none rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-fg placeholder:text-muted-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="space-y-4 p-4 sm:p-6">
            <h2 className="text-title font-bold text-fg">{stepTitles[2]}</h2>
            <AudienceSelector
              visibility={visibility}
              requiredTierIds={requiredTierIds}
              tiers={creator?.communityTiers || []}
              onChange={(nextAudience) => {
                setVisibility(nextAudience.visibility);
                setRequiredTierIds(nextAudience.requiredTierIds);
                setRequiredTierNames(nextAudience.requiredTierNames);
                saveDraft(nextAudience);
              }}
            />
            {uploadedUrl &&
              ((isGated && uploadedVisibility !== "private") ||
                (!isGated && uploadedVisibility === "private")) && (
                <p
                  role="alert"
                  className="rounded-control bg-warning-bg p-3 text-caption font-medium text-warning"
                >
                  Because you changed audience between public and gated, return to Content and re-upload the media file so storage matches.
                </p>
              )}
          </Card>
        )}

        {step === 3 && (
          <Card className="space-y-4 p-4 sm:p-6">
            <h2 className="text-title font-bold text-fg">{stepTitles[3]}</h2>
            <div className="space-y-2 rounded-control border border-line bg-surface-raised p-4">
              <div className="flex items-center justify-between gap-3 text-label">
                <span className="text-muted-fg">Type</span>
                <span className="font-semibold capitalize text-fg">{type}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-label">
                <span className="text-muted-fg">Title</span>
                <span className="font-semibold text-fg">{title || "—"}</span>
              </div>
              {content.trim() && (
                <div className="flex items-center justify-between gap-3 text-label">
                  <span className="text-muted-fg">
                    {type === "text" ? "Body" : "Caption"}
                  </span>
                  <span className="font-semibold tabular-nums text-fg">
                    {content.trim().length} chars
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
                <span className="text-muted-fg">Audience</span>
                <span className="font-semibold text-fg">
                  {formatVisibilityLabel(visibility, requiredTierNames)}
                </span>
              </div>
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
