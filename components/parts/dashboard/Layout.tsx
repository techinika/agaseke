/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Plus,
  Copy,
  Check,
  Share2,
  Settings,
  LogOut,
  User,
  UserCircle,
  ChevronDown,
  Menu,
  X,
  Briefcase,
  Store,
  Building2,
  Users,
  Bell,
  MessageSquare,
  Send,
  Heart,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import { handleLogout } from "@/db/functions/LogOut";
import { toast } from "sonner";
import SharePageModal from "../SharePage";
import { auth, db } from "@/db/firebase";
import { doc, onSnapshot, collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { Creator } from "@/types/creator";
import NotificationDrawer from "@/components/ui/NotificationDrawer";
import { NavItem, ExpandableNavItem } from "./layout-parts/index";
import ThemeToggle from "../ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { creator, isAdmin, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [creatorSettings, setCreatorSettings] = useState<Creator | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState({ referralLikelihood: 0, loveScale: 0, message: "" });

  useEffect(() => {
    if (!creator?.handle) return;
    const unsubscribe = onSnapshot(
      doc(db, "creators", creator.handle),
      (doc) => {
        if (doc.exists()) {
          setCreatorSettings(doc.data() as Creator);
        }
      },
    );
    return () => unsubscribe();
  }, [creator?.handle]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsub();
  }, [user?.uid]);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [pathname]);

  // Handle dropdown click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyLink = () => {
    if (!creator?.handle) return;
    navigator.clipboard.writeText(`agaseke.me/${creator.handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.referralLikelihood === 0 || feedback.loveScale === 0) {
      toast.error("Please provide a rating for both scales!");
      return;
    }
    setFeedbackLoading(true);
    try {
      await addDoc(collection(db, "userFeedback"), {
        creatorId: creator?.uid || "unknown",
        handle: creator?.handle || "unknown",
        ...feedback,
        createdAt: serverTimestamp(),
      });
      toast.success("Feedback received! Thank you for helping Agaseke grow.");
      setShowFeedback(false);
      setFeedback({ referralLikelihood: 0, loveScale: 0, message: "" });
    } catch { toast.error("Could not send feedback. Try again later."); }
    finally { setFeedbackLoading(false); }
  };

  return (
    <div className="min-h-screen bg-muted block md:flex text-foreground overflow-x-hidden md:overflow-hidden">
      {/* 1. Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60] md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-[100] w-64 bg-card border-r border-border 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:sticky md:top-0 md:flex md:flex-col md:h-screen
      `}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                A
              </div>
              <span className="font-bold tracking-tight uppercase">
                agaseke.me
              </span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-muted-foreground p-1"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-1 flex-1">
            <NavItem
              href="/creator"
              icon={<BarChart3 size={18} />}
              label="Overview"
              active={pathname === "/creator"}
            />
            <ExpandableNavItem
              icon={<Plus size={18} />}
              label="Content"
              activeSub={pathname}
              subItems={[
                { href: "/creator/content", label: "Posts" },
                { href: "/creator/notices", label: "Notices" },
              ]}
            />
            <ExpandableNavItem
              icon={<Store size={18} />}
              label="Commerce"
              activeSub={pathname}
              subItems={[
                ...(creatorSettings?.storeEnabled
                  ? [{ href: "/creator/store", label: "Store" }]
                  : []),
                ...(creatorSettings?.storeEnabled
                  ? [{ href: "/creator/sales", label: "Sales" }]
                  : []),
              ]}
            />
            <ExpandableNavItem
              icon={<Users size={18} />}
              label="Community"
              activeSub={pathname}
              subItems={[
                ...(creatorSettings?.gatheringsEnabled
                  ? [{ href: "/creator/gatherings", label: "Events" }]
                  : []),
                ...(creatorSettings?.bookingEnabled
                  ? [{ href: "/creator/bookings", label: "Bookings" }]
                  : []),
                ...(creatorSettings?.giveawayEnabled
                  ? [{ href: "/creator/giveaways", label: "Giveaways" }]
                  : []),
                ...(creatorSettings?.messagingEnabled !== false
                  ? [{ href: "/creator/messages", label: "Messages" }]
                  : []),
                ...(creatorSettings?.communityEnabled
                  ? [{ href: "/creator/community", label: "Tiers" }]
                  : []),
                { href: "/creator/supporters", label: "Supporters" },
              ]}
            />
            <NavItem
              href="/creator/partners"
              icon={<Building2 size={18} />}
              label="Partners"
              active={pathname === "/creator/partners"}
            />
            <ExpandableNavItem
              icon={<Settings size={18} />}
              label="Account"
              activeSub={pathname}
              subItems={[
                { href: "/creator/verify", label: "Verify" },
                { href: "/creator/payouts", label: "Payouts" },
                { href: "/creator/settings", label: "Settings" },
              ]}
            />
          </nav>

          <div className="mt-auto p-4 bg-muted border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Your Page
              </span>
              {copied ? (
                <Check size={12} className="text-green-500" />
              ) : (
                <button onClick={copyLink}>
                  <Copy
                    size={12}
                    className="text-muted-foreground hover:text-orange-600"
                  />
                </button>
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground truncate mb-3">
              agaseke.me/{creator?.handle || "..."}
            </p>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-2 bg-card border border-border rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-muted transition"
            >
              Share Page <Share2 size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full md:h-screen md:overflow-y-auto">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 w-full">
          <div className="flex items-center gap-4">
            {/* Mobile Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg transition"
            >
              <Menu size={20} />
            </button>

            <h2 className="text-sm font-semibold text-muted-foreground capitalize">
              {pathname.split("/").pop() === "creator"
                ? "Overview"
                : pathname.split("/").pop()?.replace("-", " ")}
            </h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <ThemeToggle />
            <button
              onClick={() => setShowFeedback(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-orange-600 hidden md:block"
              title="Feedback"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Bell size={20} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 md:gap-3 p-1 pr-2 hover:bg-muted rounded-full transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    {creator?.name}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                    @{creator?.handle}
                  </p>
                </div>

                <div className="w-8 h-8 bg-muted rounded-full border border-border flex items-center justify-center text-xs font-bold overflow-hidden">
                  {creator?.profilePicture ? (
                    <img
                      src={creator?.profilePicture}
                      alt={creator?.name || "Creator"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-muted-foreground" />
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl py-2 animate-in fade-in zoom-in-95 duration-100 z-50">
                  <div className="px-4 py-2 border-b border-border mb-1 sm:hidden">
                    <p className="text-xs font-bold text-foreground">
                      {creator?.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      @{creator?.handle}
                    </p>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted-foreground rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <Briefcase size={18} /> Admin Space
                    </Link>
                  )}
                  <Link
                    href="/supporter"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-orange-600 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <UserCircle size={18} /> Supporter View
                  </Link>
                  <Link
                    href="/creator/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings size={18} /> Account Settings
                  </Link>
                  <div className="h-px bg-muted my-1 mx-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden w-full">{children}</main>
      </div>

      <SharePageModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user?.uid || ""}
      />

      {showFeedback && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-0 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => !feedbackLoading && setShowFeedback(false)} />
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <header className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
              <div>
                <h3 className="font-bold text-foreground">Help us improve</h3>
                <p className="text-xs text-muted-foreground">Your ideas shape the future of Agaseke.</p>
              </div>
              <button onClick={() => setShowFeedback(false)} className="text-muted-foreground hover:text-foreground p-1"><X size={20} /></button>
            </header>
            <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Share2 size={14} /> Would you recommend Agaseke?</label>
                <div className="flex justify-between gap-2">
                  {[1,2,3,4,5].map((num) => (
                    <button key={num} type="button" onClick={() => setFeedback({...feedback, referralLikelihood: num})}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${feedback.referralLikelihood === num ? "bg-orange-600 text-white shadow-md shadow-orange-100 scale-105" : "bg-muted text-muted-foreground hover:bg-muted"}`}>{num}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Heart size={14} /> How much do you love Agaseke?</label>
                <div className="flex justify-between gap-2">
                  {[1,2,3,4,5].map((num) => (
                    <button key={num} type="button" onClick={() => setFeedback({...feedback, loveScale: num})}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${feedback.loveScale === num ? "bg-orange-600 text-white shadow-md shadow-orange-100 scale-105" : "bg-muted text-muted-foreground hover:bg-muted"}`}>{num}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggestions & Appreciations</label>
                <textarea required placeholder="Tell us what's on your mind..." className="w-full h-32 p-4 bg-muted border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors"
                  value={feedback.message} onChange={(e) => setFeedback({...feedback, message: e.target.value})} />
              </div>
              <button type="submit" disabled={feedbackLoading} className="w-full py-4 bg-foreground text-background rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50">
                {feedbackLoading ? <Loader className="animate-spin" size={20} /> : <><Send size={18} /> Send Feedback</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


