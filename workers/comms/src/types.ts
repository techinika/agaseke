export type EmailPurpose =
  | "welcome_creator"
  | "profile_live"
  | "booking_request"
  | "booking_response"
  | "gathering_created"
  | "gathering_rsvp"
  | "gathering_checkin"
  | "gathering_declined"
  | "gathering_undo"
  | "message_new"
  | "message_digest"
  | "store_order"
  | "store_status"
  | "support_received"
  | "payout_processed"
  | "content_new"
  | "verification_request"
  | "verification_feedback"
  | "broadcast";

export interface EmailSendResponse {
  messageId: string;
}

export interface Env {
  EMAIL: { send(msg: EmailSendMessage): Promise<EmailSendResponse> };
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
  APP_URL: string;
  ASSETS_URL: string;
}

export interface EmailSendMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: { email: string; name?: string };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    content: string | ArrayBuffer | ArrayBufferView;
    filename: string;
    type: string;
    disposition?: "inline" | "attachment";
    contentId?: string;
  }>;
}

export interface CommsRequest {
  purpose: EmailPurpose;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  data: Record<string, unknown>;
}

export interface CommsResponse {
  success: boolean;
  messageId?: string;
  purpose: EmailPurpose;
  recipientCount: number;
}

export interface EmailTemplateData {
  headerColor: string;
  headerTitle: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
  extraStyles?: string;
  extraContent?: string;
}

export interface EmailService {
  purpose: EmailPurpose;
  resolveRecipients(data: Record<string, unknown>, env: Env): Promise<EmailAddresses>;
  buildTemplateData(data: Record<string, unknown>, env: Env): Promise<EmailTemplateData>;
  buildSubject(data: Record<string, unknown>): string;
}

export interface EmailAddresses {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: { email: string; name: string };
}
