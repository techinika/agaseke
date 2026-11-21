export function estimateReadingMinutes(htmlOrText: string): number {
  const plain = htmlOrText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return 1;
  const words = plain.split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
