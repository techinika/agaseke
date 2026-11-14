import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LockedPostCard } from "@/features/content";
import { PostCard } from "@/features/content";

const basePost = {
  id: "post-1",
  title: "My new track",
  description: "A short description of the post.",
  type: "text" as const,
  isPrivate: false,
};

describe("LockedPostCard", () => {
  it("renders locked state with supporters-only badge and unlock button", () => {
    render(
      <LockedPostCard
        post={{ ...basePost, isPrivate: true, price: 1000, currency: "RWF" }}
        onUnlock={vi.fn()}
      />,
    );

    expect(screen.getByText("Supporters only")).toBeInTheDocument();
    expect(screen.getByText("1,000 RWF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Support to unlock" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Support to unlock",
      }),
    ).toBeInTheDocument();
  });

  it("calls onUnlock when the unlock button is pressed", () => {
    const onUnlock = vi.fn();
    render(
      <LockedPostCard post={{ ...basePost, isPrivate: true }} onUnlock={onUnlock} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Support to unlock" }));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("renders without price when none is set", () => {
    render(<LockedPostCard post={{ ...basePost, isPrivate: true }} onUnlock={vi.fn()} />);

    expect(screen.getByText("Supporters only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Support to unlock" })).toBeInTheDocument();
  });
});

describe("PostCard", () => {
  it("renders title, description and interaction buttons", () => {
    render(
      <PostCard post={basePost} onOpen={vi.fn()} onLike={vi.fn()} onShare={vi.fn()} />,
    );

    expect(screen.getByText("My new track")).toBeInTheDocument();
    expect(screen.getByText("A short description of the post.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onOpen when the title is pressed", () => {
    const onOpen = vi.fn();
    render(<PostCard post={basePost} onOpen={onOpen} />);

    fireEvent.click(screen.getByText("My new track"));
    expect(onOpen).toHaveBeenCalledWith("post-1");
  });

  it("calls onLike when the like button is pressed", () => {
    const onLike = vi.fn();
    render(<PostCard post={basePost} onLike={onLike} />);

    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    expect(onLike).toHaveBeenCalledWith("post-1");
  });

  it("calls onShare when the share button is pressed", () => {
    const onShare = vi.fn();
    render(<PostCard post={basePost} onShare={onShare} />);

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalledWith("post-1");
  });
});
