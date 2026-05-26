import { Metadata } from "next";
import React from "react";
import NoticesPage from "@/components/pages/Dashboards/NoticesPage";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return <NoticesPage />;
}

export default page;