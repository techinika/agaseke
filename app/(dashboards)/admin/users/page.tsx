import { Metadata } from "next";
import AdminUsersPage from "@/components/pages/Dashboards/Admin/AdminUsersPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <AdminUsersPage />
    </div>
  );
}

export default page;
