import { Metadata } from "next";
import AdminCountryCurrenciesPage from "@/components/pages/Dashboards/Admin/AdminCountryCurrenciesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminCountryCurrenciesPage />;
}
