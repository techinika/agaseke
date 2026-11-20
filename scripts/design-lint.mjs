#!/usr/bin/env node

import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, "scripts/design-lint-baseline.json");
const ROOTS = [
  "components/ui",
  "components/shell",
  "config",
  "app/dev/components",
  "app/(authentication)/layout.tsx",
  "app/(authentication)/login/page.tsx",
  "app/dev/auth-onboarding",
  "app/dev/auth-verify",
  "app/dev/creator-core",
  "app/dev/creator-community",
  "app/(dashboards)/admin/layout.tsx",
  "app/(dashboards)/creator/layout.tsx",
  "app/(dashboards)/supporter/layout.tsx",
  "app/(main)/layout.tsx",
  "app/(public_profile)/layout.tsx",
  "components/parts/dashboard/Layout.tsx",
  "app/(public_profile)",
  "app/store/pay",
  "app/booking/pay",
  "components/pages/public",
  "components/parts/public",
  "components/parts/community",
  "components/parts/PaymentCallback.tsx",
  "components/pages/ExplorePage.tsx",
  "components/pages/ExplorePostsPage.tsx",
  "components/pages/Dashboards/SupporterSpace.tsx",
  "features/creator-page",
  "features/gatherings",
  "features/giveaways",
  "features/community",
  "features/support",
  "features/actions",
  "features/onboarding",
  "features/verification",
  "components/pages/LoginPage.tsx",
  "components/pages/loginpage",
  "components/pages/StartPage.tsx",
  "components/pages/Dashboards/VerifyPage.tsx",
  "features/creator-home",
  "components/pages/Dashboards/PayoutsPage.tsx",
  "components/pages/Dashboards/payoutspage",
  "components/pages/Dashboards/SettingsPage.tsx",
  "components/pages/Dashboards/SalesPage.tsx",
  "components/pages/Dashboards/SupportersPage.tsx",
  "components/pages/Dashboards/supporterspage/BroadcastEmailModal.tsx",
  "components/pages/Dashboards/CommunityPage.tsx",
  "components/pages/Dashboards/MessagesPage.tsx",
  "components/pages/Dashboards/NoticesPage.tsx",
  "components/parts/community/CommunityChatView.tsx",
  "app/(dashboards)/creator/community/chat/[tierId]/page.tsx",
];
const EXTENSIONS = new Set([".ts", ".tsx"]);

const RULES = [
  {
    id: "raw-palette",
    message:
      "Use semantic tokens instead of raw Tailwind palette classes (orange-600, slate-500, etc.).",
    pattern:
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|decoration|divide|placeholder|accent|caret)-(?:orange|red|slate|gray|zinc|neutral|stone|blue|green|yellow|purple|pink|indigo|emerald|teal|cyan|amber|lime|rose|sky|violet|fuchsia)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g,
  },
  {
    id: "raw-hex",
    message: "Use semantic tokens or CSS variables instead of raw hex colors.",
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
  },
  {
    id: "tiny-text",
    message: "Use text-caption (12px) or larger; 9–11px text is not readable.",
    pattern: /\btext-\[(?:9|10|11)px\]/g,
  },
  {
    id: "arbitrary-radius",
    message: "Use the radius scale (rounded-control, rounded-card, etc.).",
    pattern: /\brounded-\[[^\]]+\]/g,
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute)));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files;
}

async function collectFiles(target) {
  const absolute = path.join(ROOT, target);
  try {
    const info = await stat(absolute);
    if (info.isFile()) {
      return EXTENSIONS.has(path.extname(absolute)) ? [absolute] : [];
    }
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return walk(absolute);
}

function emptyCounts() {
  return Object.fromEntries(RULES.map((rule) => [rule.id, 0]));
}

async function loadBaseline() {
  try {
    const parsed = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
    return {
      byRule: { ...emptyCounts(), ...parsed.byRule },
      byFile: parsed.byFile ?? {},
    };
  } catch {
    return { byRule: emptyCounts(), byFile: {} };
  }
}

const files = [];
for (const root of ROOTS) {
  files.push(...(await collectFiles(root)));
}

const violations = [];
const byRule = emptyCounts();
const byFile = {};

for (const absolute of files) {
  const relative = path.relative(ROOT, absolute);
  const source = await readFile(absolute, "utf8");
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        violations.push({
          file: relative,
          line: index + 1,
          rule: rule.id,
          match: match[0],
          message: rule.message,
        });
        byRule[rule.id] += 1;
        byFile[relative] = (byFile[relative] ?? 0) + 1;
      }
    }
  });
}

const update = process.argv.includes("--update");

if (update) {
  await writeFile(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        updated: new Date().toISOString().slice(0, 10),
        roots: ROOTS,
        byRule,
        byFile,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `design-lint: updated baseline with ${violations.length} known violation(s).`,
  );
  process.exit(0);
}

const baseline = await loadBaseline();
const regressions = [];

for (const rule of RULES) {
  const current = byRule[rule.id];
  const allowed = baseline.byRule[rule.id] ?? 0;
  if (current > allowed) {
    regressions.push(`${rule.id}: ${current} (baseline ${allowed})`);
  }
}

for (const [file, current] of Object.entries(byFile)) {
  const allowed = baseline.byFile[file] ?? 0;
  if (current > allowed) {
    regressions.push(`${file}: ${current} (baseline ${allowed})`);
  }
}

if (violations.length > 0) {
  console.log(
    `design-lint: ${violations.length} violation(s) across ${Object.keys(byFile).length} file(s).`,
  );
  for (const violation of violations) {
    console.log(
      `  ${violation.file}:${violation.line}  ${violation.rule}  ${violation.match}`,
    );
  }
} else {
  console.log("design-lint: no violations.");
}

if (regressions.length > 0) {
  console.error("\ndesign-lint: baseline exceeded:");
  for (const regression of regressions) console.error(`  ${regression}`);
  console.error(
    "\nFix the new violations. Do not update the baseline unless the debt is intentional.",
  );
  process.exit(1);
}

console.log("design-lint: baseline respected.");
