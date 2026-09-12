import React from "react";

export default function SocialIcon({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      title={title}
      className="text-muted-foreground hover:text-orange-500 transition-all transform hover:-translate-y-1"
    >
      {icon}
    </a>
  );
}
