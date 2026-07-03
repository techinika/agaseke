export type EventType = "public" | "supporters" | "supporters_tiered" | "ticketed";

export interface Gathering {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  capacity?: number;
  minSupportTier?: number;
  ticketPrice?: number;
  attendeesCount?: number;
  creatorId: string;
  status?: string;
  eventType?: EventType;
  supporterPrice?: number;
}

export const EVENT_TYPE_LABELS: Record<EventType, { label: string; description: string }> = {
  public: { label: "Public", description: "Everyone can see and RSVP for free" },
  supporters: { label: "Supporters", description: "Only supporters can see and RSVP for free" },
  supporters_tiered: { label: "Tiered Supporters", description: "Supporters with a minimum contribution can RSVP for free" },
  ticketed: { label: "Ticketed", description: "Anyone can purchase a ticket to attend" },
};
