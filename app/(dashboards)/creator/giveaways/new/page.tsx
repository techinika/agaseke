import { Metadata } from "next";
import GiveawayForm from "@/components/parts/dashboard/GiveawayForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewGiveawayPage() {
  return <GiveawayForm />;
}
