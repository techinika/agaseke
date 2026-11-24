import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "@/app/loading";
import CreatorLoading from "@/app/(dashboards)/creator/loading";
import SupporterLoading from "@/app/(dashboards)/supporter/loading";
import AdminLoading from "@/app/(dashboards)/admin/loading";
import ExploreLoading from "@/app/(supporter_portal)/explore/loading";
import ProfileLoading from "@/app/(public_profile)/[username]/loading";
import { LoadingState } from "@/components/ui/LoadingState";
import { getNavItems } from "@/config/navigation";

describe("Loading states", () => {
  it("renders a calm, non-blocking loading status with accessible semantics", () => {
    const { container } = render(<Loading />);
    const status = screen.getByRole("status", { name: "Loading" });
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("renders layout-matched variants and custom labels without blocking", () => {
    const { rerender, container } = render(
      <LoadingState variant="dashboard" label="Loading workspace" />,
    );
    expect(screen.getByRole("status", { name: "Loading workspace" })).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getByText("Loading workspace…")).toBeInTheDocument();

    for (const variant of ["page", "dashboard", "feed", "list", "form"] as const) {
      rerender(<LoadingState variant={variant} />);
      expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
      expect(container.querySelector(".fixed.inset-0")).toBeNull();
    }
  });

  it("renders route-specific loading boundaries for dashboards and explore", () => {
    render(<CreatorLoading />);
    expect(screen.getByRole("status", { name: "Loading workspace" })).toBeInTheDocument();

    render(<SupporterLoading />);
    expect(screen.getByRole("status", { name: "Loading feed" })).toBeInTheDocument();

    render(<AdminLoading />);
    expect(
      screen.getByRole("status", { name: "Loading admin console" }),
    ).toBeInTheDocument();

    render(<ExploreLoading />);
    expect(screen.getByRole("status", { name: "Loading explore" })).toBeInTheDocument();
  });

  it("renders the creator profile skeleton for public profile transitions", () => {
    render(<ProfileLoading />);
    const status = screen.getByRole("status", { name: "Loading creator page" });
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("keeps consolidated creator store and sales navigation entry intact", () => {
    const desktopItems = getNavItems({
      surface: "creator",
      role: "creator",
      slot: "desktop",
      features: { store: true },
    });
    const storeItem = desktopItems.find((item) => item.id === "creator-store");
    expect(storeItem).toBeDefined();
    expect(storeItem?.labelKey).toBe("nav.storeAndSales");
  });
});
