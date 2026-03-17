import { MessageCircle, Star, Store, User } from "lucide-react";

export const TabManager = ({
  name,
  setActiveTab,
  activeTab,
}: {
  name: string;
  setActiveTab: any;
  activeTab: string;
}) => {
  const tabs = [
    { id: "community", label: "Community", icon: <User size={16} /> },
    { id: "store", label: "Store", icon: <Store size={16} /> },
    {
      id: "message",
      label: `Message ${name.split(" ")[0]}`,
      icon: <MessageCircle size={16} />,
    },
    { id: "giveaways", label: "Giveaways", icon: <Star size={16} /> },
  ];

  return (
    <div className="sticky top-4 mt-5 z-50 bg-[#FBFBFC]/80 backdrop-blur-md border-b border-slate-100 mb-8">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
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
        ))}
      </div>
    </div>
  );
};
