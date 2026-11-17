# Agaseke Full-App Redesign — Current-State Audit

**Phase:** 0 (audit only)
**Branch:** `design/full-app-redesign`
**Date:** 2026-11-17
**Scope:** Evidence-backed audit of the existing app. No redesign implementation is included.

## 1. Executive summary

Agaseke does not need a greenfield design system. It already has tokens, 29 shared UI files, a component gallery, mobile shells, and public routes that pass axe at 360px. The real problem is **adoption and consistency**: the shared system exists, but most screens bypass it.

The redesign should therefore be an **incremental system migration with a small set of high-impact rebuilds**, not a total rewrite. Money, booking, checkout, giveaway, auth, and admin flows must keep their current behavior while their presentation is replaced route by route.

Three facts drive the recommendation:

1. **The design debt is concentrated.** Ten files account for a large share of complexity, tiny text, and orange drift; `SupporterSpace` alone is 2,017 lines.
2. **The app is not consistent across roles.** Public, supporter, creator, and admin use different shells; supporter pages import the public navigation/footer; creator has its own bottom nav; admin has a separate nav.
3. **Evidence is good on public routes but incomplete on authenticated routes.** Fourteen public routes pass axe at 360px today, but admin/creator/supporter routes and all 1280px/dark-mode captures are blocked by missing local data/auth.

## 2. Verified current baseline

### Stack

- Next.js 16, React 19, Tailwind CSS 4, TypeScript.
- Rubik is already loaded through `next/font`; there is no competing display font.
- `framer-motion`, `lucide-react`, `next-themes`.
- Light/dark already implemented through CSS variables and theme switching.
- Root scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run lint:ci`, `npm run typecheck`, `npm test`.

### Existing design system

| Asset | Evidence | Assessment |
| --- | --- | --- |
| Token file | `styles/tokens.css` — 57 `--ag-*` tokens | Real token foundation exists. |
| Tailwind mapping | `app/globals.css` — ~30 mapped colors, radius, shadows | Already wired into Tailwind v4. |
| Shared UI files | `components/ui/` — 29 files | More than a “handful”; covers Button, Card, Input, Money, Sheet, Tabs, TopBar, BottomNav, Skeleton, EmptyState, ErrorState, StatusScreen, Toast, etc. |
| Component gallery | `app/dev/components/ComponentGallery.tsx` | Working internal preview. |
| Storybook | No `.storybook/` directory; no Storybook dependency | Not actually installed; `storybook-static/` is stale output. |
| Brand red | `--ag-brand` `#ff0000`; `--ag-brand-strong` `#C40000` | Strong red passes text contrast; pure red does not. |
| Fonts | Rubik via `next/font` | Keep. |
| Dark mode | `next-themes` + CSS variables | Exists; route coverage is unverified. |

**Conclusion:** the prompt’s claim that there is no real component library is outdated. The accurate finding is: **the library exists but is under-adopted.** Only 17 files import the shared `Button`; 126 files with raw buttons do not. Only 3 files import the shared `Input`.

### Route inventory

| Item | Count | Method |
| --- | --- | --- |
| Pages | 82 | `find app -name page.tsx` |
| Layouts | 6 | `find app -name layout.tsx` |
| Error boundaries | 2 | `find app -name error.tsx` |
| Global error | 1 | `find app -name global-error.tsx` |
| Not found | 1 | `find app -name not-found.tsx` |
| Loading states | 2 | `find app -name loading.tsx` |
| Named modal components | 20 | `find components app features -name '*Modal.tsx'` |
| TSX files audited | 311 | `app/`, `components/`, `features/` |

`/articles` is a redirect to `/explore/posts`. `/dev/*` routes are internal preview surfaces and should not appear in production navigation.

## 3. Quantified design debt

Counts below are occurrences across `app/`, `components/`, and `features/` TSX files.

| Signal | Current count | Files | Implication |
| --- | ---: | ---: | --- |
| `orange-*` utilities | 1,383 | 151 | Prompt’s ~740 estimate is stale; drift has grown. |
| `red-*` utilities | 273 | 69 | Brand red is used as a generic utility color. |
| `slate-*` utilities | 65 | 31 | Neutral drift alongside token colors. |
| `gray-*` utilities | 13 | 6 | Additional neutral family. |
| `text-[9px/10px/11px]` | 316 | 82 | Widespread unreadably small type. |
| Arbitrary `rounded-[...]` | 4 | 3 | Small problem, still inconsistent. |
| Raw hex colors | 50 | 6 | Mostly charts/email/preview surfaces; still needs audit. |
| Raw `<button>` | 624 | 132 | Primitive bypass at scale. |
| Raw `<input>` | 209 | 67 | Form control fragmentation. |
| Raw `<select>` | 35 | 22 | No shared Select primitive. |
| Raw `<textarea>` | 34 | 31 | No shared Textarea primitive. |
| `fixed` positioning | 68 | 50 | Overlay/nav layering risk. |
| Raw `<table>` | 6 | 6 | Mobile data-table problem. |
| `role="dialog"` / alertdialog | 2 | 2 | Most modals lack dialog semantics. |
| Raw `<img>` | 87 | 54 | Bypasses MediaImage/optimization conventions. |
| `aria-label` | 36 | 27 | Sparse relative to icon usage. |
| `lucide-react` imports | 172 | 172 | Icon-only controls need labels consistently. |

### Contrast findings

| Pair | Ratio | Verdict |
| --- | ---: | --- |
| White on `#FF0000` | 4.00:1 | Fails normal text; large text only. |
| White on `#f54900` | 3.60:1 | Fails normal text. |
| White on `#E60000` | 4.81:1 | Passes normal text. |
| White on `#D40000` | 5.53:1 | Good. |
| White on `#C40000` | 6.27:1 | Preferred text/button red. |
| `#00a63e` on `#f0fdf4` | 3.08:1 | Fails normal text; fix success tokens. |

The existing `--ag-brand-strong` (`#C40000`) is the correct base for text, buttons, and focus. Keep `#FF0000` for large brand surfaces and non-text decoration only.

### Top 10 complexity offenders

| File | Lines | Orange | Tiny text | Risk |
| --- | ---: | ---: | ---: | --- |
| `components/pages/Dashboards/SupporterSpace.tsx` | 2,017 | 47 | 12 | Multi-tab supporter app in one file. |
| `components/pages/Dashboards/Admin/AdminPage.tsx` | 1,729 | — | 22 | Dashboard, charts, top earners, currency logic. |
| `components/pages/Dashboards/SettingsPage.tsx` | 1,081 | 60 | — | Large multi-section form. |
| `components/pages/Dashboards/Admin/AdminUsersPage.tsx` | 933 | 27 | 20 | Table, search, role actions. |
| `components/pages/StartPage.tsx` | 869 | 27 | — | Onboarding, auth-sensitive. |
| `components/pages/Dashboards/ContentPage.tsx` | 855 | 24 | — | Content list + states. |
| `components/pages/Dashboards/BookingsPage.tsx` | 812 | 32 | — | Tables, statuses, money, dates. |
| `components/pages/LandingPage.tsx` | 745 | 36 | 12 | Public conversion page. |
| `components/parts/public/StoreTab.tsx` | 708 | — | — | Embedded store logic. |
| `components/pages/public/ArticleReaderPage.tsx` | 706 | 25 | — | Reader typography/ads. |

Also high-risk: `PayoutsPage` (25 orange, 13 tiny), `SettingsPage` (60 orange), `AdminPage` (22 tiny), and the money overlays listed in the coverage matrix.

## 4. Architecture and consistency findings

### Shells and navigation

- Public uses `components/parts/Navigation.tsx` + `Footer.tsx`.
- Supporter pages `layout.tsx` do not exist as a group; `/supporter`, `/supporter/[postId]`, and `/supporter/notices` import the public shell directly. This couples supporter UX to marketing chrome.
- Creator has a dedicated layout, desktop sidebar, and `CreatorBottomNav` with five tabs.
- Admin has a separate layout and navigation; it does not share a common `AppShell` model.
- No single typed navigation source exists. Labels, icons, active states, and role visibility are duplicated.
- Bottom nav and fixed feedback FAB can compete with checkout/support overlays; 68 fixed-position usages across 50 files make layering fragile.

### Component system

Strong existing primitives:

`Button`, `Card`, `Input`, `AmountInput`, `PhoneInput`, `Money`, `Avatar`, `Badge`, `Sheet`, `Tabs`, `TopBar`, `BottomNav`, `Skeleton`, `DetailSkeleton`, `EmptyState`, `ErrorState`, `TabErrorState`, `StatusScreen`, `ConfirmModal`, `Toast`, `MediaImage`, `MediaPlayer`, `ShareButton`, `QRCode`, `NotificationDrawer`, `LinkifyText`, `RichContentRenderer`.

Missing or insufficient:

`IconButton`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch`, `FormField`, `SearchInput`, `FileUpload`, `Modal/Dialog` (shared), `Drawer`, `ConfirmDialog`, `DropdownMenu`, `Popover`, `Tooltip`, `DataTable`, `Pagination`, `Progress`, `PageHeader`, `PageSection`, `AppShell`, `Sidebar`, `SidebarItem`, `StatCard`, `Chart`, `KeyValueList`, `Timeline`, `ThemeToggle`, `Breadcrumbs`, `Accordion`, and domain cards for content, orders, bookings, supporters, and payouts.

`ConfirmModal` is a modal but not a dialog primitive with focus management. Only 2 files use `role="dialog"`. The shared `Sheet` exists but 20 named modal files still implement bespoke overlays.

### Typography and density

- 316 instances of 9–11px text across 82 files is the clearest visual quality failure.
- Admin pages carry the highest tiny-text density: `AdminPage` 22, `AdminUsersPage` 20, `PayoutsPage` 13, `AdminLogsPage` 9.
- Public marketing and creator/admin screens do not share a type scale, so hierarchy changes by role.
- Many interfaces use icon+text at small sizes; at 360px this becomes both illegible and untappable.

### Color and surfaces

- Orange is used for brand, status, links, focus, charts, and decoration. This destroys semantic meaning.
- Success green and warning amber exist as Tailwind utilities, but contrast and dark-mode variants are not centrally controlled.
- `slate` and `gray` coexist; raw hex appears in six files.
- The token layer is sound; the problem is direct utility use. A hard lint ban today would fail on 1,383+ occurrences, so use a ratchet/allowlist.

### Mobile and desktop

- Current public routes at 360px pass both rendering and serious/critical axe checks (14/14).
- Prior 390px tap-target audit found only two small inline-text links (exempt); the prompt’s “36 targets under 44px at 360” could not be reproduced in this pass and should not be treated as current fact.
- The existing `scripts/mobile-audit.mjs` pass did not complete during Phase 0: `page.evaluate` hit “Execution context was destroyed, most likely because of a navigation.” The script needs a navigation-safe wait before it can produce an all-route 360 report.
- Desktop is the larger design gap: there is no consistent content width, sidebar density, table behavior, or chart layout across creator/admin.
- Raw tables on mobile (`6` occurrences) need either card rows below `md` or deliberate horizontal scroll with sticky first column.
- Real creator profile, supporter, creator, and admin desktop layouts cannot be judged until auth/data is available.

### Accessibility and performance

- Current `e2e/mobile-routes.spec.ts` at 360px: **14/14 passed**, including no serious/critical axe violations, for public routes and dev previews.
- Auth/admin/supporter routes have no equivalent current axe evidence.
- Prior Lighthouse mobile: `/` 75 performance, 97 accessibility, 92 best-practices, 100 SEO; `/for-creators` 91/100/100/100; `/login` 89/100/100/100; `/dev/creator-page` 78/97/96/100; `/explore/posts` 86/100/100/100.
- Home performance is the known miss, with prior TBT around 1,322ms. Redesign must not add client-side weight without removing some.
- Prior creator-page CLS was reported as high as 0.906; current public routes measured CLS 0 after the mobile refactor. The real `[username]` page is still blocked for verification.
- Only 27 files use `aria-label`; icon-only affordances need a systematic audit.
- 87 raw `<img>` usages bypass shared media handling.

## 5. Corrections to the prompt

| Prompt claim | Verified current state | Action |
| --- | --- | --- |
| “~90 `page.tsx`” | 82 | Use 82; matrix is complete. |
| “~740 orange classes” | 1,383 in 151 files | Treat as larger than stated. |
| “No shared tokens” | 57 tokens + Tailwind mapping | Build on existing tokens; do not replace blindly. |
| “Only a handful of UI primitives / no real library” | 29 shared UI files, but low adoption | Correct framing: library exists, adoption is the problem. |
| “Storybook set up?” | No config/deps; stale static output | Use `/dev/components`; do not claim Storybook. |
| “AdminPage ~1,600 lines” | 1,729 | Update estimate. |
| “SupporterSpace ~1,856 lines” | 2,017 | Update estimate. |
| “36 tap targets under 44px at 360” | Prior 390 audit: 2 exempt inline links; no current 360 count | Re-run after fixing mobile-audit script; don’t quote as fact. |
| “16 serious/critical a11y issues” | Current 14 public routes: 0 serious/critical | Auth/admin routes still unverified; not a clean bill of health. |
| “Creator CLS 0.9” | Historical; current public CLS 0; real creator blocked | Re-measure with seeded creator data. |
| “No additional font needed” | Correct; Rubik already loaded | Keep Rubik. |

## 6. Screenshot and evidence status

### Available now

- `docs/ui-evidence/phase-7/mobile-360/` — 14 current public screenshots refreshed 2026-11-17.
- `docs/ui-evidence/phase-7/mobile-390/` and action screenshots — prior 360/390 evidence.
- `docs/ui-evidence/phase-7/playwright-report.json` — current 360 run.
- `docs/screens/phase1/`, `docs/screens/phase2a/` — earlier route evidence.
- Lighthouse reports for home, for-creators, login, explore posts, creator-page proxy.

### Still blocked

The redesign requires **every route at 360×640 and 1280×800, light and dark**. That is not possible with the current local setup because:

- Firebase env keys are blank; public pages log “The default Firebase app does not exist.”
- No Firebase emulator project/config/seed data exists.
- No creator, supporter, or admin test accounts exist.
- No payment/provider sandbox is configured for checkout/booking verification.
- Real creator/profile pages need seeded creators, tiers, posts, products, bookings, and giveaways.

`docs/screens/before/README.md` already documents the recommended resolution order:

1. **Best:** local Firebase emulator + seed script + test accounts + provider sandbox.
2. **Fallback:** dedicated non-production Firebase project with synthetic data and restricted test accounts.
3. **Last resort:** deterministic fixtures/storybook-like preview routes for visual QA; not sufficient for payment/auth end-to-end proof.

Production data and real credentials must not be used.

## 7. What must not break

- Firestore rules, security model, and data model.
- Money display and math: use `Money`/shared formatters; never reimplement currency symbols or decimal rules.
- Checkout, booking, support, subscription, giveaway, payout, and order state transitions.
- Auth, role gates, onboarding, account deletion.
- Creator public URLs and redirects (`/articles` → `/explore/posts`).
- Provider callbacks and deep links.
- Existing admin exports and operational actions.
- Deep links and share URLs.

## 8. Audit conclusion

The redesign should preserve the app’s behavior and its strongest existing assets (Rubik, token layer, money utilities, core primitives, public mobile baseline), then:

1. Finish the missing primitives and one shared dialog/sheet system.
2. Introduce one typed navigation config and role-aware app shells.
3. Replace color/type/spacing drift with semantic tokens.
4. Rebuild the highest-risk pages in place, starting with supporter, creator home/content/settings, public creator profile, and admin dashboards.
5. Ratchet linting and CI so migrated routes cannot regress.

This is a staged migration, not a parallel redesign. The detailed proposal and effort plan are in `docs/REDESIGN_PROPOSAL.md`; every route is tracked in `docs/REDESIGN_COVERAGE.md`.

## 9. Evidence commands

```bash
find app -name page.tsx | wc -l
find app -name layout.tsx | wc -l
find app -name error.tsx | wc -l
find components app features -name '*Modal.tsx' | wc -l
grep -ro 'orange-[0-9]' --include='*.tsx' app components features | wc -l
grep -ro 'text-\[\(9\|10\|11\)px\]' --include='*.tsx' app components features | wc -l
grep -rl 'components/ui/Button' --include='*.tsx' app components features | wc -l
grep -rl '<button' --include='*.tsx' app components features | wc -l
npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360
```
