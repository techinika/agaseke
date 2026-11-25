import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DashboardMobileNav } from "@/components/shell/DashboardMobileNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { NotificationBellButton } from "@/components/ui/NotificationBellButton";
import { getNavItems, NAV_ITEMS } from "@/config/navigation";
import { t } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  usePathname: () => "/creator",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("DashboardMobileNav", () => {
  it("uses the typed config for dashboard tabs and opens a grouped More sheet", () => {
    render(<DashboardMobileNav surface="creator" role="creator" />);

    expect(
      screen.getByRole("navigation", { name: "Creator navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Earnings" })).toHaveAttribute(
      "href",
      "/creator/payouts",
    );

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    const sheet = screen.getByRole("dialog", { name: "More destinations" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("link", { name: "Store" })).toHaveAttribute(
      "href",
      "/creator/store",
    );
    expect(screen.getByRole("heading", { name: "Community" })).toBeInTheDocument();
  });

  it("respects feature flags in the More sheet", () => {
    render(
      <DashboardMobileNav
        surface="creator"
        role="creator"
        features={{ store: false, community: true }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.queryByRole("link", { name: "Store" })).toBeNull();
    expect(screen.getByRole("link", { name: "Supporters" })).toBeInTheDocument();
  });

  it("renders consolidated admin destinations in the More sheet", () => {
    render(<DashboardMobileNav surface="admin" role="admin" />);

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("link", { name: "Comms" })).toHaveAttribute(
      "href",
      "/admin/comms",
    );
    expect(screen.getByRole("link", { name: "Config" })).toHaveAttribute(
      "href",
      "/admin/config",
    );
    expect(screen.getByRole("link", { name: "Logs" })).toHaveAttribute(
      "href",
      "/admin/logs",
    );
  });

  it("exposes Feed, Explore, Posts, and all account destinations without Notices in supporter mobile nav", () => {
    render(<DashboardMobileNav surface="supporter" role="supporter" />);

    expect(screen.getByRole("link", { name: "Feed" })).toHaveAttribute(
      "href",
      "/supporter",
    );
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.getByRole("link", { name: "Posts" })).toHaveAttribute(
      "href",
      "/explore/posts",
    );
    expect(screen.queryByRole("link", { name: "Notices" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("link", { name: "Memberships" })).toHaveAttribute(
      "href",
      "/community/manage",
    );
    expect(screen.getByRole("link", { name: "Bookings" })).toHaveAttribute(
      "href",
      "/bookings",
    );
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute(
      "href",
      "/transactions",
    );
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });
});

describe("Sidebar", () => {
  it("collapses to labelled icon links", () => {
    const items = getNavItems({
      surface: "creator",
      role: "creator",
      slot: "desktop",
    });

    render(<Sidebar items={items} brand={<span>agaseke.me</span>} />);

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("title", "Home");
  });

  it("renders grouped section headings when expanded", () => {
    const items = getNavItems({
      surface: "creator",
      role: "creator",
      slot: "desktop",
    });

    render(<Sidebar items={items} brand={<span>agaseke.me</span>} />);

    expect(screen.getAllByText("Store")[0].tagName).toBe("P");
    expect(screen.getAllByText("Settings")[0].tagName).toBe("P");
  });

  it("includes every supporter workspace page in the supporter desktop sidebar without notices", () => {
    const items = getNavItems({
      surface: "supporter",
      role: "supporter",
      slot: "desktop",
    });
    const hrefs = items
      .map((item) => ("href" in item ? item.href : undefined))
      .filter(Boolean);

    expect(hrefs).toEqual([
      "/supporter",
      "/explore",
      "/explore/posts",
      "/articles",
      "/community/manage",
      "/bookings",
      "/transactions",
      "/profile",
    ]);
    expect(hrefs).not.toContain("/supporter/notices");
  });

  it("exposes consolidated Comms and Config entries in the admin desktop sidebar", () => {
    const items = getNavItems({
      surface: "admin",
      role: "admin",
      slot: "desktop",
    });
    const hrefs = items
      .map((item) => ("href" in item ? item.href : undefined))
      .filter(Boolean);

    expect(hrefs).toEqual([
      "/admin",
      "/admin/users",
      "/admin/payouts",
      "/admin/comms",
      "/admin/config",
      "/admin/logs",
    ]);
  });

  it("keeps every navigation item title short and avoids combined labels", () => {
    for (const item of NAV_ITEMS) {
      const label = t(item.labelKey);
      expect(label).not.toMatch(/\s*(&|\/|and)\s+/i);
      expect(label.length).toBeLessThanOrEqual(16);
    }
  });
});

describe("Public navigation simplification", () => {
  it("exposes Explore, Posts, and Articles without audience marketing links for guests", () => {
    const desktop = getNavItems({
      surface: "public",
      role: "guest",
      slot: "desktop",
    });
    const hrefs = desktop
      .map((item) => ("href" in item ? item.href : undefined))
      .filter(Boolean);

    expect(hrefs).toEqual(["/explore", "/explore/posts", "/articles"]);
    expect(hrefs).not.toContain("/for-creators");
    expect(hrefs).not.toContain("/for-supporters");
    expect(hrefs).not.toContain("/for-brands");
  });

  it("includes Feed for signed-in users on the public header", () => {
    const desktop = getNavItems({
      surface: "public",
      role: "supporter",
      slot: "desktop",
    });
    const hrefs = desktop
      .map((item) => ("href" in item ? item.href : undefined))
      .filter(Boolean);

    expect(hrefs).toEqual([
      "/supporter",
      "/explore",
      "/explore/posts",
      "/articles",
    ]);
  });
});

describe("NotificationBellButton", () => {
  it("renders two-digit and overflow counts on a single non-wrapping line", () => {
    const { rerender } = render(
      <NotificationBellButton unreadCount={42} onClick={() => {}} />,
    );

    const badge42 = screen.getByText("42");
    expect(badge42).toHaveClass("whitespace-nowrap", "tabular-nums", "leading-none");
    expect(
      screen.getByRole("button", { name: "Notifications (42)" }),
    ).toBeInTheDocument();

    rerender(<NotificationBellButton unreadCount={150} onClick={() => {}} />);

    const badge99Plus = screen.getByText("99+");
    expect(badge99Plus).toHaveClass("whitespace-nowrap", "tabular-nums", "leading-none");
    expect(
      screen.getByRole("button", { name: "Notifications (99+)" }),
    ).toBeInTheDocument();
  });
});

