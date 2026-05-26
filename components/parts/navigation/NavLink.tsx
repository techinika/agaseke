import React from "react";
import Link from "next/link";

export default function NavLink({
  href,
  icon,
  label,
  active,
  isExternal,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isExternal?: boolean;
}) {
  const content = (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        active
          ? "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400"
          : "text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href}>{content}</Link>
  );
}
