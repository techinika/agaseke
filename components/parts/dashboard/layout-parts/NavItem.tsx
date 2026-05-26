import React from "react";
import Link from "next/link";

export default function NavItem({ icon, label, href, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-orange-50 text-orange-600"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon} {label}
    </Link>
  );
}
