import { test, expect } from "@playwright/test";
import { capture, expectNoSeriousA11y, trackConsoleErrors } from "./utils";

type Route = {
  name: string;
  path: string;
  fullPage?: boolean;
  interactive?: boolean;
};

const ROUTES: Route[] = [
  { name: "01-home", path: "/" },
  { name: "02-explore", path: "/explore" },
  { name: "03-explore-posts", path: "/explore/posts" },
  { name: "04-for-creators", path: "/for-creators" },
  { name: "05-for-supporters", path: "/for-supporters" },
  { name: "06-for-brands", path: "/for-brands" },
  { name: "07-login", path: "/login" },
  { name: "08-help-center", path: "/help-center" },
  { name: "09-changelog", path: "/changelog" },
  { name: "10-articles", path: "/articles" },
  { name: "11-terms", path: "/terms" },
  { name: "12-privacy", path: "/privacy" },
  { name: "13-creator-page", path: "/dev/creator-page" },
  { name: "14-components", path: "/dev/components" },
];

for (const route of ROUTES) {
  test(`${route.name} renders without errors`, async ({ page }, testInfo) => {
    const errors = trackConsoleErrors(page);

    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=/application error/i")).toHaveCount(0);
    await expect(page.locator("text=/unhandled runtime error/i")).toHaveCount(0);

    await capture(page, testInfo, route.name, route.fullPage ?? true);
    await expectNoSeriousA11y(page, route.name);

    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });
}
