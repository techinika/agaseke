import AuthGuard from "@/auth/AuthGuard";
import AdminDashboard from "@/components/pages/Dashboards/AdminPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Space | Agaseke for Creators",
  description: "Edit your profile on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
};

function page() {
  return (
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  );
}

export default page;
