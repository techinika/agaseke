import { Metadata } from "next";
import AdminPayouts from "@/components/pages/Dashboards/Admin/PayoutsPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function page() {
  return <AdminPayouts />;
}
