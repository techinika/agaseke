export interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  APP_URL: string;
  COMMS_WORKER_URL: string;
  INTERNAL_AUTH_SECRET: string;
  R2_PUBLIC_URL: string;
  UPLOADS_BUCKET: R2Bucket;
}
