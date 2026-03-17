import { Heart, Lock } from "lucide-react";
import Link from "next/link";

export const ProtectedSection = ({
  isLoggedIn,
  hasGifted,
  type,
  setIsModalOpen,
  handle,
}: {
  isLoggedIn: boolean;
  hasGifted: boolean;
  type: "login" | "gift";
  setIsModalOpen: any;
  handle?: string;
}) => {
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <Lock className="text-slate-300 mb-4" size={48} />
        <h3 className="text-xl font-bold">Authentication Required</h3>
        <p className="text-slate-500 max-w-xs mx-auto mb-6">
          Please log in to access this feature and connect with the creator.
        </p>
        <Link
          href={`/login?referral=${handle}`}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all"
        >
          Log In to Agaseke
        </Link>
      </div>
    );
  }

  if (type === "gift" && !hasGifted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <Heart className="text-orange-200 mb-4" size={48} />
        <h3 className="text-xl font-bold">Send a Gift to Unlock</h3>
        <p className="text-slate-500 max-w-xs mx-auto mb-6">
          Direct messaging is exclusive to supporters. Send a small gift to
          start the conversation.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all"
        >
          Send a Gift
        </button>
      </div>
    );
  }

  return null;
};
