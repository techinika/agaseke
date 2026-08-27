/** Convert a string into an SEO-friendly URL slug (ASCII only). */
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Fallback slug when a title produces no safe ASCII slug. */
export function fallbackSlug(seed?: string): string {
  const base = seed || "article";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}