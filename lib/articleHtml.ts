import DOMPurify from "dompurify";

const ALLOWED_HTML_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike", "mark",
  "ul", "ol", "li",
  "blockquote",
  "pre", "code",
  "a",
  "img",
  "video",
  "figure",
  "figcaption",
];

const ALLOWED_HTML_ATTRS = [
  "href", "target", "rel", "title",
  "src", "alt", "loading",
  "controls", "controlslist", "preload", "poster",
];

/**
 * Sanitize article HTML before it is stored or rendered.
 * Only runs on the client where DOMPurify has a DOM available.
 */
export function sanitizeArticleHtml(html: string): string {
  if (typeof window === "undefined") return html;
  if (!html || !html.trim()) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_HTML_TAGS,
    ALLOWED_ATTR: ALLOWED_HTML_ATTRS,
    ALLOW_DATA_ATTR: false,
  });
}

/** Strip HTML to plain text (used for previews / SEO snippets). */
export function articleToPlainText(html: string, maxLength = 160): string {
  if (!html) return "";
  const text =
    typeof document !== "undefined"
      ? new DOMParser().parseFromString(html, "text/html").body.textContent || ""
      : html.replace(/<[^>]*>/g, " ");
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
}