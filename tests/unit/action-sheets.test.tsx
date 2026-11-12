import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GiveawayEntrySheet } from "@/features/giveaways";
import { FreeRsvpSheet } from "@/features/gatherings";
import { formatActionDate, toActionDate } from "@/features/actions";

const noop = () => undefined;

describe("supporter action sheets", () => {
  it("enters a giveaway and shows the success state", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <GiveawayEntrySheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        creatorVerified
        title="Camera giveaway"
        closesAt={new Date("2026-12-01T12:00:00Z")}
        maxWinners={2}
        rewardCount={3}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enter giveaway" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(screen.getByText("You're in!")).toBeInTheDocument();
    });
  });

  it("shows a retryable failure for a giveaway entry", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Network offline"));

    render(
      <GiveawayEntrySheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        title="Camera giveaway"
        closesAt="2026-12-01"
        maxWinners={1}
        rewardCount={1}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enter giveaway" }));

    await waitFor(() => {
      expect(screen.getByText("Entry not completed")).toBeInTheDocument();
      expect(screen.getByText("Network offline")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
  });

  it("confirms a free RSVP and shows the success state", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <FreeRsvpSheet
        open
        onClose={noop}
        creatorName="Aline Uwase"
        title="Community meetup"
        date="2026-12-12"
        time="18:00"
        location="Kigali"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm RSVP" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(screen.getByText("You're going!")).toBeInTheDocument();
    });
  });
});

describe("action dates", () => {
  it("accepts dates, strings and Firestore-like timestamps", () => {
    expect(toActionDate("not a date")).toBeNull();
    expect(toActionDate(null)).toBeNull();
    expect(toActionDate("2026-12-01")?.getUTCFullYear()).toBe(2026);
    expect(
      toActionDate({ toDate: () => new Date("2026-11-12T00:00:00Z") })?.getUTCDate(),
    ).toBe(12);
    expect(formatActionDate(new Date("2026-12-01T12:00:00Z"))).toContain("2026");
    expect(formatActionDate(undefined)).toBe("");
  });
});
