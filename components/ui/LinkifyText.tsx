"use client";
import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+)|(\bwww\.[^\s<]+\b)|(\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s<]*)?\b)/g;

function splitWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(URL_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    let url = match[0];
    let href = url;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      href = "https://" + url;
    }

    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-600 hover:text-orange-700 underline underline-offset-2"
      >
        {url}
      </a>,
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

  const hasUrl = URL_REGEX.test(text);
  URL_REGEX.lastIndex = 0;

  if (!hasUrl) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {splitWithLinks(text)}
    </span>
  );
}
