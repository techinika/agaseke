export interface ContentPost {
  id: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  type: "text" | "image" | "video" | "document" | "article";
  isPrivate: boolean;
  price?: number | null;
  currency?: string;
  coverUrl?: string | null;
  contentUrl?: string | null;
  createdAt?: unknown;
  views?: number;
  likeCount?: number;
  commentCount?: number;
}

export interface LockedPostCardProps {
  post: ContentPost;
  onUnlock: () => void;
}

export interface PostCardProps {
  post: ContentPost;
  onOpen?: (id: string) => void;
  onLike?: (id: string) => void;
  onShare?: (id: string) => void;
}
