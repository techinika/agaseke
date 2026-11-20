import AuthGuard from "@/auth/AuthGuard";
import { SupporterShell } from "@/components/shell/SupporterShell";

export default function SupporterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SupporterShell>
      <AuthGuard>{children}</AuthGuard>
    </SupporterShell>
  );
}
