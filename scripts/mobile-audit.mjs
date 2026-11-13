import { chromium } from "@playwright/test";
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
  ["actions", "/dev/actions"],
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const results = [];

  for (const [name, url] of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const data = await page.evaluate(() => {
      const selector =
        "button, a[href], input:not([type=hidden]), select, textarea, [role=button]";
      const small = [];
      for (const el of Array.from(document.querySelectorAll(selector))) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.width === 0 || rect.height === 0) continue;
        if (style.visibility === "hidden" || style.display === "none") continue;
        const isInlineTextLink =
          el.tagName === "A" &&
          style.display.startsWith("inline") &&
          (el.textContent || "").trim().length > 0 &&
          rect.height < 24;
        if (isInlineTextLink) continue;
        if (rect.width < 44 || rect.height < 44) {
          small.push({
            label:
              el.getAttribute("aria-label") ||
              (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50) ||
              el.tagName.toLowerCase(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
        small,
      };
    });

    results.push({
      name,
      url,
      horizontalOverflow: data.scrollWidth > data.innerWidth + 1,
      overflowPx: data.scrollWidth - data.innerWidth,
      smallTapTargets: data.small,
    });
    await context.close();
  }

  await browser.close();
  await writeFile(
    path.join(OUT, "mobile-audit.json"),
    JSON.stringify(results, null, 2),
  );

  for (const r of results) {
    const flag = r.horizontalOverflow ? `OVERFLOW +${r.overflowPx}px` : "ok";
    console.log(`${r.name.padEnd(16)} overflow=${flag.padEnd(16)} smallTapTargets=${r.smallTapTargets.length}`);
    for (const t of r.smallTapTargets.slice(0, 6)) {
      console.log(`    - ${t.width}x${t.height} ${t.label}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
