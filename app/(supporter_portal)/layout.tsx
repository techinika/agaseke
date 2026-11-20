import { SupporterPortalShell } from "@/components/shell/SupporterPortalShell";

export default function SupporterPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SupporterPortalShell>{children}</SupporterPortalShell>;
}
