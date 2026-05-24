"use client";

import AuthGuard from "@/auth/AuthGuard";
import Navbar from "@/components/parts/Navigation";
import { NavItem } from "./admin-nav/index";

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
          <NavItem href="/admin/changelog">Changelog</NavItem>
          <NavItem href="/admin/feedback">Feedback</NavItem>
          <NavItem href="/admin/logs">Activity Logs</NavItem>
        </div>
      </nav>
      {children}
    </AuthGuard>
  );
}
