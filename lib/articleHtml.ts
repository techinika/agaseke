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

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Turn plain-text email addresses inside rich content into mailto: links.
 * Walks text nodes only, skipping anything already inside an <a> (or
 * script/style). Client-side only; returns input unchanged on the server.
 */
export function linkifyEmailsInHtml(html: string): string {
  if (typeof document === "undefined" || !html) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("a, script, style")) return NodeFilter.FILTER_REJECT;
      return EMAIL_REGEX.test(node.textContent || "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const targets: Text[] = [];
  while (walker.nextNode()) targets.push(walker.currentNode as Text);

  for (const node of targets) {
    const text = node.textContent || "";
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(EMAIL_REGEX.source, "g");

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index));

      const link = document.createElement("a");
      link.href = `mailto:${match[0]}`;
      link.className =
        "text-orange-600 hover:text-orange-700 underline underline-offset-2";
      link.textContent = match[0];
      fragment.append(link);

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) fragment.append(text.slice(lastIndex));
    node.replaceWith(fragment);
  }

  return doc.body.innerHTML;
}