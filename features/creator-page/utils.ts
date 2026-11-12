import { Timestamp } from "firebase/firestore";
import type { CreatorPagePost } from "./types";

export function toTimestamp(value: unknown): unknown {
  if (typeof value === "string") {
    const millis = new Date(value).getTime();
    return Number.isNaN(millis) ? null : Timestamp.fromMillis(millis);
  }
  return value;
}

export function normalizePost(post: CreatorPagePost): CreatorPagePost {
  return {
    ...post,
    createdAt: toTimestamp(post.createdAt),
    updatedAt: toTimestamp(post.updatedAt),
    publishedAt: toTimestamp(post.publishedAt),
  };
}

export function postTime(post: CreatorPagePost): number {
  const value = post.publishedAt ?? post.createdAt;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
}
