export type ClassValue = string | false | null | undefined;

/**
 * Tiny class-name joiner. Keeps primitives dependency-free; add clsx later only
 * if conditional object syntax becomes necessary.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
