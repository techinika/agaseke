/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  MessageSquare,
  MoreVertical,
  Loader,
  ArrowLeft,
  Phone,
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
import { encrypt, decrypt } from "@/lib/generalWorkerService";

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
  const [decryptedRooms, setDecryptedRooms] = useState<Set<string>>(new Set());
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const decryptedCache = useRef<Map<string, string>>(new Map());
  const oldestCursorRef = useRef<{ createdAt: Timestamp; id: string } | null>(null);

  const decryptMessage = async (id: string, encrypted: string): Promise<string> => {
    const cached = decryptedCache.current.get(id);
    if (cached) return cached;
    if (!encrypted || !encrypted.includes(":")) return encrypted;
    try {
      const plaintext = await decrypt(encrypted);
      if (plaintext) {
        decryptedCache.current.set(id, plaintext);
        return plaintext;
      }
    } catch { /* ignore */ }
    return encrypted;
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
      orderBy("updatedAt", "desc")
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
      (c) => c.lastMessage && c.lastMessage.includes(":") && !decryptedCache.current.has(`room_${c.id}`)
    );
    if (todo.length === 0) return;
    Promise.all(
      todo.map(async (chat) => {
        const key = `room_${chat.id}`;
        try {
          const plaintext = await decrypt(chat.lastMessage!);
          if (plaintext) decryptedCache.current.set(key, plaintext);
        } catch { /* ignore */ }
      })
    ).then(() => {
      setDecryptedRooms(new Set(todo.map((c) => c.id)));
    });
  }, [chatrooms]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    setMessages([]);
    setHasMoreMessages(false);
    oldestCursorRef.current = null;

    const messagesRef = collection(db, "chatrooms", selectedChatId, "messages");
    const recentQuery = query(messagesRef, orderBy("createdAt", "desc"), orderBy("__name__", "desc"), limit(10));

    const unsubscribe = onSnapshot(recentQuery, (snapshot) => {
      const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));

      const displayMsgs = raw.map((m) => {
        const cached = decryptedCache.current.get(m.id);
        if (cached) return { ...m, content: cached };
        if (m.content?.includes(":")) return { ...m, content: "" };
        return m;
      });
      setMessages(displayMsgs);

      const uncached = raw.filter(
        (m) => m.content?.includes(":") && !decryptedCache.current.has(m.id)
      );

      if (uncached.length > 0) {
        setDecryptingIds(new Set(uncached.map((m) => m.id)));

        Promise.all(
          uncached.map(async (msg) => {
            const plaintext = await decryptMessage(msg.id, msg.content);
            return { id: msg.id, content: plaintext };
          })
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
            all.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
            if (all.length > 0) {
              oldestCursorRef.current = { createdAt: all[0].createdAt as Timestamp, id: all[0].id };
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
          const sorted = [...raw].sort((a, b) =>
            (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
          );
          oldestCursorRef.current = { createdAt: sorted[0].createdAt as Timestamp, id: sorted[0].id };
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

    const unreadMsgs = messages.filter(
      (m) => m.senderType === "supporter" && !m.read
    );
    if (unreadMsgs.length === 0) return;

    const batch = writeBatch(db);
    for (const msg of unreadMsgs) {
      batch.update(
        doc(db, "chatrooms", selectedChatId, "messages", msg.id),
        { read: true }
      );
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
        startAfter(oldestCursorRef.current.createdAt, oldestCursorRef.current.id)
      );
      const snapshot = await getDocs(q);
      const rawOlder = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));

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
        all.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        if (all.length > 0) {
          oldestCursorRef.current = { createdAt: all[0].createdAt as Timestamp, id: all[0].id };
        }
        setHasMoreMessages(rawOlder.length === 10);
        return all;
      });

      const uncached = rawOlder.filter(
        (m) => m.content?.includes(":") && !decryptedCache.current.has(m.id)
      );
      if (uncached.length > 0) {
        setDecryptingIds((prev) => {
          const next = new Set(prev);
          for (const m of uncached) next.add(m.id);
          return next;
        });
        Promise.all(
          uncached.map(async (msg) => {
            const plaintext = await decryptMessage(msg.id, msg.content);
            return { id: msg.id, content: plaintext };
          })
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
            return Array.from(map.values()).sort((a, b) =>
              (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
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
    chat.supporterName.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-70px)] bg-card flex overflow-hidden">
      <aside className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-muted/50">
        <div className="p-6">
          <h1 className="text-2xl font-bold uppercase mb-6">Messages</h1>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder="Search supporters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {filteredChatrooms.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare size={40} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                {searchQuery ? "No conversations found" : "No messages yet"}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                {searchQuery
                  ? "Try a different search term"
                  : "Supporters will appear here once they message you"}
              </p>
            </div>
          ) : (
            filteredChatrooms.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all ${
                  selectedChatId === chat.id
                    ? "bg-card shadow-sm border border-border"
                    : "hover:bg-muted"
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 overflow-hidden">
                    {chat.supporterPhoto ? (
                      <img
                        src={chat.supporterPhoto}
                        alt={chat.supporterName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      chat.supporterName[0]
                    )}
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 border-2 border-white dark:border-foreground rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">
                        {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm truncate">
                      {chat.supporterName}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={`text-xs truncate ${
                      chat.unreadCount > 0
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {decryptedCache.current.get(`room_${chat.id}`) || chat.lastMessage || "No messages yet"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-card">
        {selectedChatroom ? (
          <>
            <header className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-muted to-orange-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 overflow-hidden">
                  {selectedChatroom.supporterPhoto ? (
                    <img
                      src={selectedChatroom.supporterPhoto}
                      alt={selectedChatroom.supporterName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedChatroom.supporterName[0]
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {selectedChatroom.supporterName}
                  </h3>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        selectedChatroom.enabled !== false
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {selectedChatroom.enabled !== false ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleChatroomEnabled(selectedChatroom.id, selectedChatroom.enabled !== false)}
                  className={`p-2 transition ${
                    selectedChatroom.enabled !== false
                      ? "text-muted-foreground hover:text-red-500"
                      : "text-red-500 hover:text-green-500"
                  }`}
                  title={selectedChatroom.enabled !== false ? "Disable messages from this supporter" : "Enable messages from this supporter"}
                >
                  {selectedChatroom.enabled !== false ? (
                    <Ban size={20} />
                  ) : (
                    <CheckCircle size={20} />
                  )}
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground transition">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/30">
              {messagesLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex w-full max-w-[80%] gap-3 animate-pulse">
                      <div className={`flex-1 ${i % 2 === 0 ? "ml-auto" : ""}`}>
                        <div className="h-12 bg-muted rounded-2xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <MessageSquare size={24} className="text-muted-foreground" />
                  </div>
                  <h4 className="font-bold text-foreground">
                    Start the conversation
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-[250px]">
                    Send your first message to{" "}
                    {selectedChatroom.supporterName.split(" ")[0]}!
                  </p>
                </div>
              ) : (
                <>
                  {hasMoreMessages && (
                    <div className="text-center">
                      <button
                        onClick={loadMoreMessages}
                        disabled={loadingMore}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted transition disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <Loader size={12} className="animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          "Load older messages"
                        )}
                      </button>
                    </div>
                  )}
                  <div ref={messagesTopRef} />
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === "creator" ? "justify-end" : "justify-start"}`}
                    >
                      {decryptingIds.has(msg.id) ? (
                        <div className={`max-w-[80%] w-48 px-4 py-3 rounded-2xl animate-pulse ${
                          msg.senderType === "creator"
                            ? "bg-orange-300 rounded-br-md"
                            : "bg-muted border border-border rounded-bl-md"
                        }`}>
                          <div className="h-3 bg-white/40 rounded w-full mb-2" />
                          <div className="h-3 bg-white/40 rounded w-3/4 mb-2" />
                          <div className="h-2 bg-white/30 rounded w-1/4" />
                        </div>
                      ) : (
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                            msg.senderType === "creator"
                              ? "bg-orange-500 text-white rounded-br-md"
                              : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.senderType === "creator"
                                ? "text-orange-100"
                                : "text-muted-foreground"
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

            <footer className="p-4 md:p-6 bg-card border-t border-border">
              <div className="flex items-center gap-3 bg-muted p-2 pl-4 rounded-2xl">
                <input
                  type="text"
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="flex-1 bg-transparent outline-none text-sm font-medium"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center mb-6">
              <MessageSquare size={40} className="opacity-20" />
            </div>
            <h3 className="text-xl font-bold uppercase mb-2">Your Messages</h3>
            <p className="text-sm font-medium max-w-xs text-muted-foreground">
              Select a supporter from the left to view your conversation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
