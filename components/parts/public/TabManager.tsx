import { MessageCircle, Store, User, Gift, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface TabManagerProps {
  name: string;
  setActiveTab: any;
  activeTab: string;
  messagingEnabled?: boolean;
  storeEnabled?: boolean;
  giveawayEnabled?: boolean;
  gatheringsEnabled?: boolean;
  isSupporter?: boolean;
  username?: string;
}

export const TabManager = ({
  name,
  setActiveTab,
  activeTab,
  messagingEnabled = true,
  storeEnabled = false,
  giveawayEnabled = false,
  gatheringsEnabled = false,
  isSupporter = false,
  username = "",
}: TabManagerProps) => {
  const tabs = [
    { id: "community", label: "Community", icon: <User size={16} />, page: "community" },
    ...(storeEnabled ? [{ id: "store", label: "Store", icon: <Store size={16} />, page: "store" }] : []),
    ...(giveawayEnabled ? [{ id: "giveaways", label: "Giveaways", icon: <Gift size={16} />, page: "giveaways" }] : []),
    ...(gatheringsEnabled ? [{ id: "gatherings", label: "Events", icon: <Calendar size={16} />, page: "gatherings" }] : []),
    ...(messagingEnabled ? [{
      id: "message",
      label: `Message ${name.split(" ")[0]}`,
      icon: <MessageCircle size={16} />,
      page: "messaging",
    }] : []),
  ];

  return (
    <div className="sticky top-4 mt-5 z-50 bg-[#FBFBFC]/80 backdrop-blur-md border-b border-slate-100 mb-8">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-2 w-full">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative group">
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-4 border-b-2 transition-all duration-300 ${
                activeTab === tab.id
                  ? "border-orange-600 text-orange-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] uppercase tracking-widest">
                {tab.label}
              </span>
            </button>
            {username && (
              <Link
                href={`/${username}/${tab.page}`}
                className="absolute top-2 right-0 p-1.5 bg-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100 hover:text-orange-600"
                title="Open full page"
              >
                <ArrowUpRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
