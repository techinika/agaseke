import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = path.resolve("docs/ui-evidence/phase-7");
const CHROMIUM = process.env.CHROMIUM_PATH || "/usr/bin/chromium";

const ROUTES = [
  ["home", "/"],
  ["explore", "/explore"],
  ["explore-posts", "/explore/posts"],
  ["for-creators", "/for-creators"],
  ["for-supporters", "/for-supporters"],
  ["for-brands", "/for-brands"],
  ["login", "/login"],
  ["help-center", "/help-center"],
  ["changelog", "/changelog"],
  ["articles", "/articles"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
  ["creator-page", "/dev/creator-page"],
  ["components", "/dev/components"],
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  const report = {};
  for (const [name, url] of ROUTES) {
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    report[name] = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: n.html,
        summary: n.failureSummary,
      })),
    }));
  }
  await browser.close();
  await writeFile(
    path.join(OUT, "a11y-violations.json"),
    JSON.stringify(report, null, 2),
  );

  for (const [name, violations] of Object.entries(report)) {
    const serious = violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    if (!serious.length) continue;
    console.log(`\n=== ${name} ===`);
    for (const v of serious) {
      console.log(`  [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length})`);
      for (const n of v.nodes.slice(0, 4)) {
        console.log(`    target: ${JSON.stringify(n.target)}`);
        console.log(`    html:   ${n.html.slice(0, 160)}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
