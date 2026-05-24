import React from "react";

export default function SocialIcon({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-500 hover:text-orange-500 transition-all transform hover:-translate-y-1"
    >
      {icon}
    </a>
  );
}
