import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { getNavItems, isNavItemActive, isNavLink, NAV_ITEMS } from "@/config/navigation";

describe("Dialog", () => {
  it("renders an accessible modal and closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Publish post?" description="Visible to all">
        Body
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Publish post?" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByText("Visible to all")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when preventClose is set", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Working" preventClose>
        Body
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog", () => {
  it("runs confirmation and cancellation callbacks", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete post?"
        description="This cannot be undone."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("SearchInput", () => {
  it("shows a clear control when it has a value", () => {
    const onClear = vi.fn();
    render(
      <SearchInput
        label="Search"
        value="aline"
        onChange={() => undefined}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("navigation config", () => {
  it("filters by surface, role and slot", () => {
    const creatorDesktop = getNavItems({
      surface: "creator",
      role: "creator",
      slot: "desktop",
    }).map((item) => item.id);

    expect(creatorDesktop).toContain("creator-home");
    expect(creatorDesktop).toContain("creator-settings");
    expect(creatorDesktop).not.toContain("admin-users");

    const creatorMobile = getNavItems({
      surface: "creator",
      role: "creator",
      slot: "mobile",
    }).map((item) => item.id);

    expect(creatorMobile).toContain("creator-more");
    expect(creatorMobile).not.toContain("creator-store");
  });

  it("hides feature-gated items when the feature is disabled", () => {
    const items = getNavItems({
      surface: "creator",
      role: "creator",
      slot: "desktop",
      features: { store: false },
    }).map((item) => item.id);

    expect(items).not.toContain("creator-store");
    expect(items).not.toContain("creator-sales");
    expect(items).toContain("creator-content");
  });

  it("resolves active links and separates actions", () => {
    const settings = NAV_ITEMS.find((item) => item.id === "creator-settings");
    const more = NAV_ITEMS.find((item) => item.id === "creator-more");

    expect(settings && isNavLink(settings)).toBe(true);
    expect(
      settings && isNavLink(settings) && isNavItemActive(settings, "/creator/settings"),
    ).toBe(true);
    expect(
      settings &&
        isNavLink(settings) &&
        isNavItemActive(settings, "/creator/settings/profile"),
    ).toBe(true);
    expect(more && isNavLink(more)).toBe(false);
  });
});
