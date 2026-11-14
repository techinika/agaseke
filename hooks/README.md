# Shared hooks

Reusable client hooks that are not owned by a single feature.

- Name files `useThing.ts` and export one hook per file.
- Mark files `"use client"` only when they use browser APIs or React state.
- Do not fetch directly with `fetch(`; call a feature `api.ts` or
  `lib/apiClient.ts`.
- Keep side effects in effects and clean up listeners/timeouts.
