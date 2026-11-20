import { Metadata } from "next";
import PayClient from "./PayClient";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { PublicFooter } from "@/components/shell/PublicFooter";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PayStoreOrderPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PublicHeader />
      <main id="main-content" className="flex-1">
        <PayClient />
      </main>
      <PublicFooter />
    </div>
  );
}
