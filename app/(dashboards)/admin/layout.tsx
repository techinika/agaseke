"use client";

import AuthGuard from "@/auth/AuthGuard";
import Navbar from "@/components/parts/Navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link
      href={href}
      className={`text-xs font-black uppercase tracking-widest pb-4 -mb-4 whitespace-nowrap transition-colors ${
        isActive
          ? "text-orange-600 border-b-2 border-orange-600"
          : "text-slate-400 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

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
          <NavItem href="/admin">Overview</NavItem>
          <NavItem href="/admin/users">Users</NavItem>
          <NavItem href="/admin/payouts">Payouts</NavItem>
          <NavItem href="/admin/comms">Broadcast</NavItem>
          <NavItem href="/admin/logs">Activity Logs</NavItem>
        </div>
      </nav>
      {children}
    </AuthGuard>
  );
}
