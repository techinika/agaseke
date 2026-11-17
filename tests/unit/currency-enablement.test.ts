import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

type CurrencyConfig = {
  code: string;
  minorUnit: number;
  countries: string[];
  displayOrder: number;
};

type RailsConfig = {
  providers: Array<{
    id: string;
    methods: string[];
    currencies: string[];
    countries: string[];
  }>;
};

const root = process.cwd();
const currencies = (
  JSON.parse(
    readFileSync(join(root, "shared/money/currencies.json"), "utf8"),
  ) as { currencies: CurrencyConfig[] }
).currencies;
const providers = (
  JSON.parse(
    readFileSync(join(root, "shared/money/paymentRails.json"), "utf8"),
  ) as RailsConfig
).providers;

const byCode = new Map(currencies.map((currency) => [currency.code, currency]));

describe("config-only currency enablement", () => {
  it("registers the launch expansion currencies with correct minor units", () => {
    expect(byCode.get("KES")).toMatchObject({ minorUnit: 2, countries: ["KE"] });
    expect(byCode.get("UGX")).toMatchObject({ minorUnit: 0, countries: ["UG"] });
    expect(byCode.get("TZS")).toMatchObject({ minorUnit: 2, countries: ["TZ"] });
  });

  it("gives every focused currency at least one payment rail", () => {
    for (const code of ["KES", "UGX", "TZS"]) {
      const rails = providers.filter((provider) => provider.currencies.includes(code));
      expect(rails.length, `${code} has no rail`).toBeGreaterThan(0);
    }
  });

  it("keeps rails limited to registered currencies and unique display order", () => {
    const orders = new Set<number>();
    for (const currency of currencies) {
      expect(orders.has(currency.displayOrder), currency.code).toBe(false);
      orders.add(currency.displayOrder);
    }
    for (const provider of providers) {
      for (const code of provider.currencies) {
        expect(byCode.has(code), `${provider.id} -> ${code}`).toBe(true);
      }
    }
  });

  it("passes the offline enablement report including generated-file sync", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/money/enablement-report.mjs")],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("Config-only enablement: OK for KES, UGX, TZS");
  });
});
