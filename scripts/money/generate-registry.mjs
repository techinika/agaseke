#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = join(ROOT, "shared/money/currencies.json");
const RAILS_SOURCE = join(ROOT, "shared/money/paymentRails.json");

const TARGETS = [
  "lib/money/registry.generated.ts",
  "workers/payments/src/money/registry.generated.ts",
  "workers/support/src/money/registry.generated.ts",
  "workers/store/src/money/registry.generated.ts",
  "workers/bookings/src/money/registry.generated.ts",
  "workers/community/src/money/registry.generated.ts",
  "workers/comms/src/money/registry.generated.ts",
];

const RAILS_TARGETS = [
  "lib/money/rails.generated.ts",
  "workers/payments/src/money/rails.generated.ts",
  "workers/support/src/money/rails.generated.ts",
  "workers/store/src/money/rails.generated.ts",
  "workers/bookings/src/money/rails.generated.ts",
  "workers/community/src/money/rails.generated.ts",
  "workers/comms/src/money/rails.generated.ts",
];

const PAYMENT_METHODS = ["momo", "card"];

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

function validateRails(data, currencyData) {
  if (!data || typeof data !== "object" || !Array.isArray(data.providers)) {
    fail("shared/money/paymentRails.json must contain a providers array");
  }

  if (!Number.isInteger(data.version) || data.version < 1) {
    fail("payment rail version must be a positive integer");
  }

  if (data.providers.length === 0) {
    fail("at least one payment provider is required");
  }

  const currencyCodes = new Set(currencyData.currencies.map((currency) => currency.code));
  const providerIds = new Set();

  for (const provider of data.providers) {
    if (!provider || typeof provider !== "object") {
      fail("each payment provider must be an object");
    }

    if (typeof provider.id !== "string" || !/^[a-z0-9_]+$/.test(provider.id)) {
      fail(`invalid payment provider id: ${String(provider.id)}`);
    }

    if (providerIds.has(provider.id)) {
      fail(`duplicate payment provider id: ${provider.id}`);
    }
    providerIds.add(provider.id);

    if (typeof provider.label !== "string" || provider.label.trim() === "") {
      fail(`${provider.id} is missing a label`);
    }

    if (
      !Array.isArray(provider.methods) ||
      provider.methods.length === 0 ||
      provider.methods.some((method) => !PAYMENT_METHODS.includes(method))
    ) {
      fail(`${provider.id} must list at least one supported payment method`);
    }

    if (
      !Array.isArray(provider.currencies) ||
      provider.currencies.length === 0 ||
      provider.currencies.some((code) => !currencyCodes.has(code))
    ) {
      fail(`${provider.id} must list registered currency codes`);
    }

    if (
      !Array.isArray(provider.countries) ||
      provider.countries.length === 0 ||
      provider.countries.some(
        (country) => typeof country !== "string" || !/^[A-Z]{2}$/.test(country),
      )
    ) {
      fail(`${provider.id} must list at least one ISO 3166-1 alpha-2 country`);
    }
  }

  return {
    version: data.version,
    providers: data.providers.map((provider) => ({
      id: provider.id,
      label: provider.label,
      methods: [...new Set(provider.methods)],
      currencies: [...new Set(provider.currencies)],
      countries: [...new Set(provider.countries)],
    })),
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

function renderRails(data) {
  const providerBody = data.providers
    .map(
      (provider) => `  ${provider.id}: {
    id: ${JSON.stringify(provider.id)},
    label: ${JSON.stringify(provider.label)},
    methods: ${JSON.stringify(provider.methods)},
    currencies: ${JSON.stringify(provider.currencies)},
    countries: ${JSON.stringify(provider.countries)},
  },`,
    )
    .join("\n");

  return `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source: shared/money/paymentRails.json
// Regenerate: node scripts/money/generate-registry.mjs

export const PAYMENT_METHODS = ${JSON.stringify(PAYMENT_METHODS)} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentRailProvider {
  readonly id: string;
  readonly label: string;
  readonly methods: readonly PaymentMethod[];
  readonly currencies: readonly string[];
  readonly countries: readonly string[];
}

export const PAYMENT_RAIL_PROVIDERS: Readonly<Record<string, PaymentRailProvider>> = {
${providerBody}
};

export const PAYMENT_RAIL_PROVIDER_LIST: readonly PaymentRailProvider[] =
  Object.values(PAYMENT_RAIL_PROVIDERS);

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function getPaymentRailProvider(id: string): PaymentRailProvider | undefined {
  return Object.prototype.hasOwnProperty.call(PAYMENT_RAIL_PROVIDERS, id)
    ? PAYMENT_RAIL_PROVIDERS[id]
    : undefined;
}
`;
}

async function writeOrCheck(target, source, check, mismatches) {
  const absolute = join(ROOT, target);

  if (check) {
    let existing = "";
    try {
      existing = await readFile(absolute, "utf8");
    } catch {
      console.error(`money registry: missing ${target}`);
      return mismatches + 1;
    }

    if (existing !== source) {
      console.error(`money registry: stale ${target}`);
      return mismatches + 1;
    }
    return mismatches;
  }

  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, source, "utf8");
  return mismatches;
}

async function main() {
  const check = process.argv.includes("--check");
  const raw = JSON.parse(await readFile(SOURCE, "utf8"));
  const data = validate(raw);
  const railsRaw = JSON.parse(await readFile(RAILS_SOURCE, "utf8"));
  const railsData = validateRails(railsRaw, data);
  const source = await prettier.format(render(data), PRETTIER_OPTIONS);
  const railsSource = await prettier.format(renderRails(railsData), PRETTIER_OPTIONS);

  let mismatches = 0;

  for (const target of TARGETS) {
    mismatches = await writeOrCheck(target, source, check, mismatches);
  }
  for (const target of RAILS_TARGETS) {
    mismatches = await writeOrCheck(target, railsSource, check, mismatches);
  }

  const totalFiles = TARGETS.length + RAILS_TARGETS.length;

  if (check) {
    if (mismatches > 0) {
      console.error(
        "money registry: run `npm run money:registry` and commit the generated files",
      );
      process.exit(1);
    }

    console.log(`money registry: ${totalFiles} generated files are up to date`);
    return;
  }

  console.log(`money registry: wrote ${totalFiles} generated files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
