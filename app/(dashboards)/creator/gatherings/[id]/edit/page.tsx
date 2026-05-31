import { Metadata } from "next";
import GatheringsForm from "@/components/parts/dashboard/GatheringsForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EditGatheringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GatheringsForm gatheringId={id} />;
}
