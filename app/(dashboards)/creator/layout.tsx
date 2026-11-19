import { Metadata } from "next";
import AuthGuard from "@/auth/AuthGuard";
import DashboardLayout from "@/components/parts/dashboard/Layout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardLayout>
      <AuthGuard>{children}</AuthGuard>
    </DashboardLayout>
  );
}
