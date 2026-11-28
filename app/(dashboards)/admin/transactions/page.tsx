import type { Metadata } from "next";
import AdminTransactionsPage from "@/components/pages/Dashboards/Admin/AdminTransactionsPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminTransactionsPage />;
}
