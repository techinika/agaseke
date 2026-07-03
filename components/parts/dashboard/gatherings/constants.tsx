import React from "react";
import { Globe, ShieldCheck, Ticket } from "lucide-react";

export const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  public: <Globe size={16} />,
  supporters: <ShieldCheck size={16} />,
  supporters_tiered: <ShieldCheck size={16} />,
  ticketed: <Ticket size={16} />,
};

export const EVENT_TYPE_LABELS_SHORT: Record<string, string> = {
  public: "Public",
  supporters: "Supporters",
  supporters_tiered: "Tiered",
  ticketed: "Ticketed",
};
