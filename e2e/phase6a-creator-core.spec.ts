import { test, expect } from "@playwright/test";
import { expectNoSeriousA11y, trackConsoleErrors } from "./utils";

const ROUTES = [
  {
    name: "home",
    path: "/dev/creator-core?surface=home",
    heading: /good morning, aline/i,
  },
  { name: "payouts", path: "/dev/creator-core?surface=payouts", heading: /payouts/i },
  { name: "settings", path: "/dev/creator-core?surface=settings", heading: /settings/i },
  { name: "sales", path: "/dev/creator-core?surface=sales", heading: /sales/i },
  {
    name: "supporters",
    path: "/dev/creator-core?surface=supporters",
    heading: /supporters/i,
  },
  {
    name: "broadcast",
    path: "/dev/creator-core?surface=supporters&dialog=broadcast",
    heading: /send a broadcast/i,
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

    await expectNoSeriousA11y(page, `phase6a/${route.name}`);
    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });
}

test("payouts tabs switch within the preview", async ({ page }) => {
  await page.goto("/dev/creator-core?surface=payouts", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Withdrawal quote")).toBeVisible();
  await page.getByRole("tab", { name: /history/i }).click();
  await expect(page.getByText("WDL-1042")).toBeVisible();
  await expect(page.getByText("Withdrawal quote")).toHaveCount(0);
});

test("settings toggles expose switch state", async ({ page }) => {
  await page.goto("/dev/creator-core?surface=settings", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: /features/i }).click();
  const messaging = page.getByRole("switch", { name: /messaging/i });
  await expect(messaging).toHaveAttribute("aria-checked", "true");
  await messaging.click();
  await expect(messaging).toHaveAttribute("aria-checked", "false");
});
