"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { uploadFile as uploadFileToWorker } from "@/lib/uploadService";
import {
  Loader,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  ArrowLeft,
  Crown,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { CustomVideoPlayer } from "@/components/media/CustomVideoPlayer";
import { MediaPreview } from "./MediaPreview";
import {
  addCommunityChatMessage,
  getChatId,
  getCommunityChatAccess,
  subscribeToCommunityChatMemberCount,
  subscribeToCommunityChatMessages,
} from "@/lib/communityChatService";

interface ChatAttachment {
  url: string;
  publicId?: string;
  mimeType: string;
  originalName: string;
  fileSize: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "creator" | "member";
  text?: string;
  attachments?: ChatAttachment[];
  createdAt: unknown;
}

interface CommunityChatViewProps {
  creatorHandle: string;
  tierId: string;
  tierName: string;
  isCreator: boolean;
  onBack: () => void;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isImageType(mime: string): boolean {
  return mime.startsWith("image/");
}

function isVideoType(mime: string): boolean {
  return mime.startsWith("video/");
}

export function CommunityChatView({
  creatorHandle,
  tierId,
  tierName,
  isCreator,
  onBack,
}: CommunityChatViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<ChatAttachment | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [chatTierName, setChatTierName] = useState(tierName || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatId = getChatId(creatorHandle, tierId);

  useEffect(() => {
    if (!user && !isCreator) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no auth context
      setCanAccess(false);
      return;
    }
    void getCommunityChatAccess(chatId, user?.uid ?? null, isCreator).then((access) => {
      setCanAccess(access.canAccess);
      if (access.tierName) setChatTierName(access.tierName);
    });
  }, [user, chatId, isCreator]);

  /* eslint-disable react-hooks/set-state-in-effect -- subscribe to chat messages */
  useEffect(() => {
    setMessagesLoading(true);
    const unsub = subscribeToCommunityChatMessages(
      chatId,
      (list) => {
        setMessages(list as Message[]);
        setMessagesLoading(false);
      },
      () => setMessagesLoading(false),
    );
    return unsub;
  }, [chatId]);

  useEffect(() => {
    const unsub = subscribeToCommunityChatMemberCount(chatId, setMemberCount);
    return unsub;
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = useCallback(
    async (file: File): Promise<ChatAttachment | null> => {
      setUploading(true);
      setUploadProgress(0);
      try {
        const result = await uploadFileToWorker(
          file,
          "message_attachment",
          creatorHandle,
          undefined,
          "public",
          { onProgress: (pct) => setUploadProgress(pct) },
        );
        const r = result as { url?: string; publicId?: string; public_id?: string };
        return {
          url: r.url || "",
          publicId: r.publicId || r.public_id || "",
          mimeType: file.type,
          originalName: file.name,
          fileSize: file.size,
        };
      } catch (err) {
        console.error("Upload failed:", err);
        toast.error(err instanceof Error ? err.message : "Upload failed");
        return null;
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [creatorHandle],
  );

  const handleSendText = async () => {
    if (!inputText.trim() || !user || sending) return;
    setSending(true);
    try {
      await addCommunityChatMessage(chatId, {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "Member",
        senderType: isCreator ? "creator" : "member",
        text: inputText.trim(),
      });
      setInputText("");
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setShowAttachMenu(false);
    const attachment = await handleFileUpload(file);
    if (!attachment) return;
    setSending(true);
    try {
      await addCommunityChatMessage(chatId, {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "Member",
        senderType: isCreator ? "creator" : "member",
        attachments: [attachment],
      });
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getMessageSender = (msg: Message) => {
    if (isCreator && msg.senderType === "member") return msg.senderName;
    if (!isCreator && msg.senderType === "creator") return msg.senderName;
    return null;
  };

  if (canAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <Crown size={48} className="text-muted-fg mb-4" />
        <h3 className="font-bold text-lg mb-2">Subscription Required</h3>
        <p className="text-sm text-muted-fg mb-6">
          You need an active subscription to access this community chat.
        </p>
        <Button variant="ghost" size="sm" onClick={onBack} className="underline">
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] bg-canvas">
      <div className="sticky top-0 z-10 bg-surface border-b border-line px-4 py-3 flex items-center gap-3 shrink-0">
        <IconButton
          label="Back"
          icon={<ArrowLeft />}
          size="sm"
          className="-ml-1"
          onClick={onBack}
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate">
            {chatTierName || "Community"} Chat
          </h2>
          <p className="text-xs text-muted-fg flex items-center gap-1">
            <Users size={12} />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>
        <Badge tone="brand" className="uppercase tracking-wider">
          {isCreator ? "Creator" : "Member"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messagesLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="animate-spin text-brand-strong" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Crown size={40} className="text-muted-fg mb-3" />
            <p className="text-sm text-muted-fg">No messages yet</p>
            <p className="text-xs text-muted-fg mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === user?.uid;
            const showSender = getMessageSender(msg);
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                {showSender && (
                  <span className="text-caption text-muted-fg mb-1 px-1 font-medium">
                    {showSender}
                  </span>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-card px-4 py-2.5 ${
                    isOwn
                      ? "bg-brand-strong text-on-brand rounded-br-md"
                      : "bg-surface-sunken text-fg rounded-bl-md"
                  }`}
                >
                  {msg.text && (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      <LinkifyText text={msg.text} />
                    </p>
                  )}
                  {msg.attachments?.map((att, i) => (
                    <div key={i} className={msg.text ? "mt-2" : ""}>
                      {isImageType(att.mimeType) ? (
                        <button
                          onClick={() => setPreviewMedia(att)}
                          className="block w-full rounded-control overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-strong"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- community chat attachment */}
                          <img
                            src={att.url}
                            alt={att.originalName}
                            className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </button>
                      ) : isVideoType(att.mimeType) ? (
                        <CustomVideoPlayer
                          src={att.url}
                          title={att.originalName}
                          compact
                          allowReelOnMobile={false}
                          className="max-h-64 w-full"
                        />
                      ) : (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.originalName}
                          className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-control hover:bg-black/10 dark:hover:bg-white/10 transition"
                        >
                          <div className="w-10 h-10 bg-brand-soft dark:bg-brand-strong rounded-control flex items-center justify-center shrink-0">
                            <FileText size={20} className="text-brand-strong" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {att.originalName}
                            </p>
                            <p className="text-xs opacity-70">
                              {(att.fileSize / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-caption text-muted-fg mt-1 px-1">
                  {(() => {
                    const c = msg.createdAt as { toDate?: () => Date } | null | undefined;
                    return c?.toDate ? formatTime(c.toDate()) : "";
                  })()}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-surface border-t border-line p-3 shrink-0">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 text-caption text-muted-fg tabular-nums">
            <Loader className="animate-spin" size={14} />
            Uploading{uploadProgress !== null ? ` (${uploadProgress}%)` : ""}...
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative">
            <IconButton
              label="Attach file"
              icon={<Paperclip className="text-muted-fg" />}
              size="sm"
              disabled={uploading || sending}
              onClick={() => setShowAttachMenu(!showAttachMenu)}
            />
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-surface border border-line rounded-control shadow-xl p-2 flex gap-1">
                <Button
                  variant="ghost"
                  className="flex-col py-2 text-muted-fg"
                  onClick={() => {
                    fileInputRef.current!.accept = "image/*";
                    (
                      fileInputRef.current as HTMLInputElement & { capture?: string }
                    ).capture = "environment";
                    fileInputRef.current!.click();
                    setShowAttachMenu(false);
                  }}
                >
                  <ImageIcon size={20} className="text-info" />
                  <span>Photo</span>
                </Button>
                <Button
                  variant="ghost"
                  className="flex-col py-2 text-muted-fg"
                  onClick={() => {
                    fileInputRef.current!.accept = "video/*";
                    (
                      fileInputRef.current as HTMLInputElement & { capture?: string }
                    ).capture = "environment";
                    fileInputRef.current!.click();
                    setShowAttachMenu(false);
                  }}
                >
                  <Video size={20} className="text-chart-5" />
                  <span>Video</span>
                </Button>
                <Button
                  variant="ghost"
                  className="flex-col py-2 text-muted-fg"
                  onClick={() => {
                    fileInputRef.current!.accept =
                      ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx";
                    fileInputRef.current!.removeAttribute("capture");
                    fileInputRef.current!.click();
                    setShowAttachMenu(false);
                  }}
                >
                  <FileText size={20} className="text-brand-strong" />
                  <span>File</span>
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <Input
            containerClassName="flex-1 min-w-0"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="Type a message..."
            disabled={uploading || sending}
            className="bg-surface-sunken py-2.5"
          />
          <IconButton
            label="Send message"
            icon={<Send />}
            variant="primary"
            size="sm"
            loading={sending}
            disabled={!inputText.trim() || sending || uploading}
            onClick={handleSendText}
          />
        </div>
      </div>

      {previewMedia && (
        <MediaPreview
          url={previewMedia.url}
          mimeType={previewMedia.mimeType}
          originalName={previewMedia.originalName}
          onClose={() => setPreviewMedia(null)}
        />
      )}
    </div>
  );
}
