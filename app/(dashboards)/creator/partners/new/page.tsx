import { Metadata } from "next";
import PartnerForm from "@/components/parts/dashboard/PartnerForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewPartnerPage() {
  return <PartnerForm />;
}
