import AuthGuard from "@/auth/AuthGuard";
import CreatorOnboarding from "@/components/pages/StartPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Onboarding | Agaseke for Creators",
  description: "Creator Onboarding on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
};

function page() {
  return (
    <AuthGuard>
      <CreatorOnboarding />
    </AuthGuard>
  );
}

export default page;
