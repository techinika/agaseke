import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3100";
const OUT_DIR = process.env.OUT_DIR || "docs/ui-evidence/phase5/before";
const EXECUTABLE_PATH = process.env.CHROMIUM_PATH || undefined;

const MODES = [
  {
    name: "mobile-360-light",
    width: 360,
    height: 640,
    colorScheme: "light",
    mobile: true,
  },
  { name: "mobile-360-dark", width: 360, height: 640, colorScheme: "dark", mobile: true },
  {
    name: "desktop-1280-light",
    width: 1280,
    height: 800,
    colorScheme: "light",
    mobile: false,
  },
  {
    name: "desktop-1280-dark",
    width: 1280,
    height: 800,
    colorScheme: "dark",
    mobile: false,
  },
];

const ROUTES = [
  ["01-login", "/login"],
  ["02-onboarding", "/dev/auth-onboarding"],
  ["03-verify", "/dev/auth-verify"],
];

const IGNORED_CONSOLE = [
  "firebase",
  "invalid api key",
  "net::err_",
  "upgrade-insecure-requests",
  "hydration",
  "recaptcha",
];

async function settle(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(800);
}

async function scan(page) {
  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    return results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      }));
  } catch (error) {
    return [{ id: "axe-error", impact: "serious", nodes: String(error) }];
  }
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const selectors =
      "a, button, input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])";
    return Array.from(document.querySelectorAll(selectors))
      .filter((element) => !element.classList.contains("sr-only"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      })
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        label:
          element.getAttribute("aria-label") ||
          element.textContent?.trim().slice(0, 40) ||
          "",
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      }));
  });
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
  smallTargets: [],
  console: [],
  notes: [
    "Onboarding and verification are captured through gated /dev preview routes; no real Firebase data or secrets are used.",
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

    for (const [name, route] of ROUTES) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
      await settle(page);
      const file = path.join(OUT_DIR, `${name}-${mode.name}.png`);
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
      report.screenshots.push({ name, route, mode: mode.name, file });
      report.axe.push({ name, mode: mode.name, violations: await scan(page) });
      report.overflow.push({
        name,
        mode: mode.name,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      });
      report.smallTargets.push({
        name,
        mode: mode.name,
        targets: await smallTargets(page),
      });
    }

    report.console.push({
      mode: mode.name,
      errors: consoleErrors.filter(
        (text) => !IGNORED_CONSOLE.some((part) => text.toLowerCase().includes(part)),
      ),
    });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(OUT_DIR, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
const serious = report.axe.reduce((sum, entry) => sum + entry.violations.length, 0);
console.log(
  `phase5-evidence: ${report.screenshots.length} screenshots, ${serious} serious/critical axe findings → ${OUT_DIR}`,
);
