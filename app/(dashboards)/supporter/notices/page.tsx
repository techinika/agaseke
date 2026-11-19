import { Metadata } from "next";
import NoticesPage from "@/components/pages/Dashboards/NoticesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SupporterNoticesPage() {
  return <NoticesPage />;
}
