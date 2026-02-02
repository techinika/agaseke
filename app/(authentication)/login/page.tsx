import LoginPage from "@/components/pages/LoginPage";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Agaseke for Creators",
  description: "Access your Agaseke account to support your favorite creators.",
  robots: {
    index: false,
    follow: false,
  },
};

function page() {
  return (
    <div>
      <LoginPage />
    </div>
  );
}

export default page;
