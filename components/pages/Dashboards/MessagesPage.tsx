"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { useSearchParams } from "next/navigation";
import {
  Send,
  MessageSquare,
  ArrowLeft,
  Ban,
  CheckCircle,
  Settings,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDocs,
  Timestamp,
  writeBatch,
  startAfter,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  encrypt,
  decryptChatMessage,
  decryptChatroomLastMessage,
} from "@/lib/generalWorkerService";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

interface Chatroom {
  id: string;
  supporterId: string;
  supporterName: string;
  supporterPhoto?: string;
  lastMessage?: string;
  lastMessageAt: Timestamp | null;
  unreadCount: number;
  createdAt: Timestamp | null;
  enabled: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "creator" | "supporter";
  content: string;
  createdAt: Timestamp | null;
  read: boolean;
}

export function CreatorMessagesPanel({
  embedded = false,
  onUnreadChange,
}: {
  embedded?: boolean;
  onUnreadChange?: (count: number) => void;
}) {
  const { creator } = useAuth();
  const searchParams = useSearchParams();
  const initialChatId = searchParams.get("chat");

  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setDecryptedRooms] = useState<Set<string>>(new Set());
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const decryptedCache = useRef<Map<string, string>>(new Map());
  const oldestCursorRef = useRef<{ createdAt: Timestamp; id: string } | null>(null);

  const decryptMessage = async (chatroomId: string, id: string): Promise<string> => {
    const cached = decryptedCache.current.get(id);
    if (cached) return cached;
    try {
      const plaintext = await decryptChatMessage(chatroomId, id);
      if (plaintext) {
        decryptedCache.current.set(id, plaintext);
        return plaintext;
      }
    } catch {
      /* ignore */
    }
    return "";
  };

  const encryptMessage = encrypt;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!creator?.uid) return;

    const chatroomsRef = collection(db, "chatrooms");
    const q = query(
      chatroomsRef,
      where("creatorId", "==", creator.uid),
      orderBy("updatedAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chatroom[];
      setChatrooms(rooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [creator?.uid]);

  useEffect(() => {
    if (!onUnreadChange) return;
    const total = chatrooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
    onUnreadChange(total);
  }, [chatrooms, onUnreadChange]);

  // Warm up decryption cache for chatroom sidebar and trigger re-render when done
  useEffect(() => {
    if (chatrooms.length === 0) return;
    const todo = chatrooms.filter(
      (c) =>
        c.lastMessage &&
        c.lastMessage.includes(":") &&
        !decryptedCache.current.has(`room_${c.id}`),
    );
    if (todo.length === 0) return;
    Promise.all(
      todo.map(async (chat) => {
        const key = `room_${chat.id}`;
        try {
          const plaintext = await decryptChatroomLastMessage(chat.id);
          if (plaintext) decryptedCache.current.set(key, plaintext);
        } catch {
          /* ignore */
        }
      }),
    ).then(() => {
      setDecryptedRooms(new Set(todo.map((c) => c.id)));
    });
  }, [chatrooms]);

  useEffect(() => {
    if (!selectedChatId) {
      queueMicrotask(() => setMessages([]));
      return;
    }

    queueMicrotask(() => {
      setMessagesLoading(true);
      setMessages([]);
      setHasMoreMessages(false);
    });
    oldestCursorRef.current = null;

    const messagesRef = collection(db, "chatrooms", selectedChatId, "messages");
    const recentQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      orderBy("__name__", "desc"),
      limit(10),
    );

    const unsubscribe = onSnapshot(recentQuery, (snapshot) => {
      const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);

      const displayMsgs = raw.map((m) => {
        const cached = decryptedCache.current.get(m.id);
        if (cached) return { ...m, content: cached };
        if (m.content?.includes(":")) return { ...m, content: "" };
        return m;
      });
      setMessages(displayMsgs);

      const uncached = raw.filter(
        (m) => m.content?.includes(":") && !decryptedCache.current.has(m.id),
      );

      if (uncached.length > 0) {
        setDecryptingIds(new Set(uncached.map((m) => m.id)));

        Promise.all(
          uncached.map(async (msg) => {
            const plaintext = await decryptMessage(selectedChatId, msg.id);
            return { id: msg.id, content: plaintext };
          }),
        ).then((results) => {
          setDecryptingIds(new Set());
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const r of results) {
              if (map.has(r.id)) {
                map.set(r.id, { ...map.get(r.id)!, content: r.content });
              }
            }
            const all = Array.from(map.values());
            all.sort(
              (a, b) =>
                (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0),
            );
            if (all.length > 0) {
              oldestCursorRef.current = {
                createdAt: all[0].createdAt as Timestamp,
                id: all[0].id,
              };
              setHasMoreMessages(true);
            }
            return all;
          });
          setMessagesLoading(false);
          scrollToBottom();
        });
      } else {
        setMessagesLoading(false);
        if (raw.length > 0) {
          const sorted = [...raw].sort(
            (a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0),
          );
          oldestCursorRef.current = {
            createdAt: sorted[0].createdAt as Timestamp,
            id: sorted[0].id,
          };
          setHasMoreMessages(true);
        }
        scrollToBottom();
      }
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  // Mark unread supporter messages as read (separate from snapshot to avoid re-trigger loop)
  useEffect(() => {
    if (!selectedChatId || messages.length === 0) return;

    const unreadMsgs = messages.filter((m) => m.senderType === "supporter" && !m.read);
    if (unreadMsgs.length === 0) return;

    const batch = writeBatch(db);
    for (const msg of unreadMsgs) {
      batch.update(doc(db, "chatrooms", selectedChatId, "messages", msg.id), {
        read: true,
      });
    }
    batch.update(doc(db, "chatrooms", selectedChatId), { unreadCount: 0 });
    batch.commit();
  }, [messages, selectedChatId]);

  const loadMoreMessages = async () => {
    if (!selectedChatId || loadingMore || !oldestCursorRef.current) return;
    setLoadingMore(true);
    try {
      const messagesRef = collection(db, "chatrooms", selectedChatId, "messages");
      const q = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        orderBy("__name__", "desc"),
        limit(10),
        startAfter(oldestCursorRef.current.createdAt, oldestCursorRef.current.id),
      );
      const snapshot = await getDocs(q);
      const rawOlder = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);

      const displayOlder = rawOlder.map((m) => {
        const cached = decryptedCache.current.get(m.id);
        if (cached) return { ...m, content: cached };
        if (m.content?.includes(":")) return { ...m, content: "" };
        return m;
      });
      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        for (const m of displayOlder) map.set(m.id, m);
        const all = Array.from(map.values());
        all.sort(
          (a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0),
        );
        if (all.length > 0) {
          oldestCursorRef.current = {
            createdAt: all[0].createdAt as Timestamp,
            id: all[0].id,
          };
        }
        setHasMoreMessages(rawOlder.length === 10);
        return all;
      });

      const uncached = rawOlder.filter(
        (m) => m.content?.includes(":") && !decryptedCache.current.has(m.id),
      );
      if (uncached.length > 0) {
        setDecryptingIds((prev) => {
          const next = new Set(prev);
          for (const m of uncached) next.add(m.id);
          return next;
        });
        Promise.all(
          uncached.map(async (msg) => {
            const plaintext = await decryptMessage(selectedChatId, msg.id);
            return { id: msg.id, content: plaintext };
          }),
        ).then((results) => {
          setDecryptingIds((prev) => {
            const next = new Set(prev);
            for (const r of results) next.delete(r.id);
            return next;
          });
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const r of results) {
              if (map.has(r.id)) {
                map.set(r.id, { ...map.get(r.id)!, content: r.content });
              }
            }
            return Array.from(map.values()).sort(
              (a, b) =>
                (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0),
            );
          });
        });
      }
    } catch (e) {
      console.error("Failed to load older messages:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId || !creator?.name) return;

    setSending(true);
    try {
      const encryptedContent = await encryptMessage(newMessage.trim());
      const encryptedLastMessage = await encryptMessage(newMessage.trim());

      const messagesRef = collection(db, "chatrooms", selectedChatId, "messages");
      await addDoc(messagesRef, {
        senderId: creator.uid,
        senderName: creator.name,
        senderType: "creator",
        content: encryptedContent,
        createdAt: serverTimestamp(),
        read: false,
      });

      await updateDoc(doc(db, "chatrooms", selectedChatId), {
        lastMessage: encryptedLastMessage,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const selectedChatroom = chatrooms.find((c) => c.id === selectedChatId);
  const messagingPaused = creator?.messagingEnabled === false;

  const toggleChatroomEnabled = async (chatroomId: string, currentEnabled: boolean) => {
    try {
      await updateDoc(doc(db, "chatrooms", chatroomId), {
        enabled: !currentEnabled,
        updatedAt: serverTimestamp(),
      });
      toast.success(currentEnabled ? "Conversation muted" : "Conversation enabled");
    } catch (error) {
      console.error("Error toggling chatroom:", error);
      toast.error("Failed to update conversation");
    }
  };

  const filteredChatrooms = chatrooms.filter((chat) =>
    chat.supporterName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-card border border-line bg-surface p-6",
          embedded ? "h-[520px]" : "min-h-[calc(100vh-70px)]",
        )}
      >
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-72 w-full" rounded="card" />
        </div>
      </div>
    );
  }

  if (messagingPaused && chatrooms.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="size-6" aria-hidden="true" />}
        title="Direct messaging is paused"
        description="Enable Direct Messaging in Settings so supporters can reach out to you privately."
        action={
          <Link
            href="/creator/settings?tab=messaging"
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            <Settings className="size-4" aria-hidden="true" />
            <span>Open Messaging Settings</span>
          </Link>
        }
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-surface",
        embedded
          ? "h-[calc(100dvh-18rem)] min-h-[500px] max-h-[720px] rounded-card border border-line"
          : "min-h-[calc(100vh-70px)]",
      )}
    >
      {messagingPaused && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-warning-bg/70 px-4 py-2.5 text-caption text-warning">
          <span>
            New supporter message requests are currently paused in Settings.
          </span>
          <Link
            href="/creator/settings?tab=messaging"
            className="font-semibold underline underline-offset-2"
          >
            Enable in Settings
          </Link>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "w-full flex-col border-r border-line bg-surface-raised/40 md:flex md:w-80 lg:w-96",
            selectedChatroom ? "hidden" : "flex",
          )}
        >
          <div className="border-b border-line p-4 sm:p-5">
            {!embedded && (
              <h1 className="mb-4 font-display text-title font-bold text-fg">
                Messages
              </h1>
            )}
            <SearchInput
              aria-label="Search conversations"
              placeholder="Search supporters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {filteredChatrooms.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="size-6" aria-hidden="true" />}
                title={searchQuery ? "No conversations found" : "No messages yet"}
                description={
                  searchQuery
                    ? "Try a different search term"
                    : "Supporters will appear here once they message you."
                }
              />
            ) : (
              // eslint-disable-next-line react-hooks/refs
              filteredChatrooms.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-control p-3.5 text-left outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-focus",
                    selectedChatId === chat.id
                      ? "border border-line bg-surface shadow-sm"
                      : "hover:bg-surface-raised",
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar src={chat.supporterPhoto} name={chat.supporterName} size="md" />
                    {chat.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-brand-strong text-caption font-bold tabular-nums text-on-brand">
                        {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden text-left">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-label font-bold text-fg">
                        {chat.supporterName}
                      </span>
                      <span className="shrink-0 text-caption tabular-nums text-muted-fg">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "truncate text-caption",
                        chat.unreadCount > 0 ? "font-semibold text-fg" : "text-muted-fg",
                      )}
                    >
                      {decryptedCache.current.get(`room_${chat.id}`) ||
                        chat.lastMessage ||
                        "No messages yet"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div
          className={cn(
            "min-w-0 flex-1 flex-col bg-surface",
            selectedChatroom ? "flex" : "hidden md:flex",
          )}
        >
          {selectedChatroom ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-raised/50 px-4 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <IconButton
                    label="Back to conversations"
                    icon={<ArrowLeft />}
                    variant="ghost"
                    onClick={() => setSelectedChatId(null)}
                    className="md:hidden"
                  />
                  <Avatar
                    src={selectedChatroom.supporterPhoto}
                    name={selectedChatroom.supporterName}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-body font-bold text-fg">
                      {selectedChatroom.supporterName}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        tone={selectedChatroom.enabled !== false ? "success" : "danger"}
                      >
                        {selectedChatroom.enabled !== false ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <IconButton
                  label={
                    selectedChatroom.enabled !== false
                      ? "Pause messages from this supporter"
                      : "Enable messages from this supporter"
                  }
                  icon={selectedChatroom.enabled !== false ? <Ban /> : <CheckCircle />}
                  onClick={() =>
                    toggleChatroomEnabled(
                      selectedChatroom.id,
                      selectedChatroom.enabled !== false,
                    )
                  }
                  className={
                    selectedChatroom.enabled !== false
                      ? "hover:text-danger"
                      : "hover:text-success"
                  }
                />
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-surface-raised/30 p-4 sm:p-6">
                {messagesLoading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex w-full max-w-[80%] gap-3">
                        <div className={`flex-1 ${i % 2 === 0 ? "ml-auto" : ""}`}>
                          <Skeleton className="h-12 w-full" rounded="card" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <EmptyState
                      icon={<MessageSquare className="size-6" aria-hidden="true" />}
                      title="Start the conversation"
                      description={`Send your first message to ${
                        selectedChatroom.supporterName.split(" ")[0]
                      }.`}
                    />
                  </div>
                ) : (
                  <>
                    {hasMoreMessages && (
                      <div className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadMoreMessages}
                          loading={loadingMore}
                        >
                          {loadingMore ? "Loading..." : "Load older messages"}
                        </Button>
                      </div>
                    )}
                    <div ref={messagesTopRef} />
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === "creator" ? "justify-end" : "justify-start"}`}
                      >
                        {decryptingIds.has(msg.id) ? (
                          <div
                            className={`w-48 max-w-[80%] space-y-2 rounded-card px-4 py-3 ${
                              msg.senderType === "creator"
                                ? "rounded-br-md bg-brand-soft"
                                : "rounded-bl-md border border-line bg-surface-raised"
                            }`}
                          >
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-2 w-1/4" />
                          </div>
                        ) : (
                          <div
                            className={`max-w-[85%] rounded-card px-4 py-3 sm:max-w-[75%] ${
                              msg.senderType === "creator"
                                ? "rounded-br-md bg-brand-strong text-on-brand"
                                : "rounded-bl-md border border-line bg-surface text-fg shadow-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-label">{msg.content}</p>
                            <p
                              className={`mt-1 text-caption tabular-nums ${
                                msg.senderType === "creator"
                                  ? "text-on-brand/70"
                                  : "text-muted-fg"
                              }`}
                            >
                              {msg.createdAt?.toDate?.().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) || "Sending..."}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <footer className="border-t border-line bg-surface p-3 sm:p-4">
                <div className="flex items-center gap-2 rounded-card bg-surface-raised p-1.5 pl-3">
                  <Input
                    containerClassName="min-w-0 flex-1"
                    type="text"
                    aria-label="Reply message"
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={sending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    loading={sending}
                    size="sm"
                    aria-label="Send message"
                  >
                    {sending ? null : <Send className="size-4" aria-hidden="true" />}
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <EmptyState
              className="m-auto"
              icon={<MessageSquare className="size-10 opacity-30" aria-hidden="true" />}
              title="Select a conversation"
              description="Choose a supporter from the list to read or reply to their messages."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return <CreatorMessagesPanel />;
}
