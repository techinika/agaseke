#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = join(ROOT, "shared/money/currencies.json");

const TARGETS = [
  "lib/money/registry.generated.ts",
  "workers/payments/src/money/registry.generated.ts",
  "workers/support/src/money/registry.generated.ts",
  "workers/store/src/money/registry.generated.ts",
  "workers/bookings/src/money/registry.generated.ts",
  "workers/community/src/money/registry.generated.ts",
  "workers/comms/src/money/registry.generated.ts",
];

const ISO_MINOR_UNITS = {
  RWF: 0,
  USD: 2,
  KES: 2,
  UGX: 0,
  TZS: 2,
  NGN: 2,
  GHS: 2,
  ZAR: 2,
  EGP: 2,
  MAD: 2,
  DZD: 2,
  TND: 3,
  XOF: 0,
  XAF: 0,
  ETB: 2,
  CDF: 2,
  AOA: 2,
  MZN: 2,
  ZMW: 2,
  MWK: 2,
  BWP: 2,
  NAD: 2,
  LSL: 2,
  SZL: 2,
  MUR: 2,
  SCR: 2,
  MGA: 2,
  KMF: 0,
  BIF: 0,
  DJF: 0,
  SOS: 2,
  SSP: 2,
  SDG: 2,
  LYD: 3,
  MRU: 2,
  GMD: 2,
  GNF: 0,
  LRD: 2,
  SLE: 2,
  CVE: 2,
  STN: 2,
  ERN: 2,
  GBP: 2,
  EUR: 2,
  CAD: 2,
  CNY: 2,
  JPY: 0,
  AUD: 2,
  CHF: 2,
  INR: 2,
  AED: 2,
  SAR: 2,
  BRL: 2,
};

const PRETTIER_OPTIONS = {
  parser: "typescript",
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 90,
};

function fail(message) {
  console.error(`money registry: ${message}`);
  process.exit(1);
}

function validate(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.currencies)) {
    fail("shared/money/currencies.json must contain a currencies array");
  }

  if (!Number.isInteger(data.version) || data.version < 1) {
    fail("version must be a positive integer");
  }

  if (data.currencies.length === 0) {
    fail("at least one currency is required");
  }

  const codes = new Set();
  const orders = new Set();

  for (const currency of data.currencies) {
    if (!currency || typeof currency !== "object") {
      fail("each currency must be an object");
    }

    if (typeof currency.code !== "string" || !/^[A-Z]{3}$/.test(currency.code)) {
      fail(`invalid ISO code: ${String(currency.code)}`);
    }

    if (codes.has(currency.code)) {
      fail(`duplicate currency code: ${currency.code}`);
    }
    codes.add(currency.code);

    if (typeof currency.name !== "string" || currency.name.trim() === "") {
      fail(`${currency.code} is missing a name`);
    }

    if (typeof currency.symbol !== "string" || currency.symbol.trim() === "") {
      fail(`${currency.code} is missing a symbol`);
    }

    if (ISO_MINOR_UNITS[currency.code] === undefined) {
      fail(`${currency.code} has no ISO 4217 minor unit in this generator`);
    }

    if (currency.minorUnit !== ISO_MINOR_UNITS[currency.code]) {
      fail(
        `${currency.code} must use minorUnit ${ISO_MINOR_UNITS[currency.code]}, got ${String(currency.minorUnit)}`,
      );
    }

    if (
      !Array.isArray(currency.countries) ||
      currency.countries.length === 0 ||
      currency.countries.some(
        (country) => typeof country !== "string" || !/^[A-Z]{2}$/.test(country),
      )
    ) {
      fail(`${currency.code} must list at least one ISO 3166-1 alpha-2 country`);
    }

    if (!Number.isInteger(currency.displayOrder) || currency.displayOrder < 1) {
      fail(`${currency.code} displayOrder must be a positive integer`);
    }

    if (orders.has(currency.displayOrder)) {
      fail(`duplicate displayOrder: ${currency.displayOrder}`);
    }
    orders.add(currency.displayOrder);
  }

  return {
    version: data.version,
    currencies: [...data.currencies].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    ),
  };
}

function render(data) {
  const codes = data.currencies.map((currency) => currency.code);
  const body = data.currencies
    .map(
      (currency) => `  ${currency.code}: {
    code: ${JSON.stringify(currency.code)},
    name: ${JSON.stringify(currency.name)},
    symbol: ${JSON.stringify(currency.symbol)},
    minorUnit: ${currency.minorUnit},
    countries: ${JSON.stringify(currency.countries)},
    displayOrder: ${currency.displayOrder},
  },`,
    )
    .join("\n");

  return `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source: shared/money/currencies.json
// Regenerate: node scripts/money/generate-registry.mjs

export const CURRENCY_CODES = ${JSON.stringify(codes)} as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface CurrencyDefinition {
  readonly code: CurrencyCode;
  readonly name: string;
  readonly symbol: string;
  readonly minorUnit: 0 | 2 | 3;
  readonly countries: readonly string[];
  readonly displayOrder: number;
}

export const CURRENCIES: Readonly<Record<CurrencyCode, CurrencyDefinition>> = {
${body}
};

export const CURRENCY_LIST: readonly CurrencyDefinition[] = [
${codes.map((code) => `  CURRENCIES.${code},`).join("\n")}
];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

export function getCurrencyDefinition(code: CurrencyCode): CurrencyDefinition {
  return CURRENCIES[code];
}
`;
}

async function main() {
  const check = process.argv.includes("--check");
  const raw = JSON.parse(await readFile(SOURCE, "utf8"));
  const data = validate(raw);
  const source = await prettier.format(render(data), PRETTIER_OPTIONS);

  let mismatches = 0;

  for (const target of TARGETS) {
    const absolute = join(ROOT, target);

    if (check) {
      let existing = "";
      try {
        existing = await readFile(absolute, "utf8");
      } catch {
        console.error(`money registry: missing ${target}`);
        mismatches += 1;
        continue;
      }

      if (existing !== source) {
        console.error(`money registry: stale ${target}`);
        mismatches += 1;
      }
      continue;
    }

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, source, "utf8");
  }

  if (check) {
    if (mismatches > 0) {
      console.error(
        "money registry: run `npm run money:registry` and commit the generated files",
      );
      process.exit(1);
    }

    console.log(`money registry: ${TARGETS.length} generated files are up to date`);
    return;
  }

  console.log(`money registry: wrote ${TARGETS.length} generated files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
