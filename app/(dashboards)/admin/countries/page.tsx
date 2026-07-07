import { Metadata } from "next";
import AdminCountriesPage from "@/components/pages/Dashboards/Admin/AdminCountriesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminCountriesPage />;
}
