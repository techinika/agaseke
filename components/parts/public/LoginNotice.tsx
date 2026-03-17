import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const LoginNotice = ({
  handle,
  loggedIn,
}: {
  handle: string;
  loggedIn: boolean;
}) => {
  return (
    <div className="fixed bottom-2 right-2 flex justify-center z-[100] pointer-events-none">
      <Link
        href={
          loggedIn
            ? `/onboarding?referral=${handle}`
            : `/login?referral=${handle}`
        }
        className="pointer-events-auto flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-2xl shadow-orange-500/20 hover:bg-orange-600 hover:-translate-y-1 transition-all duration-300 group"
      >
        <div className="w-4 h-4 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xs group-hover:bg-white group-hover:text-orange-600 transition-colors">
          a
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none text-orange-400">
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
