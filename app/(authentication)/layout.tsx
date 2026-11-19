import { AuthShell } from "@/components/shell/AuthShell";

export default function AuthenticationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthShell>{children}</AuthShell>;
}
