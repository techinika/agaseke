import React from "react";

export default function SocialIcon({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      title={title}
      className="inline-flex size-11 items-center justify-center rounded-control text-muted-foreground transition-all transform hover:-translate-y-1 hover:text-orange-500 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      {icon}
    </a>
  );
}
