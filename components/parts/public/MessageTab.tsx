/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Loader, X, Send, MessageSquare, Ban } from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ProtectedSection } from "./ProtectedSection";
import { toast } from "sonner";

interface MessageTabProps {
  isLoggedIn: boolean;
  isSupporter: boolean;
  setIsModalOpen: any;
  name: string;
  handle: string;
  creatorId: string;
  currentUserId?: string;
  currentUserName?: string;
  creatorData?: any;
  messagingEnabled?: boolean;
  messagingAllowAll?: boolean;
  messagingMinAmount?: number;
  userTotalSupport?: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Timestamp | null;
  read: boolean;
}

export const MessageTab = ({
  isLoggedIn,
  isSupporter,
  setIsModalOpen,
  name,
  handle,
  creatorId,
  currentUserId,
  currentUserName,
  creatorData,
  messagingEnabled = true,
  messagingAllowAll = true,
  messagingMinAmount = 0,
  userTotalSupport = 0,
}: MessageTabProps) => {
  const [chatroomId, setChatroomId] = useState<string | null>(null);
  const [chatroomEnabled, setChatroomEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isLoggedIn || !isSupporter || !currentUserId || !creatorId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const findOrCreateChatroom = async () => {
      try {
        const chatroomsRef = collection(db, "chatrooms");
        const q = query(
          chatroomsRef,
          where("creatorId", "==", creatorId),
          where("supporterId", "==", currentUserId)
        );

        const { getDocs } = await import("firebase/firestore");
        const chatroomSnapshot = await getDocs(q);

        if (!isMounted) return;

        if (!chatroomSnapshot.empty) {
          const existingChatroom = chatroomSnapshot.docs[0];
          setChatroomId(existingChatroom.id);
          setChatroomEnabled(existingChatroom.data().enabled !== false);
        } else {
          let supporterData = null;
          try {
            const profileSnap = await getDoc(doc(db, "profiles", currentUserId));
            supporterData = profileSnap.data();
          } catch {
            // Profile might not exist
          }

          const newChatroom = await addDoc(chatroomsRef, {
            creatorId: creatorId,
            supporterId: currentUserId,
            supporterName: currentUserName || "Anonymous",
            supporterPhoto: supporterData?.photoURL || null,
            lastMessage: "",
            lastMessageAt: serverTimestamp(),
            unreadCount: 0,
            enabled: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          if (isMounted) {
            setChatroomId(newChatroom.id);
            setChatroomEnabled(true);
          }
        }
      } catch (error) {
        console.error("Error finding/creating chatroom:", error);
        if (isMounted) toast.error("Failed to connect to chat");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    findOrCreateChatroom();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isSupporter, currentUserId, creatorId, currentUserName]);

  useEffect(() => {
    if (!chatroomId) return;

    const messagesRef = collection(db, "chatrooms", chatroomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatroomId]);

  useEffect(() => {
    if (!chatroomId || messages.length === 0) return;

    const unreadUnread = messages.filter(
      (m) => m.senderId !== currentUserId && !m.read
    );

    if (unreadUnread.length > 0) {
      const batch = async () => {
        for (const msg of unreadUnread) {
          await updateDoc(
            doc(db, "chatrooms", chatroomId, "messages", msg.id),
            { read: true }
          );
        }
      };
      batch();
    }
  }, [messages, chatroomId, currentUserId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatroomId || !currentUserId || !currentUserName) {
      return;
    }

    if (!chatroomEnabled) {
      toast.error("Messaging is disabled for this conversation");
      return;
    }

    setSending(true);
    try {
      const messagesRef = collection(db, "chatrooms", chatroomId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUserId,
        senderName: currentUserName,
        senderType: "supporter",
        content: newMessage.trim(),
        createdAt: serverTimestamp(),
        read: false,
      });

      await updateDoc(doc(db, "chatrooms", chatroomId), {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0,
      });

      fetch("/api/comms/email/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorEmail: creatorData?.email || "",
          creatorName: name,
          supporterName: currentUserName,
          message: newMessage.trim(),
          chatroomUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/creator/messages?chat=${chatroomId}`,
        }),
      }).catch((e) => console.error("Failed to send email notification:", e));

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="animate-in fade-in duration-500">
        <ProtectedSection
          isLoggedIn={isLoggedIn}
          type="login"
          hasGifted={isSupporter}
          setIsModalOpen={setIsModalOpen}
          handle={handle}
        />
      </div>
    );
  }

  if (!isSupporter) {
    return (
      <div className="animate-in fade-in duration-500">
        <ProtectedSection
          isLoggedIn={isLoggedIn}
          type="gift"
          hasGifted={isSupporter}
          setIsModalOpen={setIsModalOpen}
          handle={handle}
        />
      </div>
    );
  }

  const canMessage = messagingEnabled && (
    messagingAllowAll || userTotalSupport >= messagingMinAmount
  );

  if (!canMessage) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-slate-300" />
          </div>
          <h4 className="font-bold text-lg text-slate-900 mb-2">
            Messaging Disabled
          </h4>
          <p className="text-sm text-slate-500 max-w-[250px] mx-auto">
            {messagingAllowAll
              ? "This creator has disabled direct messaging."
              : `You need to support with at least ${messagingMinAmount.toLocaleString()} RWF to send a message.`}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 bg-orange-500 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors"
          >
            Support to Unlock
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 flex items-center justify-center h-[400px]">
        <Loader className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col h-[550px] bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-lg overflow-hidden">
              {creatorData?.profilePicture ? (
                <img
                  src={creatorData.profilePicture}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                name[0]
              )}
            </div>
            <div>
              <p className="text-sm font-bold">{name}</p>
              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">
                Message Creator
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Send size={24} className="text-slate-300" />
              </div>
              <h4 className="font-bold text-slate-900">Start the conversation</h4>
              <p className="text-sm text-slate-500 max-w-[250px]">
                Send your first message to {name.split(" ")[0]}. They&apos;ll receive
                it via email too!
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.senderId === currentUserId
                        ? "bg-orange-500 text-white rounded-br-md"
                        : "bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.senderId === currentUserId
                          ? "text-orange-100"
                          : "text-slate-400"
                      }`}
                    >
                      {msg.createdAt?.toDate?.().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) || "Sending..."}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          {!chatroomEnabled && (
            <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600">
              <Ban size={16} />
              <p className="text-xs font-medium">
                Messaging is disabled. You can view messages but cannot send new ones.
              </p>
            </div>
          )}
          <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl">
            <input
              type="text"
              placeholder="Write a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:ring-0 outline-none text-slate-800 placeholder:text-slate-400"
              disabled={sending || !chatroomEnabled}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || !chatroomEnabled}
              className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
