"use client";
import React from "react";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const LINK_REGEX = new RegExp(
  `(${EMAIL_REGEX.source})` +
    "|(https?:\\/\\/[^\\s<]+)" +
    "|(\\bwww\\.[^\\s<]+\\b)" +
    "|(\\b[a-zA-Z0-9][a-zA-Z0-9.-]*\\.[a-zA-Z]{2,}(?:\\/[^\\s<]*)?\\b)",
  "g",
);

function splitWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(LINK_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const isEmail = !!match[1];
    const href = isEmail ? `mailto:${token}` : token.startsWith("http://") || token.startsWith("https://") ? token : `https://${token}`;

    parts.push(
      isEmail ? (
        <a
          key={match.index}
          href={href}
          className="text-orange-600 hover:text-orange-700 underline underline-offset-2"
        >
          {token}
        </a>
      ) : (
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:text-orange-700 underline underline-offset-2"
        >
          {token}
        </a>
      ),
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function LinkifyText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;

  const hasLink = new RegExp(LINK_REGEX.source, "g").test(text);

  if (!hasLink) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {splitWithLinks(text)}
    </span>
  );
}