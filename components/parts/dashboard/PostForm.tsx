"use client";

import { useState, useRef } from "react";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Loader,
  ArrowLeft,
  UploadCloud,
  Lock,
  Globe,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/uploadService";

export default function PostForm() {
  const { creator } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    type: "text",
    isPrivate: true,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    }

    setIsUploading(true);
    setUploadedUrl("");

    try {
      const assetType = newPost.type === "video" ? "post_video" : newPost.type === "document" ? "post_document" : "post_image";
      const data = await uploadFile(file, assetType, creator?.handle || "");
      if (data.url) {
        setUploadedUrl(data.url);
        toast.success("File uploaded successfully!");
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload file");
      setFilePreview(null);
      setUploadedUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setNewPost({ title: "", description: "", type: "text", isPrivate: true });
    setFilePreview(null);
    setUploadedUrl("");
  };

  const handleSubmit = async () => {
    if (!creator?.uid || !newPost.title || !creator?.handle) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsUploading(true);
    try {
      const contentData = {
        creatorId: creator.handle,
        creatorUid: creator.uid,
        title: newPost.title,
        description: newPost.description,
        type: newPost.type,
        contentUrl: uploadedUrl,
        isPrivate: newPost.isPrivate,
        createdAt: serverTimestamp(),
        views: 0,
      };

      const docRef = await addDoc(collection(db, "creatorContent"), contentData);
      toast.success("Content published!");

      try {
        const response = await sendCommsEmail("content_new", {
          creatorId: creator.handle,
          creatorName: creator?.name || "Creator",
          creatorHandle: creator?.handle,
          contentTitle: newPost.title,
          contentDescription: newPost.description,
          contentType: newPost.isPrivate ? "private" : "public",
          contentId: docRef.id,
        });
        if (response.success && response.recipientCount > 0) {
          toast.success(`Notified ${response.recipientCount} supporter(s) about your new content!`);
        }
      } catch (notifyError) {
        console.error("Failed to notify supporters:", notifyError);
      }

      resetForm();
      router.push("/creator/content");
    } catch (error) {
      toast.error("Failed to save post.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/creator/content")}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            New Post
          </h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 space-y-8">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            {["text", "video", "image", "document"].map((t) => (
              <button
                key={t}
                onClick={() => { resetForm(); setNewPost({ ...newPost, type: t }); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase ${
                  newPost.type === t ? "bg-card text-orange-600 shadow" : "text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {newPost.type !== "text" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-orange-400 transition"
            >
              <input
                type="file"
                ref={fileInputRef}
                hidden
                onChange={handleFileChange}
                accept={newPost.type === "image" ? "image/*" : newPost.type === "video" ? "video/*" : ".pdf,.doc,.docx"}
              />
              {isUploading ? (
                <Loader className="animate-spin text-orange-500" size={24} />
              ) : uploadedUrl ? (
                <div className="text-green-600 text-sm font-medium">File ready</div>
              ) : (
                <>
                  <UploadCloud size={24} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload {newPost.type}</p>
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Post Title
            </label>
            <input
              type="text"
              placeholder="Post Title"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="w-full bg-muted p-4 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
              Content
            </label>
            <textarea
              placeholder="Write your content..."
              value={newPost.description}
              onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
              className="w-full bg-muted p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-100 resize-none h-32"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${newPost.isPrivate ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                {newPost.isPrivate ? <Lock size={18} /> : <Globe size={18} />}
              </div>
              <span className="text-sm font-medium">{newPost.isPrivate ? "Supporters Only" : "Public"}</span>
            </div>
            <button
              onClick={() => setNewPost({ ...newPost, isPrivate: !newPost.isPrivate })}
              className="text-xs text-orange-600 font-medium px-3 py-1.5 bg-card border border-orange-200 rounded-lg hover:bg-orange-50"
            >
              Change
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/creator/content")}
              className="flex-1 py-4 border-2 border-border rounded-xl font-bold text-sm hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newPost.title || isUploading}
              className="flex-[2] bg-foreground text-background py-4 rounded-xl font-bold text-lg hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? <Loader className="animate-spin" size={20} /> : null}
              {isUploading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
