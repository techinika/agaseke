import { test, expect, type Page } from "@playwright/test";
import { capture, expectNoSeriousA11y, trackConsoleErrors } from "./utils";

type Shot = {
  name: string;
  query: string;
  dialog?: boolean;
  run?: (page: Page) => Promise<void>;
};

const SHOTS: Shot[] = [
  { name: "20-actions-index", query: "" },
  { name: "21-support", query: "?open=support", dialog: true },
  { name: "22-community", query: "?open=community", dialog: true },
  { name: "23-giveaway", query: "?open=giveaway", dialog: true },
  {
    name: "24-giveaway-success",
    query: "?open=giveaway",
    dialog: true,
    run: async (page) => {
      await page.getByRole("button", { name: "Enter giveaway" }).click();
      await page.getByText("You're in!").waitFor();
    },
  },
  { name: "25-rsvp", query: "?open=rsvp", dialog: true },
  { name: "26-ticket", query: "?open=ticket", dialog: true },
  { name: "27-checkout-review", query: "?open=checkout", dialog: true },
  {
    name: "28-checkout-delivery",
    query: "?open=checkout",
    dialog: true,
    run: async (page) => {
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Full name").waitFor();
    },
  },
  {
    name: "29-checkout-payment",
    query: "?open=checkout",
    dialog: true,
    run: async (page) => {
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Full name").fill("Aline Supporter");
      await page.getByLabel("Phone number").fill("078 123 4567");
      await page.getByLabel("Street address").fill("KG 1 Ave");
      await page.getByLabel("City").fill("Kigali");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Place order" }).waitFor();
    },
  },
  { name: "30-checkout-old", query: "?open=checkout-old" },
];

for (const shot of SHOTS) {
  test(`${shot.name}`, async ({ page }, testInfo) => {
    const errors = trackConsoleErrors(page);

    await page.goto(`/dev/actions${shot.query}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    if (shot.dialog) {
      await page.getByRole("dialog").waitFor({ state: "visible" });
    }
    if (shot.run) await shot.run(page);
    await page.waitForTimeout(300);

    await capture(page, testInfo, shot.name, !shot.dialog);
    if (shot.dialog) {
      await expectNoSeriousA11y(page, shot.name);
    }

    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });
}
