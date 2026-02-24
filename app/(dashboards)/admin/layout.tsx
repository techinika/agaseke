import AuthGuard from "@/auth/AuthGuard";
import DashboardLayout from "@/components/parts/dashboard/Layout";
import Navbar from "@/components/parts/Navigation";
import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <Navbar />
      <nav className="sticky top-0 z-40 bg-[#FBFBFC]/80 backdrop-blur-md border-b border-slate-200 px-6 mb-10 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center gap-8 py-4">
          <Link
            href="/admin"
            className="text-xs font-black uppercase tracking-widest text-orange-600 border-b-2 border-orange-600 pb-4 -mb-4 whitespace-nowrap"
          >
            Overview
          </Link>
          <Link
            href="/admin/payouts"
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors pb-4 -mb-4 whitespace-nowrap"
          >
            Payouts
          </Link>
          <Link
            href="/admin/comms"
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors pb-4 -mb-4 whitespace-nowrap"
          >
            Broadcast
          </Link>
        </div>
      </nav>
      {children}
    </AuthGuard>
  );
}
