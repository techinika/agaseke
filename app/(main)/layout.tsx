import { PublicFooter } from "@/components/shell/PublicFooter";
import { PublicHeader } from "@/components/shell/PublicHeader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
