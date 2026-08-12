import type { Queue } from "@cloudflare/workers-types";

export type QueueJob =
  | {
      kind: "log";
      level: string;
      category: string;
      message: string;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: "notification";
      userId: string;
      type: string;
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, unknown>;
    };

export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ENCRYPTION_KEY: string;
  INTERNAL_AUTH_SECRET: string;
  AGASEKE_LOG_QUEUE: Queue<QueueJob>;
}
