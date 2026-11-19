"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Heart,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  Settings,
  Share2,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { handleLogout } from "@/db/functions/LogOut";
import { toast } from "sonner";
import type { Creator } from "@/types/creator";
import { subscribeToUnreadNotificationCount } from "@/lib/notifications";
import { subscribeToCreatorSettings } from "@/lib/creatorSettings";
import { submitUserFeedback } from "@/lib/feedback";

const SharePageModal = dynamic(() => import("../SharePage"), { ssr: false });
const NotificationDrawer = dynamic(() => import("@/components/ui/NotificationDrawer"), {
  ssr: false,
});
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { DashboardMobileNav } from "@/components/shell/DashboardMobileNav";
import {
  getNavItems,
  isNavItemActive,
  isNavLink,
  type NavFeatureFlags,
  type NavLinkItem,
} from "@/config/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

interface DashboardLayoutProps {
  children: ReactNode;
}

function CreatorNavList({
  items,
  onNavigate,
}: {
  items: NavLinkItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={t("nav.creatorNavigation")} className="space-y-1">
      {items.map((item) => {
        const active = isNavItemActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-body font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              active
                ? "bg-brand-soft text-brand-strong"
                : "text-muted-fg hover:bg-surface-raised hover:text-fg",
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0",
                active ? "text-brand-strong" : "text-muted-fg",
              )}
              aria-hidden="true"
            />
            <span className="truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { creator, isAdmin, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [creatorSettings, setCreatorSettings] = useState<Creator | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    referralLikelihood: 0,
    loveScale: 0,
    message: "",
  });
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!creator?.handle) return;
    const unsubscribe = subscribeToCreatorSettings(creator.handle, (data) => {
      if (data) setCreatorSettings(data);
    });
    return () => unsubscribe();
  }, [creator?.handle]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeToUnreadNotificationCount(
      user.uid,
      setUnreadCount,
      (error) => {
        console.error("Failed to load notification count:", error);
        setUnreadCount(0);
      },
    );

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const features: NavFeatureFlags = {
    store: !!creatorSettings?.storeEnabled,
    gatherings: !!creatorSettings?.gatheringsEnabled,
    bookings: !!creatorSettings?.bookingEnabled,
    giveaways: !!creatorSettings?.giveawayEnabled,
    messaging: creatorSettings?.messagingEnabled !== false,
    community: !!creatorSettings?.communityEnabled,
  };

  const navItems = getNavItems({
    surface: "creator",
    role: "creator",
    slot: "desktop",
    features,
  });
  const navLinks = navItems.filter(isNavLink);
  const activeItem = navLinks.find((item) => isNavItemActive(item, pathname));
  const pageTitle =
    pathname === "/creator"
      ? t("nav.overview")
      : activeItem
        ? t(activeItem.labelKey)
        : (pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ??
          t("nav.home"));

  const copyLink = async () => {
    if (!creator?.handle) return;
    try {
      await navigator.clipboard.writeText(`agaseke.me/${creator.handle}`);
      setCopied(true);
      toast.success(t("creatorLayout.pageLinkCopied"));
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("creatorLayout.copyPageLink"));
    }
  };

  const handleShare = async () => {
    if (!creator?.handle) return;
    const url = `https://agaseke.me/${creator.handle}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: creator.name || "Agaseke Creator",
          text: `Support ${creator.name} on Agaseke`,
          url,
        });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.referralLikelihood === 0 || feedback.loveScale === 0) {
      toast.error(t("creatorLayout.feedbackRatingRequired"));
      return;
    }
    setFeedbackLoading(true);
    try {
      await submitUserFeedback({
        creatorId: creator?.uid || "unknown",
        handle: creator?.handle || "unknown",
        referralLikelihood: feedback.referralLikelihood,
        loveScale: feedback.loveScale,
        message: feedback.message,
      });
      toast.success(t("creatorLayout.feedbackThanks"));
      setShowFeedback(false);
      setFeedback({ referralLikelihood: 0, loveScale: 0, message: "" });
    } catch {
      toast.error(t("creatorLayout.feedbackFailed"));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const sidebarFooter = (
    <div className="rounded-card border border-line bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-caption font-bold uppercase tracking-wide text-muted-fg">
          {t("creatorLayout.yourPage")}
        </span>
        <button
          type="button"
          onClick={copyLink}
          aria-label={t("creatorLayout.copyPageLink")}
          className="flex size-11 items-center justify-center rounded-control text-muted-fg outline-none transition-colors hover:bg-surface hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
        >
          {copied ? (
            <Check className="size-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="mb-3 truncate text-label font-medium text-muted-fg">
        agaseke.me/{creator?.handle || "..."}
      </p>
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => setShowShareModal(true)}
          trailingIcon={<Share2 className="size-4" aria-hidden="true" />}
        >
          {t("nav.sharePage")}
        </Button>
        {creator?.handle && (
          <Link
            href={`/${creator.handle}`}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control px-3 text-caption font-semibold text-muted-fg outline-none transition-colors hover:bg-surface hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span>{t("nav.viewProfile")}</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <AppShell
        padded={false}
        width="full"
        bottomNav={
          <DashboardMobileNav surface="creator" role="creator" features={features} />
        }
        sidebar={
          <Sidebar
            items={navItems}
            navLabel={t("nav.creatorNavigation")}
            brand={
              <Link
                href="/creator"
                className="inline-flex min-h-11 items-center gap-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="flex size-8 items-center justify-center rounded-control bg-brand-strong text-label font-black text-on-brand">
                  A
                </span>
                <span className="font-bold uppercase tracking-tight text-fg">
                  agaseke.me
                </span>
              </Link>
            }
            footer={sidebarFooter}
          />
        }
        topbar={
          <div className="mx-auto flex h-16 w-full max-w-app items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton
                label={t("nav.openMenu")}
                icon={<Menu />}
                variant="ghost"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden"
              />
              <h1 className="truncate text-label font-bold capitalize text-fg sm:text-body">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <IconButton
                label={t("creator.shareMyLink")}
                icon={<Share2 />}
                variant="ghost"
                onClick={handleShare}
              />
              <IconButton
                label={t("nav.feedback")}
                icon={<MessageSquare />}
                variant="ghost"
                onClick={() => setShowFeedback(true)}
                className="hidden md:inline-flex"
              />
              <div className="relative">
                <IconButton
                  label={t("nav.notifications")}
                  icon={<Bell />}
                  variant="ghost"
                  onClick={() => setShowNotifications(true)}
                />
                {unreadCount > 0 && (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-brand-strong px-1 text-caption font-bold leading-4 text-on-brand">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDropdown((value) => !value)}
                  aria-expanded={showDropdown}
                  aria-haspopup="menu"
                  className="flex min-h-11 items-center gap-2 rounded-control p-1 pr-2 outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="hidden text-right md:block">
                    <span className="block text-caption font-bold leading-tight text-fg">
                      {creator?.name}
                    </span>
                    <span className="block text-caption font-medium leading-tight text-muted-fg">
                      @{creator?.handle}
                    </span>
                  </span>
                  <Avatar
                    src={creator?.profilePicture}
                    name={creator?.name || creator?.handle}
                    size="sm"
                  />
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-fg transition-transform",
                      showDropdown && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {showDropdown && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-60 rounded-card border border-line bg-surface py-2 shadow-float"
                  >
                    <div className="border-b border-line px-4 py-2">
                      <p className="truncate text-label font-bold text-fg">
                        {creator?.name}
                      </p>
                      <p className="truncate text-caption text-muted-fg">
                        @{creator?.handle}
                      </p>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setShowDropdown(false)}
                        className="flex min-h-11 items-center gap-3 px-4 text-label font-semibold text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                      >
                        <Briefcase className="size-4" aria-hidden="true" />
                        {t("nav.adminDashboard")}
                      </Link>
                    )}
                    {creator?.handle && (
                      <Link
                        href={`/${creator.handle}`}
                        role="menuitem"
                        onClick={() => setShowDropdown(false)}
                        className="flex min-h-11 items-center gap-3 px-4 text-label font-medium text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        {t("nav.viewProfile")}
                      </Link>
                    )}
                    <Link
                      href="/supporter"
                      role="menuitem"
                      onClick={() => setShowDropdown(false)}
                      className="flex min-h-11 items-center gap-3 px-4 text-label font-medium text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                    >
                      <UserCircle className="size-4" aria-hidden="true" />
                      {t("nav.supporterView")}
                    </Link>
                    <Link
                      href="/creator/settings"
                      role="menuitem"
                      onClick={() => setShowDropdown(false)}
                      className="flex min-h-11 items-center gap-3 px-4 text-label font-medium text-muted-fg transition-colors hover:bg-surface-raised hover:text-fg"
                    >
                      <Settings className="size-4" aria-hidden="true" />
                      {t("nav.accountSettings")}
                    </Link>
                    <div className="my-1 h-px bg-line" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      className="flex min-h-11 w-full items-center gap-3 px-4 text-label font-medium text-danger transition-colors hover:bg-danger-bg"
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      {t("nav.logOut")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      >
        {children}
      </AppShell>

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={t("nav.menu")}
        size="sm"
        contentClassName="p-3"
      >
        <CreatorNavList items={navLinks} onNavigate={() => setMobileNavOpen(false)} />
        <div className="mt-4 border-t border-line pt-4">{sidebarFooter}</div>
      </Drawer>

      <Dialog
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        title={t("creatorLayout.feedbackTitle")}
        description={t("creatorLayout.feedbackDescription")}
        preventClose={feedbackLoading}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowFeedback(false)}
              disabled={feedbackLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              form="creator-feedback-form"
              loading={feedbackLoading}
              leadingIcon={<Send className="size-4" aria-hidden="true" />}
            >
              {t("creatorLayout.sendFeedback")}
            </Button>
          </div>
        }
      >
        <form
          id="creator-feedback-form"
          onSubmit={handleFeedbackSubmit}
          className="space-y-6"
        >
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-label font-bold text-fg">
              <Share2 className="size-4" aria-hidden="true" />
              {t("creatorLayout.recommend")}
            </legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={feedback.referralLikelihood === num}
                  onClick={() => setFeedback({ ...feedback, referralLikelihood: num })}
                  className={cn(
                    "min-h-12 rounded-control border text-body font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                    feedback.referralLikelihood === num
                      ? "border-brand-strong bg-brand-strong text-on-brand"
                      : "border-line-strong bg-surface text-muted-fg hover:bg-surface-raised",
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-label font-bold text-fg">
              <Heart className="size-4" aria-hidden="true" />
              {t("creatorLayout.love")}
            </legend>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={feedback.loveScale === num}
                  onClick={() => setFeedback({ ...feedback, loveScale: num })}
                  className={cn(
                    "min-h-12 rounded-control border text-body font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                    feedback.loveScale === num
                      ? "border-brand-strong bg-brand-strong text-on-brand"
                      : "border-line-strong bg-surface text-muted-fg hover:bg-surface-raised",
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </fieldset>

          <Textarea
            label={t("creatorLayout.suggestions")}
            placeholder={t("creatorLayout.suggestionsPlaceholder")}
            required
            value={feedback.message}
            onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
          />
        </form>
      </Dialog>

      {showShareModal && (
        <SharePageModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      )}

      {showNotifications && user?.uid && (
        <NotificationDrawer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          userId={user.uid}
        />
      )}
    </>
  );
}
