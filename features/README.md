# Features

Domain code lives here. A feature owns its API calls, hooks, components, types
and tests so a screen does not need to know how data is fetched.

```
features/
  support/
    api.ts          # calls workers / Firestore through lib/apiClient
    components/     # feature-only UI
    hooks/          # data + view-model hooks
    types.ts
    utils.ts
    __tests__/
```

Rules:

- Components never import `firebase/*` directly. Use an `api.ts` in the feature.
- No raw `fetch(` outside `api.ts`; use `lib/apiClient.ts`.
- New UI uses `components/ui/*`, `styles/tokens.css` and `lib/i18n`.
- No `any`. Narrow at the API boundary with a schema or a typed response.
- Import from other code as `@/features/<name>/...`, never deep relative paths.
- Move a screen into a feature only when you are already changing that screen.
  Do not bulk-move working code.

Start with `support`, `library`, `earnings` and `creator-page` in Phase 2–4.
