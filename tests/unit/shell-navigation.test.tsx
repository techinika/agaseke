import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DashboardMobileNav } from "@/components/shell/DashboardMobileNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { getNavItems } from "@/config/navigation";

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

  it("renders admin destinations in the More sheet", () => {
    render(<DashboardMobileNav surface="admin" role="admin" />);

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("link", { name: "Activity logs" })).toHaveAttribute(
      "href",
      "/admin/logs",
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
});
