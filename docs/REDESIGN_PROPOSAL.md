# Agaseke Full-App Redesign — Proposal

**Phase:** 0 (proposal only)
**Branch:** `design/full-app-redesign`
**Date:** 2026-11-17
**Status:** Awaiting founder approval. No UI implementation has started.

## 1. Recommendation

Do a **staged in-place redesign**, not a greenfield rewrite.

Build on what already works:

- Rubik typography.
- Existing `--ag-*` token layer and Tailwind mapping.
- Existing `Money`, `AmountInput`, and currency-aware formatting.
- Existing core primitives (`Button`, `Card`, `Input`, `Sheet`, `Tabs`, `Skeleton`, `EmptyState`, `ErrorState`, `StatusScreen`, `Toast`).
- The current public mobile baseline, which passes axe at 360px.

Fix what is missing:

- One shared dialog/sheet system.
- Missing form and data primitives.
- One typed navigation model.
- Role-aware shells for public, supporter, creator, and admin.
- Semantic color/type/spacing tokens with enforceable rules.
- Route-level extraction of the largest page files.

Do **not** change Firestore rules, business logic, fees, pricing, payments, data models, or route behavior as part of visual work. Money and transactional flows get presentation-only changes, with behavior tests before and after.

## 2. Design direction

### Brand and color

- **Primary red:** `#C40000` for buttons, links, focus, selected states, and text on light surfaces.
- **Brand surface red:** `#FF0000` only for large brand blocks, illustrations, and non-text decoration. Never normal-size text on white.
- **Yellow:** keep as a controlled accent for highlights, giveaway/winner moments, and small badges. Do not make yellow a primary action color.
- **Neutrals:** one tokenized neutral family; remove `slate`/`gray` drift.
- **Semantic:** success, warning, danger, info, each with light/dark surface and text pairs.
- **Charts:** six categorical tokens plus a sequential ramp; no raw chart hex.

### Type scale

Use a small, responsive scale. No 9px or 10px text in production UI.

| Token | Mobile | Desktop | Use |
| --- | ---: | ---: | --- |
| `caption` | 12px / 16 | 12px / 16 | Metadata only |
| `body-sm` | 14px / 20 | 14px / 20 | Dense UI, table secondary |
| `body` | 16px / 24 | 16px / 24 | Default body and inputs |
| `title-sm` | 18px / 26 | 18px / 26 | Card titles |
| `title` | 22px / 30 | 24px / 32 | Section headings |
| `display-sm` | 30px / 36 | 32px / 40 | Page titles |
| `display` | 38px / 44 | 48px / 56 | Public hero only |

Rules:

- Body and form text never below 16px on mobile.
- Captions never below 12px.
- Admin/table density uses 12–14px metadata, not 9–11px.
- Maximum two font weights per screen (regular + semibold); use 700 only for display.

### Radius, spacing, elevation

- Radius: `8px` controls, `12px` cards, `16px` sheets/dialogs, `999px` pills/avatars.
- Spacing: 4px base; page padding 16px mobile, 24px tablet, 32px desktop.
- Content widths: 720px reading, 1,200px app, 1,440px admin max.
- Shadows: one card shadow, one overlay shadow. No bespoke shadows.
- Focus ring: 2px `--ag-brand-strong` with 2px offset, visible in both themes.
- Motion: 150–200ms; respect `prefers-reduced-motion`.

### Dark mode

Use semantic variables only. Every new component must be checked in both themes at 360 and 1280 before sign-off. Do not use opacity hacks for disabled states that fail contrast.

## 3. Component system plan

### Keep and extend

`Button`, `Card`, `Input`, `AmountInput`, `PhoneInput`, `Money`, `Avatar`, `Badge`, `Sheet`, `Tabs`, `TopBar`, `BottomNav`, `Skeleton`, `DetailSkeleton`, `EmptyState`, `ErrorState`, `StatusScreen`, `Toast`, `MediaImage`, `MediaPlayer`, `ShareButton`, `QRCode`, `NotificationDrawer`, `LinkifyText`, `RichContentRenderer`.

### Build — batch 1: forms and actions

`IconButton`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `FormField`, `SearchInput`, `FileUpload`, `SegmentedControl`, `Progress`, `ButtonGroup`.

Requirements: labels, help text, error text, disabled/loading states, 44×44 targets, keyboard behavior, controlled/uncontrolled API where useful.

### Build — batch 2: overlays

`Dialog`, `Drawer`, `ConfirmDialog`, `DropdownMenu`, `Popover`, `Tooltip`.

Replace `ConfirmModal` with `ConfirmDialog`; migrate all 20 named modals to `Dialog` (desktop) / `Sheet` (mobile). Focus trap, initial focus, escape/back, scroll lock, `aria-labelledby`, and destructive-action safety are mandatory.

### Build — batch 3: structure and data

`AppShell`, `Sidebar`, `SidebarGroup`, `SidebarItem`, `PageHeader`, `PageSection`, `StatCard`, `DataTable`, `TableToolbar`, `Pagination`, `KeyValueList`, `Timeline`, `ChartFrame`, `ChartLegend`, `Breadcrumbs`, `Accordion`.

`DataTable` must render card rows below `md` or provide a deliberate scroll container with sticky first column. No raw six-column tables at 360px.

### Build — batch 4: domain components

`CreatorCard`, `PostCard`, `ProductCard`, `CartLine`, `OrderRow`, `BookingRow`, `SupporterRow`, `PayoutRow`, `TransactionRow`, `MoneySummary`, `StatusPill`, `CopyField`, `ShareRow`, `MediaPicker`, `TierCard`, `GiveawayCard`, `GatheringCard`.

All variants get an entry in `app/dev/components/ComponentGallery.tsx` plus interaction/axe checks. Storybook is not installed; do not pretend it is. If the founder wants Storybook later, that is a separate infrastructure task.

### Adoption rules

- Every touched screen uses primitives; do not create another page-local button.
- No new `orange-*`, raw hex, `text-[9px]`, `text-[10px]`, or `text-[11px]`.
- A CI ratchet blocks new violations and reduces the allowlist per phase.
- Existing 1,383 orange usages are not bulk-replaced blindly; migrate by route and ratchet.

## 4. Navigation and shell architecture

### One typed config

Create `config/navigation.ts` exporting role-aware items:

```ts
type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  badge?: "notifications" | "messages" | "payouts";
  mobile: boolean;
  desktop: boolean;
};
```

Public, creator, supporter, and admin shells consume the same config. Active state, badges, and visibility come from one source.

### Public

- Top bar: logo, Explore, For Creators, For Supporters, Log in, Create account.
- Mobile: bottom nav `Explore`, `Library`, `Account` when signed in; pre-auth keeps a compact header.
- Creator profile: sticky creator header, prominent `Support`, tabs for Posts/Library/Store/Gatherings/Giveaways/Community, share in the top bar.
- Footer: marketing/legal only; not inside supporter app screens.

### Supporter

- Mobile tabs: `Supporting`, `Library`, `Notices`, `Account`.
- Desktop: same items in a compact sidebar/top navigation.
- Move supporter screens off the public `Navigation`/`Footer` imports and into a supporter shell.
- Keep `/supporter`, `/supporter/[postId]`, `/supporter/notices` URLs unchanged.

### Creator

- Mobile tabs: `Home`, `Content`, `Earnings`, `Community`, `More`.
- Desktop: sidebar with the same five groups, expanded sub-items.
- `More`: Store, Gatherings, Giveaways, Bookings, Messages, Supporters, Sales, Partners, Notices, Verification, Settings, Copy/Share page.
- Share action stays persistent in the creator top bar.
- Replace five-tab `CreatorBottomNav` + separate desktop sidebar duplication with one config.

### Admin

- Mobile tabs: `Overview`, `Users`, `Payouts`, `Config`, `More`.
- Desktop: sidebar with Overview, Users, Payouts, Configuration, Communication, Logs, Feedback, Changelog.
- Visible admin role badge; never expose admin nav to non-admin roles.
- Keep all current admin routes; `More` holds lower-frequency pages.
- No runtime feature changes to admin actions.

## 5. File and folder structure

Keep the existing Next.js structure. Do not mass-move 82 pages.

```text
app/                         # existing routes; touch only per phase
components/ui/               # primitives only
components/shell/            # AppShell, role shells, sidebar shells
components/data/             # DataTable, StatCard, charts, key/value, timeline
components/domain/           # CreatorCard, OrderRow, PayoutRow, etc.
config/navigation.ts         # single typed navigation source
styles/tokens.css            # semantic tokens
features/<domain>/           # extracted hooks/services/views when a page is split
app/dev/components/          # gallery and visual verification
```

Rules:

- `components/ui` has no Firebase, router, or feature imports.
- `components/domain` may use UI primitives and formatting helpers; no page-level state.
- `features/*` owns data hooks and domain behavior.
- `components/pages/*` becomes composition, not 1,000–2,000-line implementations.
- Extract `SupporterSpace`, `AdminPage`, `SettingsPage`, and `ContentPage` only when their phase begins; no speculative refactor.

## 6. Route-level effort plan

Estimates assume one senior frontend developer with existing code familiarity. They include component work, mobile/desktop/dark states, tests, and evidence capture, but not emulator setup or founder review time.

| Phase | Routes / scope | Page-level effort | Phase effort |
| --- | --- | --- | ---: |
| 0. Audit | All 82 pages, 6 layouts, 20 modals | Complete | Done |
| 1. Foundation | Tokens, missing primitives, dialog/sheet, nav config, app shells, gallery, lint ratchet | 1–2d per primitive batch | 8–10d |
| 2. Public shell + marketing | `/`, `/for-creators`, `/for-supporters`, `/for-brands`, `/help-center`, `/changelog`, `/login`, `/onboarding`, legal pages | 0.5–1d each; landing 2–3d; onboarding 2d | 9–12d |
| 3. Explore and reading | `/explore`, `/explore/posts`, `/explore/posts/[post-id]`, `/articles/[slug]` | 1–2d each | 5–6d |
| 4. Public creator profile | `/[username]` + community, store, product, gatherings, giveaways, booking, messaging (12 routes) | 1–3d each; profile 3–4d | 16–20d |
| 5. Supporter/account | `/supporter`, `/supporter/[postId]`, `/supporter/notices`, `/profile`, `/transactions`, `/bookings`, community manage (8 routes) | 1–3d each; SupporterSpace 4–5d | 9–12d |
| 6. Creator dashboard | `/creator` + content, store, bookings, community, messages, notices, partners, payouts, sales, settings, supporters, verification (28 routes) | 0.5–3d each; Settings 3–4d | 18–24d |
| 7. Admin | `/admin` + users, payouts, categories, countries, currencies, comms, logs, feedback, changelog (11 routes) | 0.5–2d each; dashboard 3–4d; users 2–3d | 12–16d |
| 8. Overlays and payment status | 20 modals; `/payment`, `/booking/pay/[bookingId]`, `/store/pay/[orderId]` | Integrated per host page | 7–10d |
| 9. States and QA | errors, loading, not-found, dev gallery, dark mode, 360/1280 screenshots, axe, Lighthouse, regression | Cross-cutting | 8–12d |

**Total:** roughly **60–80 focused dev-days** for one developer. With one additional developer on public/admin in parallel, expect **7–9 calendar weeks**. A thin “visual-only, no extraction” pass could be faster but would leave the 2,000-line page and adoption problems in place.

Critical path: foundation → public shell → creator shell → supporter → creator pages → admin → full QA. Public creator profile must wait for seeded data; it is the highest-risk visual and payment surface.

## 7. Rollout and verification

### Cadence

- One branch per phase, small commits per component/route group.
- Founder review at three gates: foundation/gallery, public + creator profile, creator/admin dashboards.
- No big-bang merge. Each route group must be independently shippable.
- Optional public-shell flag (`NEXT_PUBLIC_UI_V2`) only if the founder needs production previews. Otherwise use preview deployments; avoid long-lived runtime flags.

### Required evidence per phase

1. Before/after screenshots at 360×640 and 1280×800, light and dark.
2. axe 0 serious/critical; no new moderate on touched routes.
3. Lighthouse mobile ≥ 85 performance on touched public routes; no regression on accessibility/SEO.
4. Interaction tests for money, checkout, booking, support, giveaway, payout, and destructive actions.
5. `npm run typecheck`, `npm run lint:ci`, `npm test`, and targeted Playwright.
6. Coverage matrix rows checked and linked in `docs/REDESIGN_LOG.md`.

### Data and screenshot setup

To capture authenticated routes and real creator pages, choose one:

- **Recommended:** local Firebase emulator + deterministic seed + test accounts + payment/provider sandbox.
- **Fallback:** dedicated non-production project with synthetic data and restricted test users.
- **Limited:** fixture routes for visual review only; not sufficient for payment/auth sign-off.

No production data or credentials.

## 8. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Visual work changes money/booking behavior | Presentation-only PRs; behavior tests first; shared money formatters. |
| 1,383 orange usages create scope explosion | Migrate by route; ratchet lint allowlist; no global codemod. |
| Huge pages become unmaintainable during redesign | Extract sections/hooks as each page is touched; no speculative rewrite. |
| Auth/admin screens unverifiable | Emulator/seed/test accounts before Phase 4. |
| Dark mode regressions | Token-only colors; both-theme screenshot gate. |
| Mobile bottom nav collides with overlays | One shell + one dialog/sheet layering model; z-index tokens. |
| Performance worsens on home | Measure after each public phase; remove client JS when adding UI. |
| Route/behavior loss | Coverage matrix; redirect and deep-link tests; no route deletions. |
| Admin operations break | No changes to actions/exports in visual phase; regression checklist. |

## 9. Founder questions and recommended defaults

| Question | Recommended default |
| --- | --- |
| Which red is primary? | `#C40000` for text/buttons/focus; `#FF0000` for large brand surfaces only. |
| Keep Rubik? | Yes. |
| How much yellow? | Small accents/badges only; not primary actions. |
| Creator mobile tabs? | Home, Content, Earnings, Community, More. Share stays in top bar. |
| Supporter mobile tabs? | Supporting, Library, Notices, Account. |
| Admin mobile tabs? | Overview, Users, Payouts, Config, More. |
| Should public marketing pages be fully redesigned or tokenized first? | Tokenize + fix hierarchy first; deep redesign landing after creator flows. |
| Are admin exports/actions in scope? | Visual only; list any export gaps separately. |
| Kinyarwanda now? | No new translation layer in this redesign; centralize strings where cheap, defer localization. |
| Can we retire duplicate modals/pages? | Yes, after confirming no deep links/behavior depend on them; keep redirects. |
| How should authenticated screenshots be produced? | Emulator + seed + test accounts; fallback non-prod project. |
| Is a runtime redesign flag required? | Prefer preview deployments; add `NEXT_PUBLIC_UI_V2` only if production preview is mandatory. |
| Who signs off each phase? | Founder/PM on visual gates; engineering on behavior/CI gates. |

## 10. Approval gate

Phase 0 is complete when the founder approves:

1. The audit findings and corrected assumptions.
2. The token/component/navigation direction.
3. The phase order and roughly 60–80 dev-day estimate.
4. The emulator/seed plan for authenticated screenshots.

Only then should Phase 1 (foundation) begin. No redesign code is included in this branch beyond the Phase 0 documentation.
