import React from "react";
import Link from "next/link";

export default function DropdownLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
    >
      {icon} {label}
    </Link>
  );
}
