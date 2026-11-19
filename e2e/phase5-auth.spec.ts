import { test, expect } from "@playwright/test";
import { expectNoSeriousA11y, trackConsoleErrors } from "./utils";

const ROUTES = [
  { name: "login", path: "/login" },
  { name: "onboarding", path: "/dev/auth-onboarding" },
  { name: "verification", path: "/dev/auth-verify" },
];

for (const route of ROUTES) {
  test(`${route.name}: shell, skip link, a11y and no overflow`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeVisible();
    await expect(page.locator("#main-content")).toHaveCount(1);

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

    await expectNoSeriousA11y(page, route.name);
    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });
}

test("onboarding advances through the guided steps to review", async ({ page }) => {
  await page.goto("/dev/auth-onboarding", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await page.waitForTimeout(500);

  for (let step = 1; step <= 5; step += 1) {
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      String(step + 1),
    );
  }

  await expect(page.getByRole("button", { name: /launch my agaseke/i })).toBeVisible();
  await expectNoSeriousA11y(page, "onboarding-review");
});

test("verification reveals the code field after requesting a code", async ({ page }) => {
  await page.goto("/dev/auth-verify", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(page.getByRole("textbox", { name: /verification code/i })).toBeVisible();
  await expectNoSeriousA11y(page, "verification-otp");
});
