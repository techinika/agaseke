import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreatorCommunityPreview } from "@/app/dev/creator-community/Preview";

describe("creator community preview", () => {
  it("renders community tiers and membership counts", () => {
    render(<CreatorCommunityPreview surface="community" />);
    expect(screen.getByRole("heading", { name: /community/i })).toBeInTheDocument();
    expect(screen.getByText("Inner Circle")).toBeInTheDocument();
    expect(screen.getByText("42 members")).toBeInTheDocument();
  });

  it("switches community tabs to members", () => {
    render(<CreatorCommunityPreview surface="community" />);
    fireEvent.click(screen.getByRole("tab", { name: /members/i }));
    expect(screen.getByText("Marie Claire")).toBeInTheDocument();
    expect(screen.queryByText("Inner Circle")).not.toBeInTheDocument();
  });

  it("renders the chat composer with a labelled input", () => {
    render(<CreatorCommunityPreview surface="chat" />);
    expect(screen.getByLabelText("Message to Inner Circle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("selects a conversation and exposes the reply field", () => {
    render(<CreatorCommunityPreview surface="messages" />);
    fireEvent.click(screen.getByRole("button", { name: /marie claire/i }));
    expect(screen.getByLabelText("Reply")).toBeInTheDocument();
  });

  it("opens the notice dialog from the notices surface", () => {
    render(<CreatorCommunityPreview surface="notices" />);
    fireEvent.click(screen.getByRole("button", { name: /new membership tier/i }));
    expect(screen.getByRole("dialog", { name: /notice preview/i })).toBeInTheDocument();
  });

  it("honours the dialog preview parameter", () => {
    render(<CreatorCommunityPreview surface="notices" dialog="notice" />);
    expect(screen.getByRole("dialog", { name: /notice preview/i })).toBeInTheDocument();
  });
});
