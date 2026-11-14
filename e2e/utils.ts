import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const EVIDENCE_DIR = path.resolve("docs/ui-evidence/phase-7");

const IGNORED_CONSOLE = [
  /upgrade-insecure-requests/i,
  /favicon\.ico/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /Firebase/i,
  /firestore/i,
  /auth\/invalid-api-key/i,
  /default Firebase app/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  // Data-layer errors expected when the E2E env has no Firebase credentials
  // (the app logs the underlying FirebaseError as a console arg, so the text
  // itself does not always contain "Firebase").
  /Error fetching/i,
  /Error loading creators/i,
  /Failed to update view count/i,
  /Failed to initialize changelog query/i,
  /Error logging creator fetch failure/i,
  // Next.js dev-mode injects a transient caret-color style during redirects
  // (no caret-color exists in app code), producing a dev-only hydration warning.
  /A tree hydrated but some attributes/i,
  /hydration-mismatch/i,
];

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (error) => {
    if (IGNORED_CONSOLE.some((re) => re.test(error.message))) return;
    errors.push(error.message);
  });
  return errors;
}

export async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
  fullPage = true,
): Promise<string> {
  const dir = path.join(EVIDENCE_DIR, testInfo.project.name);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return path.relative(process.cwd(), file);
}

export async function axeScan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
}

export async function expectNoSeriousA11y(page: Page, label: string) {
  const { violations } = await axeScan(page);
  const serious = violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  const detail = serious
    .map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.length} node(s)`)
    .join("\n");
  expect(serious, detail).toEqual([]);
  return violations;
}
