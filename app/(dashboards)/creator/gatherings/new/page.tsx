import { Metadata } from "next";
import GatheringsForm from "@/components/parts/dashboard/GatheringsForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewGatheringPage() {
  return <GatheringsForm />;
}
