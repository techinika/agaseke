import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Timestamp | null;
  read: boolean;
}
