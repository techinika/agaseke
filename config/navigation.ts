import {
  BookOpen,
  Building2,
  Calendar,
  Compass,
  FileText,
  Gift,
  HandCoins,
  HelpCircle,
  Home,
  Library,
  LogIn,
  Megaphone,
  MoreHorizontal,
  Receipt,
  ScrollText,
  Settings,
  Store,
  Ticket,
  User,
  Users,
  Wallet,
  Banknote,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";

export type NavRole = "guest" | "supporter" | "creator" | "admin";
export type NavSurface = "public" | "supporter" | "creator" | "admin";
export type NavSlot = "desktop" | "mobile" | "more";
export type NavFeature =
  "store" | "gatherings" | "bookings" | "giveaways" | "messaging" | "community";

export interface NavFeatureFlags {
  store?: boolean;
  gatherings?: boolean;
  bookings?: boolean;
  giveaways?: boolean;
  messaging?: boolean;
  community?: boolean;
}

interface NavItemBase {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  roles: NavRole[];
  surface: NavSurface;
  slots: NavSlot[];
  exact?: boolean;
  feature?: NavFeature;
  external?: boolean;
  group?: TranslationKey;
}

export interface NavLinkItem extends NavItemBase {
  href: string;
  action?: never;
}

export interface NavActionItem extends NavItemBase {
  href?: never;
  action: "more";
}

export type NavItem = NavLinkItem | NavActionItem;

export interface GetNavItemsOptions {
  surface: NavSurface;
  role: NavRole;
  slot: NavSlot;
  features?: NavFeatureFlags;
}

const ALL_ROLES: NavRole[] = ["guest", "supporter", "creator", "admin"];
const SIGNED_IN: NavRole[] = ["supporter", "creator", "admin"];

export const NAV_ITEMS: NavItem[] = [
  // Public
  {
    id: "public-feed",
    href: "/supporter",
    labelKey: "nav.feed",
    icon: Home,
    roles: SIGNED_IN,
    surface: "public",
    slots: ["desktop", "mobile"],
    exact: true,
  },
  {
    id: "explore",
    href: "/explore",
    labelKey: "nav.explore",
    icon: Compass,
    roles: ALL_ROLES,
    surface: "public",
    slots: ["desktop", "mobile"],
    exact: true,
  },
  {
    id: "posts",
    href: "/explore/posts",
    labelKey: "nav.posts",
    icon: FileText,
    roles: ALL_ROLES,
    surface: "public",
    slots: ["desktop", "mobile"],
  },
  {
    id: "articles",
    href: "/articles",
    labelKey: "nav.articles",
    icon: BookOpen,
    roles: ALL_ROLES,
    surface: "public",
    slots: ["desktop", "more"],
  },
  {
    id: "help",
    href: "/help-center",
    labelKey: "nav.help",
    icon: HelpCircle,
    roles: ALL_ROLES,
    surface: "public",
    slots: ["more"],
  },
  {
    id: "login",
    href: "/login",
    labelKey: "nav.login",
    icon: LogIn,
    roles: ["guest"],
    surface: "public",
    slots: ["mobile"],
  },
  {
    id: "public-account",
    href: "/profile",
    labelKey: "nav.account",
    icon: User,
    roles: SIGNED_IN,
    surface: "public",
    slots: ["mobile"],
  },
  {
    id: "public-memberships",
    href: "/community/manage",
    labelKey: "nav.memberships",
    icon: Users,
    roles: SIGNED_IN,
    surface: "public",
    slots: ["more"],
  },
  {
    id: "public-transactions",
    href: "/transactions",
    labelKey: "nav.transactions",
    icon: Receipt,
    roles: SIGNED_IN,
    surface: "public",
    slots: ["more"],
  },
  {
    id: "public-bookings",
    href: "/bookings",
    labelKey: "nav.bookings",
    icon: Calendar,
    roles: SIGNED_IN,
    surface: "public",
    slots: ["more"],
  },

  // Supporter
  {
    id: "supporting",
    href: "/supporter",
    labelKey: "nav.feed",
    icon: Home,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "mobile"],
    exact: true,
  },
  {
    id: "supporter-explore",
    href: "/explore",
    labelKey: "nav.explore",
    icon: Compass,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "mobile"],
    exact: true,
  },
  {
    id: "supporter-library",
    href: "/explore/posts",
    labelKey: "nav.posts",
    icon: Library,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "mobile"],
  },
  {
    id: "supporter-articles",
    href: "/articles",
    labelKey: "nav.articles",
    icon: BookOpen,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "more"],
  },
  {
    id: "supporter-more",
    labelKey: "nav.more",
    icon: MoreHorizontal,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["mobile"],
    action: "more",
  },
  {
    id: "supporter-memberships",
    href: "/community/manage",
    labelKey: "nav.memberships",
    icon: Users,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "more"],
    group: "nav.personalSpace",
  },
  {
    id: "supporter-bookings",
    href: "/bookings",
    labelKey: "nav.bookings",
    icon: Calendar,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "more"],
    group: "nav.personalSpace",
  },
  {
    id: "supporter-transactions",
    href: "/transactions",
    labelKey: "nav.transactions",
    icon: Receipt,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "more"],
    group: "nav.personalSpace",
  },
  {
    id: "supporter-account",
    href: "/profile",
    labelKey: "nav.account",
    icon: User,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["desktop", "more"],
    group: "nav.personalSpace",
  },
  {
    id: "supporter-help",
    href: "/help-center",
    labelKey: "nav.help",
    icon: HelpCircle,
    roles: SIGNED_IN,
    surface: "supporter",
    slots: ["more"],
    group: "nav.moreNavigation",
  },

  // Creator
  {
    id: "creator-home",
    href: "/creator",
    labelKey: "nav.home",
    icon: LayoutDashboard,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "mobile"],
    exact: true,
  },
  {
    id: "creator-content",
    href: "/creator/content",
    labelKey: "nav.content",
    icon: FileText,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "mobile"],
  },
  {
    id: "creator-earnings",
    href: "/creator/payouts",
    labelKey: "nav.earnings",
    icon: Wallet,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "mobile"],
  },
  {
    id: "creator-community",
    href: "/creator/community",
    labelKey: "nav.community",
    icon: Users,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "mobile"],
    feature: "community",
  },
  {
    id: "creator-more",
    labelKey: "nav.more",
    icon: MoreHorizontal,
    roles: ["creator"],
    surface: "creator",
    slots: ["mobile"],
    action: "more",
  },
  {
    id: "creator-store",
    href: "/creator/store",
    labelKey: "nav.storeAndSales",
    icon: Store,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    feature: "store",
    group: "nav.store",
  },
  {
    id: "creator-bookings",
    href: "/creator/bookings",
    labelKey: "nav.bookings",
    icon: Calendar,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    feature: "bookings",
    group: "nav.community",
  },
  {
    id: "creator-gatherings",
    href: "/creator/gatherings",
    labelKey: "nav.gatherings",
    icon: Ticket,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    feature: "gatherings",
    group: "nav.community",
  },
  {
    id: "creator-giveaways",
    href: "/creator/giveaways",
    labelKey: "nav.giveaways",
    icon: Gift,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    feature: "giveaways",
    group: "nav.community",
  },
  {
    id: "creator-supporters",
    href: "/creator/supporters",
    labelKey: "nav.supportersAndMessages",
    icon: HandCoins,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    group: "nav.community",
  },
  {
    id: "creator-partners",
    href: "/creator/partners",
    labelKey: "nav.partners",
    icon: Building2,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    group: "nav.content",
  },
  {
    id: "creator-settings",
    href: "/creator/settings",
    labelKey: "nav.settings",
    icon: Settings,
    roles: ["creator"],
    surface: "creator",
    slots: ["desktop", "more"],
    group: "nav.settings",
  },

  // Admin
  {
    id: "admin-overview",
    href: "/admin",
    labelKey: "nav.overview",
    icon: LayoutDashboard,
    roles: ["admin"],
    surface: "admin",
    slots: ["desktop", "mobile"],
    exact: true,
  },
  {
    id: "admin-users",
    href: "/admin/users",
    labelKey: "nav.users",
    icon: Users,
    roles: ["admin"],
    surface: "admin",
    slots: ["desktop", "mobile"],
  },
  {
    id: "admin-payouts",
    href: "/admin/payouts",
    labelKey: "nav.payouts",
    icon: Banknote,
    roles: ["admin"],
    surface: "admin",
    slots: ["desktop", "mobile"],
  },
  {
    id: "admin-more",
    labelKey: "nav.more",
    icon: MoreHorizontal,
    roles: ["admin"],
    surface: "admin",
    slots: ["mobile"],
    action: "more",
  },
  {
    id: "admin-comms",
    href: "/admin/comms",
    labelKey: "nav.commsHub",
    icon: Megaphone,
    roles: ["admin"],
    surface: "admin",
    slots: ["desktop", "more"],
    group: "nav.groupCommunication",
  },
  {
    id: "admin-config",
    href: "/admin/config",
    labelKey: "nav.config",
    icon: Settings,
    roles: ["admin"],
    surface: "admin",
    slots: ["desktop", "more"],
    group: "nav.config",
  },
  {
    id: "admin-logs",
    href: "/admin/logs",
    labelKey: "nav.activityLogs",
    icon: ScrollText,
    roles: ["admin"],
    surface: "admin",
    slots: ["desktop", "more"],
    group: "nav.activityLogs",
  },
];

export function getNavItems({
  surface,
  role,
  slot,
  features,
}: GetNavItemsOptions): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.surface !== surface) return false;
    if (!item.roles.includes(role)) return false;
    if (!item.slots.includes(slot)) return false;
    if (item.feature && features?.[item.feature] === false) return false;
    return true;
  });
}

export function isNavItemActive(
  item: Pick<NavLinkItem, "href" | "exact">,
  pathname: string,
): boolean {
  if (item.exact) return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isNavLink(item: NavItem): item is NavLinkItem {
  return typeof item.href === "string";
}
