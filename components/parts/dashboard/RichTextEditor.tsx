"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Unlink,
  ImagePlus,
  Video,
  Minus,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Undo2,
  Redo2,
  Loader,
  Captions,
  X,
  Trash2,
} from "lucide-react";
import { uploadFile } from "@/lib/uploadService";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { MediaNode, type MediaBlockAttrs, type MediaKind } from "./tiptap/MediaNode";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

type HeadingLevel = 1 | 2 | 3 | 4;

interface MediaModalState {
  kind: MediaKind;
  src: string;
  alt: string;
  caption: string;
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|avif|gif|bmp|svg)$/i;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.test(file.name);
}

function hasDraggedFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (dataTransfer.files && dataTransfer.files.length > 0) return true;
  return Array.from(dataTransfer.types || []).includes("Files");
}

function defaultAltFromFilename(name: string): string | null {
  const cleaned = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return cleaned || null;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your article...",
  disabled = false,
  onUploadingChange,
}: RichTextEditorProps) {
  const { creator } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadKind, setUploadKind] = useState<MediaKind | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);
  const [savingMedia, setSavingMedia] = useState(false);

  const uploading = uploadCount > 0;

  const ownerHandle = creator?.handle || creator?.uid || "";
  const ownerHandleRef = useRef(ownerHandle);
  const disabledRef = useRef(disabled);
  const onUploadingChangeRef = useRef(onUploadingChange);

  useEffect(() => {
    ownerHandleRef.current = ownerHandle;
  }, [ownerHandle]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onUploadingChangeRef.current = onUploadingChange;
  }, [onUploadingChange]);

  useEffect(() => {
    onUploadingChangeRef.current?.(uploading);
  }, [uploading]);

  const uploadDroppedImagesRef = useRef<
    (files: File[], dropPos: number | null) => Promise<void>
  >(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      MediaNode,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.isEmpty ? "" : ed.getHTML());
    },
    editorProps: {
      handleDrop(view, event, _slice, moved) {
        if (moved || disabledRef.current) return false;
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length === 0) return false;

        event.preventDefault();
        event.stopPropagation();
        dragDepthRef.current = 0;
        setIsDraggingFiles(false);

        const imageFiles = files.filter(isImageFile);
        if (imageFiles.length === 0) {
          toast.error("Only image files can be dropped into the editor.");
          return true;
        }

        const coords = { left: event.clientX, top: event.clientY };
        const dropPos = view.posAtCoords(coords)?.pos ?? null;
        void uploadDroppedImagesRef.current(imageFiles, dropPos);
        return true;
      },
      handlePaste(_view, event) {
        if (disabledRef.current) return false;
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        const fromFiles = Array.from(clipboard.files || []).filter(isImageFile);
        const fromItems =
          fromFiles.length > 0
            ? fromFiles
            : Array.from(clipboard.items || [])
                .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
                .map((item) => item.getAsFile())
                .filter((f): f is File => f !== null);

        if (fromItems.length === 0) return false;
        // Let HTML paste proceed when clipboard carries formatted rich content
        if (clipboard.getData("text/html")) return false;

        event.preventDefault();
        void uploadDroppedImagesRef.current(fromItems, null);
        return true;
      },
    },
  });

  useEffect(() => {
    uploadDroppedImagesRef.current = async (
      files: File[],
      dropPos: number | null,
    ) => {
      if (!editor || disabledRef.current) return;
      const handle = ownerHandleRef.current;
      if (!handle) {
        toast.error("Creator profile is still loading. Please try again.");
        return;
      }

      const validFiles: File[] = [];
      for (const file of files) {
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(`"${file.name}" exceeds the 20MB image size limit.`);
          continue;
        }
        validFiles.push(file);
      }
      if (validFiles.length === 0) return;

      setUploadKind("image");
      setUploadCount((c) => c + validFiles.length);

      let insertPos = dropPos;
      let uploadedSuccessCount = 0;

      for (const file of validFiles) {
        try {
          const data = await uploadFile(file, "post_image", handle);
          if (!data.url) throw new Error("Upload failed");

          const nodePayload = {
            type: "mediaBlock",
            attrs: {
              kind: "image" as const,
              src: data.url,
              alt: defaultAltFromFilename(file.name),
              caption: null,
            },
          };

          if (insertPos != null) {
            const clamped = Math.max(
              0,
              Math.min(insertPos, editor.state.doc.content.size),
            );
            editor.chain().focus().insertContentAt(clamped, nodePayload).run();
            insertPos = editor.state.selection.to;
          } else {
            editor.chain().focus().insertContent(nodePayload).run();
          }

          onChange(editor.isEmpty ? "" : editor.getHTML());
          uploadedSuccessCount += 1;
        } catch (err: unknown) {
          console.error("Drag-and-drop upload error:", err);
          toast.error(
            err instanceof Error
              ? err.message
              : `Failed to upload "${file.name}"`,
          );
        } finally {
          setUploadCount((c) => Math.max(0, c - 1));
        }
      }

      setUploadKind((prev) => (prev === "image" ? null : prev));

      if (uploadedSuccessCount > 0) {
        toast.success(
          uploadedSuccessCount === 1
            ? "Image uploaded to R2 and inserted."
            : `${uploadedSuccessCount} images uploaded to R2 and inserted.`,
        );
      }
    };
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.isEmpty ? "" : editor.getHTML();
    if (content !== currentHtml && !editor.isFocused) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [editor, content]);

  if (!editor) return null;

  const setHeading = (level: HeadingLevel | null) => {
    editor.chain().focus().setParagraph().run();
    if (level) {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste a URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const findMediaPosition = (
    ed: NonNullable<typeof editor>,
    src: string,
  ): number | null => {
    let pos: number | null = null;
    ed.state.doc.descendants((node, nodePos) => {
      if (node.type.name === "mediaBlock" && node.attrs.src === src) {
        pos = nodePos;
        return false;
      }
      return true;
    });
    return pos;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadKind) return;

    const handle = ownerHandleRef.current;
    if (!handle) {
      toast.error("Creator profile is still loading. Please try again.");
      e.target.value = "";
      return;
    }

    const kind = uploadKind;
    setUploadCount((c) => c + 1);
    setUploadProgress(0);
    try {
      const assetType = kind === "video" ? "post_video" : "post_image";
      const data = await uploadFile(file, assetType, handle, undefined, "public", {
        onProgress: (pct) => setUploadProgress(pct),
      });
      if (!data.url) throw new Error("Upload failed");

      editor
        .chain()
        .focus()
        .setMediaBlock({
          kind,
          src: data.url,
        })
        .run();

      onChange(editor.isEmpty ? "" : editor.getHTML());

      const targetPos = findMediaPosition(editor, data.url);
      if (targetPos != null) {
        editor.chain().focus().setNodeSelection(targetPos).run();
        setMediaModal({
          kind,
          src: data.url,
          alt: "",
          caption: "",
        });
      }
      toast.success("Media added. Add a caption & alt text if needed.");
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload media",
      );
    } finally {
      setUploadCount((c) => Math.max(0, c - 1));
      setUploadKind(null);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const openCaptionModal = () => {
    if (!editor.isActive("mediaBlock")) return;
    const attrs = editor.getAttributes("mediaBlock") as Partial<MediaBlockAttrs>;
    setMediaModal({
      kind: attrs.kind === "video" ? "video" : "image",
      src: attrs.src || "",
      alt: attrs.alt || "",
      caption: attrs.caption || "",
    });
  };

  const saveCaptionModal = () => {
    if (!editor || !mediaModal) return;
    setSavingMedia(true);
    try {
      editor
        .chain()
        .focus()
        .updateAttributes("mediaBlock", {
          alt: mediaModal.alt.trim() || null,
          caption: mediaModal.caption.trim() || null,
        })
        .run();
      toast.success("Caption saved");
      setMediaModal(null);
    } catch {
      toast.error("Failed to save caption");
    } finally {
      setSavingMedia(false);
    }
  };

  const removeSelectedMedia = () => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().run();
    setMediaModal(null);
  };

  const triggerUpload = (kind: MediaKind) => {
    if (!editor || disabled) return;
    setUploadKind(kind);
    if (fileInputRef.current) {
      fileInputRef.current.accept = kind === "image" ? "image/*" : "video/*";
      fileInputRef.current.click();
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingFiles(false);
    }
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    if (disabled) return;

    // Fallback if dropped on the padding/overlay outside ProseMirror's text area
    if (!e.defaultPrevented) {
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length === 0) return;
      e.preventDefault();
      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) {
        toast.error("Only image files can be dropped into the editor.");
        return;
      }
      void uploadDroppedImagesRef.current(imageFiles, null);
    }
  };

  const toolButton = (
    active: boolean,
    onClick: () => void,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      key={label}
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center justify-center w-8 h-8 rounded-md transition ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:opacity-40`}
      disabled={!editor || disabled}
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card focus-within:ring-2 focus-within:ring-orange-100 dark:focus-within:ring-orange-900">
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-border bg-muted/50">
        {[
          toolButton(
            !editor.isActive("heading"),
            () => setHeading(null),
            "Paragraph",
            <Pilcrow key="p" size={16} />,
          ),
          toolButton(
            editor.isActive("heading", { level: 1 }),
            () => setHeading(1),
            "Heading 1",
            <Heading1 key="h1" size={16} />,
          ),
          toolButton(
            editor.isActive("heading", { level: 2 }),
            () => setHeading(2),
            "Heading 2",
            <Heading2 key="h2" size={16} />,
          ),
          toolButton(
            editor.isActive("heading", { level: 3 }),
            () => setHeading(3),
            "Heading 3",
            <Heading3 key="h3" size={16} />,
          ),
          toolButton(
            editor.isActive("heading", { level: 4 }),
            () => setHeading(4),
            "Heading 4",
            <Heading4 key="h4" size={16} />,
          ),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(
            editor.isActive("bold"),
            () => editor.chain().focus().toggleBold().run(),
            "Bold",
            <Bold key="b" size={16} />,
          ),
          toolButton(
            editor.isActive("italic"),
            () => editor.chain().focus().toggleItalic().run(),
            "Italic",
            <Italic key="i" size={16} />,
          ),
          toolButton(
            editor.isActive("underline"),
            () => editor.chain().focus().toggleUnderline().run(),
            "Underline",
            <Underline key="u" size={16} />,
          ),
          toolButton(
            editor.isActive("strike"),
            () => editor.chain().focus().toggleStrike().run(),
            "Strikethrough",
            <Strikethrough key="s" size={16} />,
          ),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(
            editor.isActive("bulletList"),
            () => editor.chain().focus().toggleBulletList().run(),
            "Bulleted list",
            <List key="ul" size={16} />,
          ),
          toolButton(
            editor.isActive("orderedList"),
            () => editor.chain().focus().toggleOrderedList().run(),
            "Numbered list",
            <ListOrdered key="ol" size={16} />,
          ),
          toolButton(
            editor.isActive("blockquote"),
            () => editor.chain().focus().toggleBlockquote().run(),
            "Quote",
            <Quote key="q" size={16} />,
          ),
          toolButton(
            editor.isActive("codeBlock"),
            () => editor.chain().focus().toggleCodeBlock().run(),
            "Code block",
            <Code key="c" size={16} />,
          ),
          toolButton(
            false,
            () => editor.chain().focus().setHorizontalRule().run(),
            "Divider",
            <Minus key="hr" size={16} />,
          ),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(
            editor.isActive("link"),
            setLink,
            "Add link",
            <Link2 key="link" size={16} />,
          ),
          toolButton(
            editor.isActive("link"),
            () => editor.chain().focus().unsetLink().run(),
            "Remove link",
            <Unlink key="unlink" size={16} />,
          ),
          toolButton(
            false,
            // eslint-disable-next-line react-hooks/refs
            () => triggerUpload("image"),
            "Upload image",
            <ImagePlus key="img" size={16} />,
          ),
          toolButton(
            false,
            // eslint-disable-next-line react-hooks/refs
            () => triggerUpload("video"),
            "Upload video",
            <Video key="vid" size={16} />,
          ),
          toolButton(
            editor.isActive("mediaBlock"),
            openCaptionModal,
            "Caption & alt text",
            <Captions key="cap" size={16} />,
          ),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(
            false,
            () => editor.chain().focus().undo().run(),
            "Undo",
            <Undo2 key="undo" size={16} />,
          ),
          toolButton(
            false,
            () => editor.chain().focus().redo().run(),
            "Redo",
            <Redo2 key="redo" size={16} />,
          ),
        ]}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*"
        onChange={handleFileUpload}
      />

      {uploading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-4 py-2 text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-b border-border"
        >
          <Loader size={14} className="animate-spin" />
          Uploading{" "}
          {uploadCount > 1 ? `${uploadCount} images` : uploadKind || "image"} to
          Agaseke
          {uploadProgress !== null ? ` (${uploadProgress}%)` : ""}...
        </div>
      )}

      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleContainerDrop}
      >
        <EditorContent editor={editor} className="article-editor" />
        {isDraggingFiles && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-500 bg-orange-50/90 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 backdrop-blur-[1px]"
          >
            <ImagePlus size={28} />
            <p className="text-sm font-semibold">
              Drop image to upload and insert
            </p>
          </div>
        )}
      </div>

      {mediaModal && (
        <div className="fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Captions size={18} className="text-orange-500" />
                {mediaModal.kind === "video"
                  ? "Video Caption"
                  : "Image Caption & Alt Text"}
              </h3>
              <button
                onClick={() => setMediaModal(null)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted max-h-48 flex items-center justify-center">
                {mediaModal.kind === "video" ? (
                  <video
                    src={mediaModal.src}
                    className="w-full max-h-48"
                    controls
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaModal.src}
                    alt="Uploaded media"
                    className="w-full max-h-48 object-contain"
                  />
                )}
              </div>

              {mediaModal.kind === "image" && (
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-1.5 block">
                    Alt text{" "}
                    <span className="normal-case font-medium">
                      (accessibility / SEO)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={mediaModal.alt}
                    onChange={(e) =>
                      setMediaModal((m) =>
                        m ? { ...m, alt: e.target.value } : m,
                      )
                    }
                    placeholder="Describe the image..."
                    className="w-full bg-muted p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-1.5 block">
                  Caption
                </label>
                <input
                  type="text"
                  value={mediaModal.caption}
                  onChange={(e) =>
                    setMediaModal((m) =>
                      m ? { ...m, caption: e.target.value } : m,
                    )
                  }
                  placeholder="Optional caption shown under the media..."
                  className="w-full bg-muted p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center gap-2">
              <button
                onClick={removeSelectedMedia}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition"
              >
                <Trash2 size={16} /> Remove
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setMediaModal(null)}
                className="px-4 py-2.5 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={saveCaptionModal}
                disabled={savingMedia}
                className="px-5 py-2.5 bg-foreground text-background rounded-xl font-bold text-sm hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingMedia && <Loader size={14} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}