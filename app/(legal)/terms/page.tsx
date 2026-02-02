import TermsPage from "@/components/pages/Legal/TermsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Agaseke for Creators",
  description: "Guidelines and legal terms for using the Agaseke platform.",
};

export default function page() {
  return <TermsPage />;
}
