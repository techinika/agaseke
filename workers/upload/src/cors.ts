const ALLOWED_ORIGINS = [
  "https://agaseke.me",
  "https://www.agaseke.me",
  "https://staging.agaseke.me",
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers":
      "Content-Type, Authorization, X-Firebase-AppCheck",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}