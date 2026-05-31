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
}
