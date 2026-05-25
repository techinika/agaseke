import { Metadata } from "next";
import AdminLogsPage from "@/components/pages/Dashboards/Admin/AdminLogsPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <AdminLogsPage />
    </div>
  );
}

export default page;
