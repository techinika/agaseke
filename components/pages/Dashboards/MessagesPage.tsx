"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useSearchParams } from "next/navigation";
import {
  Send,
  MessageSquare,
  MoreVertical,
  ArrowLeft,
  Ban,
  CheckCircle,
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
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";

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

export default function MessagesPage() {
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

  const toggleChatroomEnabled = async (chatroomId: string, currentEnabled: boolean) => {
    try {
      await updateDoc(doc(db, "chatrooms", chatroomId), {
        enabled: !currentEnabled,
        updatedAt: serverTimestamp(),
      });
      toast.success(!currentEnabled ? "Chatroom disabled" : "Chatroom enabled");
    } catch (error) {
      console.error("Error toggling chatroom:", error);
      toast.error("Failed to update chatroom");
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
      <div className="flex min-h-[calc(100vh-70px)] items-center justify-center bg-canvas p-8">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-72 w-full" rounded="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-70px)] overflow-hidden bg-surface">
      <aside className="flex w-full flex-col border-r border-line bg-surface-raised/50 md:w-80 lg:w-96">
        <div className="p-6">
          <h1 className="mb-6 text-2xl font-bold uppercase">Messages</h1>
          <SearchInput
            placeholder="Search supporters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3">
          {filteredChatrooms.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="size-6" aria-hidden="true" />}
              title={searchQuery ? "No conversations found" : "No messages yet"}
              description={
                searchQuery
                  ? "Try a different search term"
                  : "Supporters will appear here once they message you"
              }
            />
          ) : (
            // eslint-disable-next-line react-hooks/refs
            filteredChatrooms.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`flex w-full items-center gap-4 rounded-control p-4 text-left transition-all ${
                  selectedChatId === chat.id
                    ? "border border-line bg-surface shadow-sm"
                    : "hover:bg-surface-raised"
                }`}
              >
                <div className="relative">
                  <Avatar src={chat.supporterPhoto} name={chat.supporterName} size="md" />
                  {chat.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-brand-strong text-caption font-bold text-on-brand">
                      {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-label font-bold">
                      {chat.supporterName}
                    </span>
                    <span className="text-caption font-bold text-muted-fg">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={`truncate text-caption ${
                      chat.unreadCount > 0 ? "font-medium text-fg" : "text-muted-fg"
                    }`}
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

      <div className="flex flex-1 flex-col bg-surface">
        {selectedChatroom ? (
          <>
            <header className="flex items-center justify-between border-b border-line bg-gradient-to-r from-surface-raised to-brand-soft p-4 md:p-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="p-2 text-muted-fg transition-colors hover:text-fg md:hidden"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar
                  src={selectedChatroom.supporterPhoto}
                  name={selectedChatroom.supporterName}
                  size="md"
                />
                <div>
                  <h3 className="text-label font-bold">
                    {selectedChatroom.supporterName}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Badge
                      tone={selectedChatroom.enabled !== false ? "success" : "danger"}
                    >
                      {selectedChatroom.enabled !== false ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IconButton
                  label={
                    selectedChatroom.enabled !== false
                      ? "Disable messages from this supporter"
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
                <button className="p-2 text-muted-fg transition-colors hover:text-fg">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-surface-raised/30 p-4 md:p-6">
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
                    }!`}
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
                          className={`max-w-[80%] rounded-card px-4 py-3 ${
                            msg.senderType === "creator"
                              ? "rounded-br-md bg-brand-strong text-on-brand"
                              : "rounded-bl-md border border-line bg-surface text-fg shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-label">{msg.content}</p>
                          <p
                            className={`mt-1 text-caption ${
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

            <footer className="border-t border-line bg-surface p-4 md:p-6">
              <div className="flex items-center gap-3 rounded-card bg-surface-raised p-2 pl-4">
                <Input
                  containerClassName="min-w-0 flex-1"
                  type="text"
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
            icon={<MessageSquare className="size-10 opacity-20" aria-hidden="true" />}
            title="Your Messages"
            description="Select a supporter from the left to view your conversation."
          />
        )}
      </div>
    </div>
  );
}
