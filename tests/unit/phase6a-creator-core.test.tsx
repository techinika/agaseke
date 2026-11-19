import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreatorCorePreview } from "@/app/dev/creator-core/Preview";

describe("creator core preview", () => {
  it("renders the creator home surface with shared status badges", () => {
    render(<CreatorCorePreview surface="home" />);
    expect(
      screen.getByRole("heading", { name: /good morning, aline/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Complete").length).toBe(2);
    expect(screen.getByText("Action needed")).toBeInTheDocument();
  });

  it("switches payouts tabs without leaving the preview", () => {
    render(<CreatorCorePreview surface="payouts" />);
    expect(screen.getByText("Withdrawal quote")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));
    expect(screen.getByText("WDL-1042")).toBeInTheDocument();
    expect(screen.queryByText("Withdrawal quote")).not.toBeInTheDocument();
  });

  it("exposes labelled settings controls", () => {
    render(<CreatorCorePreview surface="settings" />);
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByLabelText("Handle")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary currency")).toBeInTheDocument();
  });

  it("opens the broadcast dialog from the supporters surface", () => {
    render(<CreatorCorePreview surface="supporters" />);
    fireEvent.click(screen.getByRole("button", { name: /send broadcast/i }));
    expect(screen.getByRole("dialog", { name: /send a broadcast/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
  });

  it("honours the dialog preview parameter", () => {
    render(<CreatorCorePreview surface="supporters" dialog="broadcast" />);
    expect(screen.getByRole("dialog", { name: /send a broadcast/i })).toBeInTheDocument();
  });
});
