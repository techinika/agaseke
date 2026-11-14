import { en, type TranslationKey } from "./en";

export const defaultLocale = "en" as const;
export type Locale = "en";

export const dictionaries: Record<Locale, typeof en> = { en };

type Vars = Record<string, string | number>;

function lookup(locale: Locale, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = dictionaries[locale];
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/**
 * Translate a key. Falls back to the key itself in development so missing
 * strings are obvious, and to English in other locales.
 */
export function t(
  key: TranslationKey | (string & {}),
  vars?: Vars,
  locale: Locale = defaultLocale,
): string {
  const value = lookup(locale, key) ?? lookup(defaultLocale, key);
  return interpolate(value ?? key, vars);
}

export { en };
export type { TranslationKey };
