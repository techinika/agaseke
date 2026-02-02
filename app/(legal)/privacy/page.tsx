import PrivacyPage from "@/components/pages/Legal/PrivacyPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Agaseke for Creators",
  description: "How we protect and manage your data at Agaseke for Creators.",
};

export default function page() {
  return <PrivacyPage />;
}
