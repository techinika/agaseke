import { Metadata } from "next";
import AdminCurrenciesPage from "@/components/pages/Dashboards/Admin/AdminCurrenciesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminCurrenciesPage />;
}
