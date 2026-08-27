import { Metadata } from "next";
import ArticlesPage from "@/components/pages/Dashboards/ArticlesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ArticlesPage />;
}