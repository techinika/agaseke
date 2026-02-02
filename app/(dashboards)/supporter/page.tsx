import AuthGuard from "@/auth/AuthGuard";
import SupporterSpace from "@/components/pages/Dashboards/SupporterSpace";
import React from "react";

function page() {
  return (
    <AuthGuard>
      <SupporterSpace />
    </AuthGuard>
  );
}

export default page;
