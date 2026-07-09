"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import { useAuth } from "@/auth/AuthContext";
import { uploadFile as uploadFileToWorker } from "@/lib/uploadService";
import {
  Loader,
  Send,
  Paperclip,
  Image,
  Video,
  FileText,
  X,
  ArrowLeft,
  Crown,
  Users,
  Camera,
} from "lucide-react";
import { LinkifyText } from "@/components/ui/LinkifyText";
import { MediaPreview } from "./MediaPreview";
import { getChatId } from "@/lib/communityChatService";

interface ChatAttachment {
  url: string;
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
  createdAt: any;
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

function formatFullTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function isImageType(mime: string): boolean {
  return mime.startsWith("image/");
}

function isVideoType(mime: string): boolean {
  return mime.startsWith("video/");
}

function isDocumentType(mime: string): boolean {
  return !isImageType(mime) && !isVideoType(mime);
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<ChatAttachment | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [chatTierName, setChatTierName] = useState(tierName || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatId = getChatId(creatorHandle, tierId);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const chatRef = doc(db, "communityChats", chatId);
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.tierName) setChatTierName(data.tierName);
      }
      if (isCreator) {
        setCanAccess(true);
        return;
      }
      const memberRef = doc(db, "communityChats", chatId, "members", user.uid);
      const memberSnap = await getDoc(memberRef);
      setCanAccess(memberSnap.exists() && memberSnap.data().status === "active");
    };
    init();
  }, [user, chatId, isCreator]);

  useEffect(() => {
    setMessagesLoading(true);
    const messagesRef = collection(db, "communityChats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderType: data.senderType,
          text: data.text,
          attachments: data.attachments,
          createdAt: data.createdAt,
        });
      });
      setMessages(list);
      setMessagesLoading(false);
    }, () => setMessagesLoading(false));
    return unsub;
  }, [chatId]);

  useEffect(() => {
    const membersRef = collection(db, "communityChats", chatId, "members");
    const unsub = onSnapshot(membersRef, (snap) => {
      let count = 0;
      snap.forEach((d) => {
        if (d.data().status === "active") count++;
      });
      setMemberCount(count);
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = useCallback(async (file: File): Promise<ChatAttachment | null> => {
    setUploading(true);
    try {
      const result = await uploadFileToWorker(file, "message_attachment", creatorHandle);
      return {
        url: result.url,
        mimeType: file.type,
        originalName: file.name,
        fileSize: file.size,
      };
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    } finally {
      setUploading(false);
    }
  }, [creatorHandle]);

  const handleSendText = async () => {
    if (!inputText.trim() || !user || sending) return;
    setSending(true);
    try {
      const messagesRef = collection(db, "communityChats", chatId, "messages");
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "Member",
        senderType: isCreator ? "creator" : "member",
        text: inputText.trim(),
        createdAt: serverTimestamp(),
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
    if (!file) return;
    setShowAttachMenu(false);
    const attachment = await handleFileUpload(file);
    if (!attachment) return;
    setSending(true);
    try {
      const messagesRef = collection(db, "communityChats", chatId, "messages");
      await addDoc(messagesRef, {
        senderId: user!.uid,
        senderName: user!.displayName || user!.email?.split("@")[0] || "Member",
        senderType: isCreator ? "creator" : "member",
        attachments: [attachment],
        createdAt: serverTimestamp(),
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
        <Crown size={48} className="text-muted-foreground mb-4" />
        <h3 className="font-bold text-lg mb-2">Subscription Required</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You need an active subscription to access this community chat.
        </p>
        <button onClick={onBack} className="text-orange-600 font-medium underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-muted rounded-lg transition -ml-1"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate">{chatTierName || "Community"} Chat</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users size={12} />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>
        <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded uppercase tracking-wider">
          {isCreator ? "Creator" : "Member"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messagesLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="animate-spin text-orange-500" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Crown size={40} className="text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start the conversation!
            </p>
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
                  <span className="text-[10px] text-muted-foreground mb-1 px-1 font-medium">
                    {showSender}
                  </span>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-orange-600 text-white rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
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
                          className="block w-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <img
                            src={att.url}
                            alt={att.originalName}
                            className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </button>
                      ) : isVideoType(att.mimeType) ? (
                        <video
                          src={att.url}
                          controls
                          controlsList="nodownload"
                          className="w-full rounded-lg max-h-64"
                          preload="metadata"
                        >
                          <source src={att.url} type={att.mimeType} />
                        </video>
                      ) : (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.originalName}
                          className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition"
                        >
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={20} className="text-orange-600" />
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
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.createdAt?.toDate ? formatTime(msg.createdAt.toDate()) : ""}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border p-3 shrink-0">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Loader className="animate-spin" size={14} />
            Uploading...
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={uploading || sending}
              className="p-2.5 hover:bg-muted rounded-full transition disabled:opacity-50"
            >
              <Paperclip size={20} className="text-muted-foreground" />
            </button>
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl p-2 flex gap-1">
                <button
                  onClick={() => {
                    fileInputRef.current!.accept = "image/*";
                    fileInputRef.current!.capture = "environment" as any;
                    fileInputRef.current!.click();
                    setShowAttachMenu(false);
                  }}
                  className="p-3 hover:bg-muted rounded-lg transition flex flex-col items-center gap-1"
                >
                  <Image size={20} className="text-blue-500" />
                  <span className="text-[10px] text-muted-foreground">Photo</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current!.accept = "video/*";
                    fileInputRef.current!.capture = "environment" as any;
                    fileInputRef.current!.click();
                    setShowAttachMenu(false);
                  }}
                  className="p-3 hover:bg-muted rounded-lg transition flex flex-col items-center gap-1"
                >
                  <Video size={20} className="text-purple-500" />
                  <span className="text-[10px] text-muted-foreground">Video</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current!.accept = ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx";
                    fileInputRef.current!.removeAttribute("capture");
                    fileInputRef.current!.click();
                    setShowAttachMenu(false);
                  }}
                  className="p-3 hover:bg-muted rounded-lg transition flex flex-col items-center gap-1"
                >
                  <FileText size={20} className="text-orange-500" />
                  <span className="text-[10px] text-muted-foreground">File</span>
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div className="flex-1 relative">
            <input
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
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 transition disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSendText}
            disabled={!inputText.trim() || sending || uploading}
            className="p-2.5 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition disabled:opacity-50 shrink-0"
          >
            {sending ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
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
