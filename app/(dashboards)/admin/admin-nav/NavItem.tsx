"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-xs font-black uppercase tracking-widest pb-4 -mb-4 whitespace-nowrap transition-colors ${
        isActive
          ? "text-orange-600 border-b-2 border-orange-600"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
