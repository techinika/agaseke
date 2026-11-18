# Agaseke UI Guide

This is the practical guide for the redesign system on `design/full-app-redesign`. Use semantic tokens, shared primitives, and typed navigation; do not introduce one-off shells or raw palette styling.

## Shells

| Surface | Layout | Shell component |
| --- | --- | --- |
| Public marketing | `app/(main)/layout.tsx` | `PublicHeader` + `PublicFooter` via `AppShell` |
| Public creator profile | `app/(public_profile)/layout.tsx` | `PublicHeader` + `#main-content` |
| Auth | `app/(authentication)/layout.tsx` | `AuthShell` |
| Creator | `app/(dashboards)/creator/layout.tsx` | `AppShell` + `Sidebar` + `DashboardMobileNav` |
| Supporter | `app/(dashboards)/supporter/layout.tsx` | `AppShell` + `Sidebar` + `DashboardMobileNav` |
| Admin | `app/(dashboards)/admin/layout.tsx` | `AppShell` + `Sidebar` + `DashboardMobileNav` |

Every shell must expose a single `#main-content` landmark and a keyboard-visible skip link. Do not nest another `<main>` in page bodies.

## Navigation

Define routes once in `config/navigation.ts`. A nav item can declare `surface`, `roles`, `slot`, `features`, and `group`. Desktop `Sidebar`, `DashboardMobileNav`, `PublicHeader`, and `PublicFooter` all derive from this config.

- Do not create new hard-coded bottom tab lists.
- Grouped overflow items belong in `group` and render in the shared `Dialog placement="bottom"` sheet.
- `DashboardMobileNav` action items use `onSelect`; link items use `href`.
- Legacy `components/parts/dashboard/CreatorBottomNav.tsx` is retained only for compatibility and is no longer mounted.

## Tokens and type

Use `app/globals.css` aliases backed by `styles/tokens.css`.

- Backgrounds: `bg-canvas`, `bg-surface`, `bg-surface-raised`, `bg-surface-sunken`.
- Text: `text-fg`, `text-muted-fg`, `text-brand`, `text-brand-strong`, `text-on-brand`.
- State: `bg-success-soft`, `bg-warning-soft`, `bg-danger-soft` with matching foreground tokens.
- Minimum readable text is `text-caption`; never use `text-[10px]`, `text-[11px]`, or smaller.
- In dark mode, brand text uses `#ff6b6b` and on-brand foreground uses `#160808`; do not reintroduce raw `#c40000` on dark surfaces.

## Primitives

Reuse `components/ui` primitives:

- Actions: `Button`, `IconButton`.
- Forms: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `SearchInput`, `FormField`.
- Overlays: `Dialog`, `Sheet`, `Drawer`, `ConfirmDialog`.
- Feedback: `Card`, `Badge`, `Avatar`, `EmptyState`, skeletons, toasts.

Do not add raw `<button>`, `<input>`, `<select>`, `<textarea>`, bespoke fixed overlays, raw hex colors, or arbitrary radii in redesigned routes. Shared money formatting stays in `lib/format`, `lib/money`, and `lib/payouts`.

## Public creator pages

Use `CreatorSubpage` from `components/shell` for every `[username]` sub-page. It supplies the back link, page header, support trigger, `CreatorSupportBar`, skeleton, empty state, error state, and retry through `useCreatorSubpageData`.

- Route-level data loading belongs in `useCreatorSubpageData`, not in each tab component.
- Support overlays stay behind `NEXT_PUBLIC_SUPPORT_SHEET_V2`; `CreatorSubpage` lazy-loads the legacy `SupportModal` fallback.
- Money must go through `formatMoney` from `lib/format/money` or the `Money` component; never call a currency formatter inline.
- Confetti, theme-color, and other non-Tailwind color values must come from tokens or `lib/theme.ts`; `scripts/design-lint.mjs` enforces this across public creator routes and pay routes.

## Verification

Run before calling any shell or route done:

```bash
npm run typecheck
npm run lint:ci
npm test
npx playwright test e2e/phase2-shells.spec.ts
npx playwright test e2e/mobile-routes.spec.ts
CHROMIUM_PATH=/usr/bin/chromium OUT_DIR=docs/ui-evidence/phase4/after node scripts/phase4-evidence.mjs
```

Visual evidence belongs in `docs/ui-evidence/phase2-shells/`, with 360×640 and 1280×800 captures in light and dark. Axe must have zero serious/critical violations; 0 moderate is the target on touched routes. Record phase results in `docs/REDESIGN_LOG.md` and `docs/REDESIGN_COVERAGE.md`.
