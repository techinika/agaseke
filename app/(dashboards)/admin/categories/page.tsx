import { Metadata } from "next";
import AdminCategoriesPage from "@/components/pages/Dashboards/Admin/AdminCategoriesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminCategoriesPage />;
}
