import { Metadata } from "next";
import BookingsPage from "@/components/pages/Dashboards/BookingsPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <BookingsPage />
    </div>
  );
}

export default page;
