export const normalizeSocialUrl = (
  value: string | null | undefined,
  platform: "twitter" | "instagram" | "linkedin" | "youtube" | "tiktok" | "web"
): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (platform === "web") {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (trimmed.startsWith("www.")) {
      return `https://${trimmed}`;
    }
    return `https://${trimmed}`;
  }

  const platformUrls: Record<string, string> = {
    twitter: "https://x.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    youtube: "https://youtube.com",
    tiktok: "https://tiktok.com",
  };

  const baseUrl = platformUrls[platform];

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("www.")) {
    return `https://${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }

  return `${baseUrl}/${trimmed}`;
};