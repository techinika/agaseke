import { Metadata } from "next";
import AdminFeedbackPage from "@/components/pages/Dashboards/Admin/AdminFeedbackPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminFeedbackPage />;
}
