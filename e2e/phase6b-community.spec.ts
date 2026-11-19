import { test, expect } from "@playwright/test";
import { expectNoSeriousA11y, trackConsoleErrors } from "./utils";

const ROUTES = [
  {
    name: "community",
    path: "/dev/creator-community?surface=community",
    heading: /^community$/i,
  },
  { name: "chat", path: "/dev/creator-community?surface=chat", heading: /inner circle/i },
  {
    name: "messages",
    path: "/dev/creator-community?surface=messages",
    heading: /messages/i,
  },
  {
    name: "notices",
    path: "/dev/creator-community?surface=notices",
    heading: /notices/i,
  },
  {
    name: "notice-dialog",
    path: "/dev/creator-community?surface=notices&dialog=notice",
    heading: /notice preview/i,
  },
];

for (const route of ROUTES) {
  test(`${route.name}: shell, heading, a11y and no overflow`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeVisible();
    await expect(page.locator("#main-content")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: route.heading }).first(),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(1);

    const smallTargets = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
          "a, button, input, select, textarea, [role='button']",
        ),
      );
      return elements
        .filter((element) => !element.classList.contains("sr-only"))
        .map((element) => ({
          label:
            element.getAttribute("aria-label") ||
            element.textContent?.trim() ||
            element.tagName,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0)
        .filter(({ rect }) => rect.width < 44 || rect.height < 44)
        .map(({ label }) => label);
    });
    expect(smallTargets, `small targets: ${smallTargets.join(", ")}`).toEqual([]);

    await expectNoSeriousA11y(page, `phase6b/${route.name}`);
    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });
}

test("community tabs switch within the preview", async ({ page }) => {
  await page.goto("/dev/creator-community?surface=community", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Inner Circle")).toBeVisible();
  await page.getByRole("tab", { name: /members/i }).click();
  await expect(page.getByText("Marie Claire")).toBeVisible();
  await expect(page.getByText("Inner Circle")).toHaveCount(0);
});

test("notice dialog closes from the footer action", async ({ page }) => {
  await page.goto("/dev/creator-community?surface=notices&dialog=notice", {
    waitUntil: "domcontentloaded",
  });
  await page.locator("nextjs-portal").evaluate((node) => node.remove());
  const dialog = page.getByRole("dialog", { name: /notice preview/i });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: /^close$/i })
    .last()
    .click();
  await expect(dialog).toHaveCount(0);
});
