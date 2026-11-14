/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Loader, MessageSquare, Send } from "lucide-react";
import { sendCommsEmail } from "@/lib/commsService";
import { encrypt, decryptChatMessage } from "@/lib/generalWorkerService";
import {
  getOrCreateSupporterChatroom,
  markChatMessagesAsRead,
  sendChatMessage as sendChatMessageRecord,
  subscribeToChatMessages,
} from "@/lib/chatService";
import { ProtectedSection } from "./ProtectedSection";
import { toast } from "sonner";
import { ChatHeader, MessageBubble, MessageInput } from "./message";
import type { Message } from "./message";
import { TabErrorState } from "@/components/ui/TabErrorState";

const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";

function logErrorToServer(message: string, metadata?: Record<string, unknown>) {
  fetch(`${GENERAL_WORKER_URL}/api/general/log-error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "error", category: "messaging", message, metadata }),
  }).catch(() => {});
}

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
  const [fetchError, setFetchError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const decryptedCache = useRef<Map<string, string>>(new Map());

  const decryptMessage = async (chatroomId: string, id: string): Promise<string> => {
    const cached = decryptedCache.current.get(id);
    if (cached) return cached;
    try {
      const plaintext = await decryptChatMessage(chatroomId, id);
      if (plaintext) {
        decryptedCache.current.set(id, plaintext);
        return plaintext;
      }
    } catch { /* ignore */ }
    return "";
  };

  const encryptMessage = encrypt;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* eslint-disable react-hooks/set-state-in-effect -- determine messaging eligibility before loading chat */
  useEffect(() => {
    if (!isLoggedIn || !isSupporter || !currentUserId || !creatorId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const findOrCreateChatroom = async () => {
      try {
        const room = await getOrCreateSupporterChatroom({
          creatorId,
          supporterId: currentUserId,
          supporterName: currentUserName || "Anonymous",
        });
        if (!isMounted) return;
        setChatroomId(room.id);
        setChatroomEnabled(room.enabled);
      } catch (error) {
        console.error("Error finding/creating chatroom:", error);
        setFetchError(true);
        logErrorToServer("Error finding/creating chatroom", {
          creatorId,
          currentUserId,
          error: String(error),
        });
        if (isMounted) toast.error("Failed to connect to chat");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    findOrCreateChatroom();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isSupporter, currentUserId, creatorId, currentUserName, retryKey]);

  useEffect(() => {
    if (!chatroomId) return;

    const unsubscribe = subscribeToChatMessages(chatroomId, (rawMsgs) => {
      void Promise.all(
        rawMsgs.map(async (msg) => {
          const decrypted = await decryptMessage(chatroomId, msg.id);
          return { ...(msg as unknown as Message), content: decrypted };
        }),
      ).then(setMessages);
    });

    return () => unsubscribe();
  }, [chatroomId]);

  useEffect(() => {
    if (!chatroomId || messages.length === 0) return;

    const unreadIds = messages
      .filter((m) => m.senderId !== currentUserId && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      void markChatMessagesAsRead(chatroomId, unreadIds).catch(() => {});
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
      const text = newMessage.trim();
      const encryptedContent = await encryptMessage(text);
      const encryptedLastMessage = await encryptMessage(text);

      await sendChatMessageRecord({
        chatroomId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderType: "supporter",
        content: encryptedContent,
        lastMessage: encryptedLastMessage,
      });

      sendCommsEmail("message_new", {
        creatorId,
        creatorName: name,
        supporterName: currentUserName,
        message: newMessage.trim(),
        chatroomId,
        chatroomUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/creator/messages?chat=${chatroomId}`,
      }).catch((e) => console.error("Failed to send email notification:", e));

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      logErrorToServer("Error sending message", {
        chatroomId,
        userId: currentUserId,
        error: String(error),
      });
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
          <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-muted-foreground" />
            </div>
            <h4 className="font-bold text-lg text-foreground mb-2">
              Messaging Disabled
            </h4>
            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
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

  if (fetchError) {
    return (
      <TabErrorState
        message="There was a problem connecting to the chat. Please try again."
        onRetry={() => {
          setFetchError(false);
          setLoading(true);
          setRetryKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col h-[550px] bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
        <ChatHeader name={name} profilePicture={creatorData?.profilePicture} />

        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Send size={24} className="text-muted-foreground" />
              </div>
              <h4 className="font-bold text-foreground">Start the conversation</h4>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Send your first message to {name.split(" ")[0]}. They&apos;ll receive
                it via email too!
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === currentUserId}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <MessageInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={sendMessage}
          sending={sending}
          disabled={!chatroomId}
          chatroomEnabled={chatroomEnabled}
        />
      </div>
    </div>
  );
};
