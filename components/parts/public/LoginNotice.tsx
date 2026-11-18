"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const LoginNotice = ({
  handle,
  loggedIn,
}: {
  handle: string;
  loggedIn: boolean;
}) => {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-2 right-2 flex justify-center z-[100] pointer-events-none">
      <Link
        href={
          loggedIn
            ? `/onboarding?referral=${handle}`
            : `/login?referral=${handle}&redirect=${encodeURIComponent(pathname)}`
        }
        className="pointer-events-auto flex items-center gap-3 bg-foreground text-background px-4 py-2 rounded-control shadow-2xl shadow-brand-strong/20 hover:bg-brand-strong hover:-translate-y-1 transition-all duration-300 group"
      >
        <div className="w-4 h-4 bg-brand-strong rounded-control flex items-center justify-center text-on-brand font-bold text-xs group-hover:bg-white group-hover:text-brand-strong transition-colors">
          a
        </div>
        <div className="flex flex-col">
          <span className="text-caption font-bold uppercase tracking-widest leading-none text-brand-strong">
            Start yours
          </span>
          <span className="text-sm font-bold leading-tight">
            Create an Agaseke
          </span>
        </div>
        <div className="ml-2 bg-white/10 p-1 rounded-full group-hover:bg-white/20 transition-colors">
          <ArrowRight size={16} />
        </div>
      </Link>
    </div>
  );
};
