"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface SubItem {
  href: string;
  label: string;
}

export default function ExpandableNavItem({
  icon,
  label,
  subItems,
  activeSub,
}: {
  icon: React.ReactNode;
  label: string;
  subItems: SubItem[];
  activeSub?: string;
}) {
  const [open, setOpen] = useState(
    () => subItems.some((s) => s.href === activeSub),
  );

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          open
            ? "bg-orange-50 text-orange-600"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="flex items-center gap-3">
          {icon} {label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-6 mt-1 space-y-0.5 border-l border-border pl-2">
          {subItems.map((sub) => (
            <Link
              key={sub.href}
              href={sub.href}
              className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSub === sub.href
                  ? "bg-orange-50 text-orange-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
