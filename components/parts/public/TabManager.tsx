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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:sticky md:top-4 md:mt-5 bg-background/95 backdrop-blur-lg border-t border-border md:border-b md:border-t-0 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:shadow-none md:mb-8 pb-2 md:pb-0">
      <div className="max-w-2xl mx-auto flex items-center justify-around md:justify-between px-2 w-full">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative group flex-1 md:flex-none">
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 md:gap-1 py-2 md:py-4 w-full border-t-2 md:border-b-2 md:border-t-0 transition-all duration-300 ${
                activeTab === tab.id
                  ? "border-orange-600 text-orange-600 font-bold"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className={`transition-transform ${activeTab === tab.id ? "scale-110" : ""}`}>
                {tab.icon}
              </div>
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest leading-tight">
                {tab.label}
              </span>
            </button>
            {username && (
              <Link
                href={`/${username}/${tab.page}`}
                className="absolute -top-1 right-0 p-1 bg-muted rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100 hover:text-orange-600 hidden md:block"
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
