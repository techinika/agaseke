#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CURRENCIES_SOURCE = join(ROOT, "shared/money/currencies.json");
const RAILS_SOURCE = join(ROOT, "shared/money/paymentRails.json");
const DEFAULT_FOCUS = "KES,UGX,TZS";

function fail(message) {
  console.error(`money enablement: ${message}`);
  process.exit(1);
}

function readArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : undefined;
}

function parseFocus(value) {
  const codes = String(value || DEFAULT_FOCUS)
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(codes)];
}

async function loadJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${path}: ${error instanceof Error ? error.message : error}`);
  }
}

function validateCurrencies(data) {
  if (!data || !Array.isArray(data.currencies) || data.currencies.length === 0) {
    fail("currencies.json must contain a non-empty currencies array");
  }

  const byCode = new Map();
  const displayOrders = new Set();
  for (const currency of data.currencies) {
    if (!currency || typeof currency !== "object") {
      fail("each currency must be an object");
    }
    if (typeof currency.code !== "string" || !/^[A-Z]{3}$/.test(currency.code)) {
      fail(`invalid ISO code: ${String(currency.code)}`);
    }
    if (byCode.has(currency.code)) {
      fail(`duplicate currency code: ${currency.code}`);
    }
    if (![0, 2, 3].includes(currency.minorUnit)) {
      fail(`${currency.code} has invalid minorUnit ${String(currency.minorUnit)}`);
    }
    if (!Number.isInteger(currency.displayOrder) || currency.displayOrder < 1) {
      fail(`${currency.code} has invalid displayOrder`);
    }
    if (displayOrders.has(currency.displayOrder)) {
      fail(`duplicate displayOrder: ${currency.displayOrder}`);
    }
    if (
      !Array.isArray(currency.countries) ||
      currency.countries.length === 0 ||
      currency.countries.some((country) => !/^[A-Z]{2}$/.test(String(country)))
    ) {
      fail(`${currency.code} must list at least one ISO country`);
    }
    displayOrders.add(currency.displayOrder);
    byCode.set(currency.code, currency);
  }
  return byCode;
}

function validateRails(data, currencies) {
  if (!data || !Array.isArray(data.providers) || data.providers.length === 0) {
    fail("paymentRails.json must contain a non-empty providers array");
  }

  const providers = [];
  const ids = new Set();
  for (const provider of data.providers) {
    if (!provider || typeof provider !== "object") {
      fail("each payment provider must be an object");
    }
    if (typeof provider.id !== "string" || !/^[a-z0-9_]+$/.test(provider.id)) {
      fail(`invalid provider id: ${String(provider.id)}`);
    }
    if (ids.has(provider.id)) {
      fail(`duplicate provider id: ${provider.id}`);
    }
    if (
      !Array.isArray(provider.methods) ||
      provider.methods.length === 0 ||
      provider.methods.some((method) => !["momo", "card"].includes(method))
    ) {
      fail(`${provider.id} must list momo/card methods`);
    }
    if (!Array.isArray(provider.currencies) || provider.currencies.length === 0) {
      fail(`${provider.id} must list currencies`);
    }
    for (const code of provider.currencies) {
      if (!currencies.has(code)) {
        fail(`${provider.id} references unregistered currency ${code}`);
      }
    }
    ids.add(provider.id);
    providers.push(provider);
  }
  return providers;
}

function providersFor(code, providers) {
  return providers
    .filter((provider) => provider.currencies.includes(code))
    .map((provider) => `${provider.id}(${provider.methods.join("/")})`);
}

async function main() {
  const focus = parseFocus(readArg("currency"));
  const currencies = validateCurrencies(await loadJson(CURRENCIES_SOURCE));
  const providers = validateRails(await loadJson(RAILS_SOURCE), currencies);

  const registryCheck = spawnSync(
    process.execPath,
    [join(ROOT, "scripts/money/generate-registry.mjs"), "--check"],
    { stdio: "inherit" },
  );
  if (registryCheck.status !== 0) {
    fail("generated registries are stale; run `npm run money:registry`");
  }

  let missingRail = 0;
  console.log("Currency enablement report");
  console.log(`  registered currencies: ${currencies.size}`);
  console.log(`  payment providers: ${providers.length}`);
  console.log(`  generated registries: upstream check passed`);
  console.log("");

  for (const code of focus) {
    const currency = currencies.get(code);
    if (!currency) {
      fail(`${code} is not registered in shared/money/currencies.json`);
    }
    const rails = providersFor(code, providers);
    if (rails.length === 0) {
      missingRail += 1;
    }
    console.log(
      `${code}: ${currency.name} · ${currency.minorUnit} minor units · ${currency.countries.join(",")} · ${
        rails.length > 0 ? rails.join(", ") : "NO PAYMENT RAIL"
      }`,
    );
  }

  if (missingRail > 0) {
    fail(`${missingRail} focused currenc${missingRail === 1 ? "y has" : "ies have"} no payment rail`);
  }

  console.log("");
  console.log(
    `Config-only enablement: OK for ${focus.join(", ")} (edit shared/money JSON, regenerate, then enable the Firestore policy/thresholds).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
