"use client";

import { useMemo } from "react";
import { sanitizeArticleHtml } from "@/lib/articleHtml";

interface RichContentRendererProps {
  html: string;
  className?: string;
}

export default function RichContentRenderer({
  html,
  className = "",
}: RichContentRendererProps) {
  const sanitized = useMemo(() => sanitizeArticleHtml(html), [html]);

  if (!sanitized) return null;

  return (
    <div
      className={`article-body ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}