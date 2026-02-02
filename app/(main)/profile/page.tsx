import AuthGuard from "@/auth/AuthGuard";
import ProfileEditPage from "@/components/pages/ProfilePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile | Agaseke for Creators",
  description: "Edit your profile on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
};

function page() {
  return (
    <AuthGuard>
      <ProfileEditPage />
    </AuthGuard>
  );
}

export default page;
