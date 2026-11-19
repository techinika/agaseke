import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3100";
const OUT_DIR = process.env.OUT_DIR || "docs/ui-evidence/phase4/before";
const EXECUTABLE_PATH = process.env.CHROMIUM_PATH || undefined;

const MODES = [
  { name: "mobile-360-light", width: 360, height: 640, colorScheme: "light", mobile: true },
  { name: "mobile-360-dark", width: 360, height: 640, colorScheme: "dark", mobile: true },
  { name: "desktop-1280-light", width: 1280, height: 800, colorScheme: "light", mobile: false },
  { name: "desktop-1280-dark", width: 1280, height: 800, colorScheme: "dark", mobile: false },
];

const PROFILE_TABS = [
  ["community", "Community"],
  ["store", "Store"],
  ["giveaways", "Giveaways"],
  ["gatherings", "Events"],
  ["message", "Message"],
];

const SHEETS = [
  ["support", "support"],
  ["community", "community"],
  ["giveaway", "giveaway"],
  ["rsvp", "rsvp"],
  ["ticket", "ticket"],
  ["checkout", "checkout"],
];

const ROUTES = [
  ["store", "/aline/store"],
  ["community", "/aline/community"],
  ["gatherings", "/aline/gatherings"],
  ["giveaways", "/aline/giveaways"],
  ["messaging", "/aline/messaging"],
  ["booking", "/aline/booking"],
  ["product-detail", "/aline/store/product-1"],
  ["gathering-detail", "/aline/gatherings/event-1"],
  ["giveaway-detail", "/aline/giveaways/giveaway-1"],
  ["community-post", "/aline/community/post-1"],
  ["payment-result", "/payment"],
  ["store-pay", "/store/pay/order-1"],
  ["booking-pay", "/booking/pay/booking-1"],
];

const IGNORED_CONSOLE = [
  "firebase",
  "invalid api key",
  "net::err_",
  "upgrade-insecure-requests",
  "hydration",
];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(900);
}

async function scan(page) {
  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    return results.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  } catch (error) {
    return [{ id: "axe-error", impact: "serious", nodes: String(error) }];
  }
}

async function capture(page, name, report, modeName) {
  const file = path.join(OUT_DIR, `${name}-${modeName}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  report.screenshots.push({ name, mode: modeName, file });
  const violations = await scan(page);
  report.axe.push({ name, mode: modeName, violations });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: EXECUTABLE_PATH,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const report = {
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  screenshots: [],
  axe: [],
  overflow: [],
  notes: [
    "04-route-* captures use real creator route patterns; without seed/test accounts they render loading or error states.",
    "Profile tabs and sheets use the enabled /dev preview routes.",
  ],
};
await mkdir(OUT_DIR, { recursive: true });

try {
  for (const mode of MODES) {
    const context = await browser.newContext({
      viewport: { width: mode.width, height: mode.height },
      colorScheme: mode.colorScheme,
      deviceScaleFactor: 2,
      isMobile: mode.mobile,
      hasTouch: mode.mobile,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    report.console = report.console || [];
    report.console.push({ mode: mode.name, errors: consoleErrors.filter((text) => !IGNORED_CONSOLE.some((part) => text.toLowerCase().includes(part))) });

    await page.goto(`${BASE_URL}/dev/creator-page`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await capture(page, "01-profile", report, mode.name);

    for (const [tabId, tabLabel] of PROFILE_TABS) {
      const tab = page.getByRole("tab", { name: tabLabel });
      if (await tab.count()) {
        await tab.first().click();
        await settle(page);
      }
      await capture(page, `02-profile-${tabId}`, report, mode.name);
    }

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    report.overflow.push({ mode: mode.name, route: "/dev/creator-page", ...overflow });

    if (mode.mobile) {
      for (const [query, name] of SHEETS) {
        await page.goto(`${BASE_URL}/dev/actions?open=${query}`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).catch(() => undefined);
        await settle(page);
        await capture(page, `03-sheet-${name}`, report, mode.name);
      }
    }

    if (mode.name === "mobile-360-light" || mode.name === "desktop-1280-dark") {
      for (const [name, route] of ROUTES) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        await settle(page);
        await capture(page, `04-route-${name}`, report, mode.name);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Captured ${report.screenshots.length} screenshots to ${OUT_DIR}`);
console.log(`Serious/critical axe findings: ${report.axe.reduce((sum, item) => sum + item.violations.length, 0)}`);
