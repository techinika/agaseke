import { PublicFooter } from "@/components/shell/PublicFooter";
import { PublicHeader } from "@/components/shell/PublicHeader";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
