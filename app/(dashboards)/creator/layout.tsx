import { Metadata } from "next";
import AuthGuard from "@/auth/AuthGuard";
import DashboardLayout from "@/components/parts/dashboard/Layout";
import {
  CreatorBottomNav,
  CREATOR_TABS,
} from "@/components/parts/dashboard/CreatorBottomNav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <DashboardLayout>{children}</DashboardLayout>
      <CreatorBottomNav items={CREATOR_TABS} />
    </AuthGuard>
  );
}
