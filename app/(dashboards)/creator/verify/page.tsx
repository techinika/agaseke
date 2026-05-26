import { Metadata } from "next";
import { VerificationPage } from "@/components/pages/Dashboards/VerifyPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function page() {
  return <VerificationPage />;
}
