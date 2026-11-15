export interface Env {
  /** Set to "true" to dual-write ledger entries during Phase 2 rollout. */
  MONEY_LEDGER_ENABLED?: string;
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  APP_URL: string;
  COMMS_WORKER_URL: string;
  INTERNAL_AUTH_SECRET: string;
}
