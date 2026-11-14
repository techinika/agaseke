import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = path.resolve("docs/ui-evidence/phase-2c");
const VIEWPORT = { width: 390, height: 844 };
const CHROMIUM = process.env.CHROMIUM_PATH || "/usr/bin/chromium";

const SHOTS = [
  {
    name: "01-actions-index",
    url: "/dev/actions",
    fullPage: true,
    axe: true,
  },
  {
    name: "02-support-sheet",
    url: "/dev/actions?open=support",
    dialog: true,
    axe: true,
  },
  {
    name: "03-community-join",
    url: "/dev/actions?open=community",
    dialog: true,
    axe: true,
  },
  {
    name: "04-giveaway-entry",
    url: "/dev/actions?open=giveaway",
    dialog: true,
    axe: true,
  },
  {
    name: "05-giveaway-success",
    url: "/dev/actions?open=giveaway",
    dialog: true,
    action: async (page) => {
      await page.getByRole("button", { name: "Enter giveaway" }).click();
      await page.getByText("You're in!").waitFor();
    },
  },
  {
    name: "06-free-rsvp",
    url: "/dev/actions?open=rsvp",
    dialog: true,
    axe: true,
  },
  {
    name: "07-paid-ticket",
    url: "/dev/actions?open=ticket",
    dialog: true,
    axe: true,
  },
  {
    name: "08-checkout-old-before",
    url: "/dev/actions?open=checkout-old",
    axe: true,
  },
  {
    name: "09-checkout-new-review",
    url: "/dev/actions?open=checkout",
    dialog: true,
    axe: true,
  },
  {
    name: "10-checkout-new-delivery",
    url: "/dev/actions?open=checkout",
    dialog: true,
    action: async (page) => {
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Full name").waitFor();
    },
  },
  {
    name: "11-checkout-new-payment",
    url: "/dev/actions?open=checkout",
    dialog: true,
    axe: true,
    action: async (page) => {
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Full name").fill("Aline Supporter");
      await page.getByLabel("Phone number").fill("078 123 4567");
      await page.getByLabel("Street address").fill("KG 1 Ave");
      await page.getByLabel("City").fill("Kigali");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Place order" }).waitFor();
    },
  },
  {
    name: "12-creator-page-mobile",
    url: "/dev/creator-page",
    fullPage: true,
    axe: true,
  },
];

async function tapTargets(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[role="dialog"]') || document.body;
    const selectors = "button, a[href], input, select, textarea, [role=button]";
    return Array.from(root.querySelectorAll(selectors))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none";
        const label =
          element.getAttribute("aria-label") ||
          element.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ||
          element.tagName.toLowerCase();
        return {
          label,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible,
        };
      })
      .filter((item) => item.visible)
      .filter((item) => item.width < 44 || item.height < 44);
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const results = [];

  for (const shot of SHOTS) {
    console.log(`→ ${shot.name}`);
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.on("console", (message) => {
      if (message.type() === "error")
        consoleErrors.push(`${shot.name}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(`${shot.name}: ${error.message}`));

    await page.goto(`${BASE}${shot.url}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    if (shot.dialog) {
      await page.getByRole("dialog").waitFor({ state: "visible" });
    }
    if (shot.action) await shot.action(page);
    await page.waitForTimeout(250);

    await page.screenshot({
      path: path.join(OUT, `${shot.name}.png`),
      fullPage: Boolean(shot.fullPage),
    });

    let axe = null;
    if (shot.axe) {
      axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    }

    console.log(`  captured ${shot.name}`);
    results.push({
      name: shot.name,
      url: shot.url,
      screenshot: path.relative(process.cwd(), path.join(OUT, `${shot.name}.png`)),
      axe: axe
        ? {
            violations: axe.violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              nodes: violation.nodes.length,
            })),
          }
        : null,
      smallTapTargets: await tapTargets(page),
    });
  }

  await browser.close();
  console.log("browser closed");

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    viewport: VIEWPORT,
    chromium: CHROMIUM,
    results,
    consoleErrors,
  };
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  const serious = results.flatMap((item) =>
    (item.axe?.violations ?? [])
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .map(
        (violation) =>
          `${item.name}: ${violation.id} (${violation.impact}, ${violation.nodes} nodes)`,
      ),
  );
  const smallTargets = results.flatMap((item) =>
    item.smallTapTargets.map(
      (target) => `${item.name}: ${target.label} (${target.width}x${target.height})`,
    ),
  );

  const summary = [
    "# Phase 2C UI verification",
    "",
    `- Base URL: ${BASE}`,
    `- Viewport: ${VIEWPORT.width}×${VIEWPORT.height} @2x`,
    `- Screenshots: ${results.length}`,
    `- Serious/critical axe violations: ${serious.length}`,
    `- Tap targets under 44px: ${smallTargets.length}`,
    `- Console/page errors captured: ${consoleErrors.length}`,
    "",
    "## Serious/critical accessibility findings",
    "",
    ...(serious.length ? serious.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Tap targets under 44px",
    "",
    ...(smallTargets.length ? smallTargets.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Console/page errors",
    "",
    ...(consoleErrors.length ? consoleErrors.map((item) => `- ${item}`) : ["- None"]),
    "",
  ].join("\n");
  await writeFile(path.join(OUT, "summary.md"), summary);

  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
