export interface Chatroom {
  id: string;
  creatorId: string;
  supporterId: string;
  supporterName: string;
  supporterPhoto?: string;
  lastMessage?: string;
  lastMessageAt: any;
  unreadCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  chatroomId: string;
  senderId: string;
  senderName: string;
  senderType: "creator" | "supporter";
  content: string;
  createdAt: any;
  read: boolean;
}

export interface MessagingSettings {
  enabled: boolean;
  minSupportAmount: number;
  allowAllSupporters: boolean;
}
