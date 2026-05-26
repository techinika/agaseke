import { Metadata } from "next";
import AdminChangelogPage from "@/components/pages/Dashboards/Admin/AdminChangelogPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ChangelogPage() {
  return <AdminChangelogPage />;
}
