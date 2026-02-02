import AuthGuard from "@/auth/AuthGuard";
import SupporterSpace from "@/components/pages/Dashboards/SupporterSpace";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supporter Space | Agaseke for Creators",
  description: "Supporter Space on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
};

function page() {
  return (
    <AuthGuard>
      <SupporterSpace />
    </AuthGuard>
  );
}

export default page;
