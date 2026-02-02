import AuthGuard from "@/auth/AuthGuard";
import DashboardLayout from "@/components/parts/dashboard/Layout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
