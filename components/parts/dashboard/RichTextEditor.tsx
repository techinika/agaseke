"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";
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
}

type HeadingLevel = 1 | 2 | 3 | 4;

interface MediaModalState {
  kind: MediaKind;
  src: string;
  alt: string;
  caption: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your article...",
  disabled = false,
}: RichTextEditorProps) {
  const { creator } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadKind, setUploadKind] = useState<MediaKind | null>(null);
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);
  const [savingMedia, setSavingMedia] = useState(false);

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
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creator?.handle || !uploadKind) return;

    setUploading(true);
    try {
      const assetType =
        uploadKind === "video" ? "post_video" : "post_image";
      const data = await uploadFile(file, assetType, creator.handle);
      if (!data.url) throw new Error("Upload failed");

      const inserted = editor.chain().focus().setMediaBlock({
        kind: uploadKind,
        src: data.url,
      }).run();

      const targetPos = findMediaPosition(editor, data.url);
      if (targetPos != null) {
        editor.chain().focus().setNodeSelection(targetPos).run();
        setMediaModal({
          kind: uploadKind,
          src: data.url,
          alt: "",
          caption: "",
        });
      }
      toast.success("Media added. Add a caption & alt text if needed.");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload media");
    } finally {
      setUploading(false);
      setUploadKind(null);
      e.target.value = "";
    }
  };

  const findMediaPosition = (ed: NonNullable<typeof editor>, src: string): number | null => {
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
      editor.chain().focus().updateAttributes("mediaBlock", {
        alt: mediaModal.alt.trim() || null,
        caption: mediaModal.caption.trim() || null,
      }).run();
      toast.success("Caption saved");
      setMediaModal(null);
    } catch (err) {
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
          toolButton(editor.isActive("heading", { level: 1 }), () => setHeading(1), "Heading 1", <Heading1 key="h1" size={16} />),
          toolButton(editor.isActive("heading", { level: 2 }), () => setHeading(2), "Heading 2", <Heading2 key="h2" size={16} />),
          toolButton(editor.isActive("heading", { level: 3 }), () => setHeading(3), "Heading 3", <Heading3 key="h3" size={16} />),
          toolButton(editor.isActive("heading", { level: 4 }), () => setHeading(4), "Heading 4", <Heading4 key="h4" size={16} />),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold", <Bold key="b" size={16} />),
          toolButton(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic", <Italic key="i" size={16} />),
          toolButton(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline", <Underline key="u" size={16} />),
          toolButton(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Strikethrough", <Strikethrough key="s" size={16} />),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bulleted list", <List key="ul" size={16} />),
          toolButton(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list", <ListOrdered key="ol" size={16} />),
          toolButton(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Quote", <Quote key="q" size={16} />),
          toolButton(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "Code block", <Code key="c" size={16} />),
          toolButton(false, () => editor.chain().focus().setHorizontalRule().run(), "Divider", <Minus key="hr" size={16} />),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(editor.isActive("link"), setLink, "Add link", <Link2 key="link" size={16} />),
          toolButton(editor.isActive("link"), () => editor.chain().focus().unsetLink().run(), "Remove link", <Unlink key="unlink" size={16} />),
          toolButton(false, () => triggerUpload("image"), "Upload image", <ImagePlus key="img" size={16} />),
          toolButton(false, () => triggerUpload("video"), "Upload video", <Video key="vid" size={16} />),
          toolButton(editor.isActive("mediaBlock"), openCaptionModal, "Caption & alt text", <Captions key="cap" size={16} />),
        ]}

        <div className="w-px h-6 bg-border mx-1" />

        {[
          toolButton(false, () => editor.chain().focus().undo().run(), "Undo", <Undo2 key="undo" size={16} />),
          toolButton(false, () => editor.chain().focus().redo().run(), "Redo", <Redo2 key="redo" size={16} />),
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
        <div className="flex items-center gap-2 px-4 py-2 text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-b border-border">
          <Loader size={14} className="animate-spin" />
          Uploading {uploadKind} to Agaseke...
        </div>
      )}

      <EditorContent editor={editor} className="article-editor" />

      {mediaModal && (
        <div className="fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Captions size={18} className="text-orange-500" />
                {mediaModal.kind === "video" ? "Video Caption" : "Image Caption & Alt Text"}
              </h3>
              <button onClick={() => setMediaModal(null)} className="p-2 hover:bg-muted rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted max-h-48 flex items-center justify-center">
                {mediaModal.kind === "video" ? (
                  <video src={mediaModal.src} className="w-full max-h-48" controls muted />
                ) : (
                  <img src={mediaModal.src} alt="Uploaded media" className="w-full max-h-48 object-contain" />
                )}
              </div>

              {mediaModal.kind === "image" && (
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-1.5 block">
                    Alt text <span className="normal-case font-medium">(accessibility / SEO)</span>
                  </label>
                  <input
                    type="text"
                    value={mediaModal.alt}
                    onChange={(e) => setMediaModal((m) => (m ? { ...m, alt: e.target.value } : m))}
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
                  onChange={(e) => setMediaModal((m) => (m ? { ...m, caption: e.target.value } : m))}
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