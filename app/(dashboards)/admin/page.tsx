import AdminDashboard from "@/components/pages/Dashboards/Admin/AdminPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Space | Agaseke for Creators",
  description: "Admin dashboard for managing the Agaseke platform.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Admin Space | Agaseke for Creators",
    description: "Admin dashboard for managing the Agaseke platform.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://agaseke.me/admin",
    siteName: "Agaseke",
    images: [
      {
        url: "/agaseke.png",
        width: 1200,
        height: 630,
        alt: "Agaseke Admin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin Space | Agaseke for Creators",
    description: "Admin dashboard for managing the Agaseke platform.",
    images: ["/agaseke.png"],
  },
};

function page() {
  return <AdminDashboard />;
}

export default page;
