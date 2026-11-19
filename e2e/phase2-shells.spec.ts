import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expectNoSeriousA11y, trackConsoleErrors } from "./utils";

const EVIDENCE_DIR = path.resolve("docs/ui-evidence/phase2-shells");

const MODES = [
  {
    label: "mobile-360-light",
    viewport: { width: 360, height: 640 },
    colorScheme: "light" as const,
  },
  {
    label: "mobile-360-dark",
    viewport: { width: 360, height: 640 },
    colorScheme: "dark" as const,
  },
  {
    label: "desktop-1280-light",
    viewport: { width: 1280, height: 800 },
    colorScheme: "light" as const,
  },
  {
    label: "desktop-1280-dark",
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark" as const,
  },
];

const ROUTES = [
  { name: "public-shell", path: "/" },
  { name: "auth-shell", path: "/login" },
];

for (const mode of MODES) {
  test.describe(`${mode.label} shells`, () => {
    test.use({ viewport: mode.viewport, colorScheme: mode.colorScheme });

    for (const route of ROUTES) {
      test(`${route.name} renders with skip link and no overflow`, async ({ page }) => {
        const errors = trackConsoleErrors(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);

        await page.keyboard.press("Tab");
        const skipLink = page.getByRole("link", { name: "Skip to content" });
        await expect(skipLink).toBeVisible();
        await expect(page.locator("#main-content")).toHaveCount(1);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(1);

        const dir = path.join(EVIDENCE_DIR, mode.label);
        mkdirSync(dir, { recursive: true });
        await page.screenshot({
          path: path.join(dir, `${route.name}.png`),
          fullPage: true,
        });

        await expectNoSeriousA11y(page, `${mode.label}/${route.name}`);
        expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
      });
    }
  });
}
