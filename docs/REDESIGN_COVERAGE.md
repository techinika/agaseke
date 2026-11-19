# Agaseke Full-App Redesign — Coverage Matrix

**Phase:** 6A (creator dashboard core)
**Branch:** `design/full-app-redesign`
**Updated:** 2026-11-19
**Status:** Phases 2, 4, and 5 are complete. Phase 5 rebuilt login, onboarding, and verification; Phase 6A migrated the creator home, payouts, settings, sales, and supporters surfaces to shared primitives with semantic tokens. Gated preview evidence at 360×640 and 1280×800 in light/dark is axe-clean with production Lighthouse performance ≥ 96; real Firebase/auth/upload states remain unverified without seed/test accounts. Remaining creator routes are still unchecked.

This matrix is the release checklist for the redesign. A route is not “done” until every applicable column is checked and evidence is linked in `docs/REDESIGN_LOG.md`.

## Legend

| Mark | Meaning |
| --- | --- |
| `☐` | Not done / not verified for the redesign |
| `~` | Partial: token migration/evidence done, but data states or primitive adoption are incomplete |
| `B` | Baseline evidence exists from the current app; must be re-run after changes |
| `TBD` | Not captured yet; blocked or not attempted |
| `n/a` | Not applicable |

**Columns**

- **Mobile layout done:** 360×640, no horizontal overflow, 44×44 touch targets.
- **Desktop layout done:** 1280×800, intentional multi-column layout.
- **Dark mode checked:** both themes checked at both sizes.
- **Skeleton / Empty / Error:** route-level states exist and are usable.
- **Uses only UI primitives:** no raw color values, one-off buttons, native form controls, or bespoke overlays outside the shared system.
- **axe clean:** 0 serious/critical violations; target 0 moderate on touched routes.
- **Lighthouse:** mobile `performance / accessibility / best-practices / SEO`.

**Role codes:** `public`, `auth`, `creator`, `supporter`, `account`, `admin`, `internal`.

**Baseline evidence**

- Current 360 public screenshots: `docs/ui-evidence/phase-7/mobile-360/` (14 routes, refreshed 2026-11-17).
- Prior 360/390 evidence: `docs/ui-evidence/phase-7/`, `docs/screens/phase1/`, `docs/screens/phase2a/`.
- Current 360 run: `npx playwright test e2e/mobile-routes.spec.ts --project=mobile-360` — 14/14 passed, including axe serious/critical checks.
- Phase 2 shell run: `npx playwright test e2e/phase2-shells.spec.ts` — 16/16 passed across 360×640 and 1280×800 in light/dark; screenshots in `docs/ui-evidence/phase2-shells/`.
- Phase 2 production Lighthouse: `docs/ui-evidence/phase2-shells/lighthouse/`; before/after bundle report: `docs/ui-evidence/phase2-shells/bundle-report.json`.
- Phase 4 before/after screenshots and axe reports: `docs/ui-evidence/phase4/before/`, `docs/ui-evidence/phase4/after/`; summary: `docs/ui-evidence/phase4/summary.md`. The `before` run used invalid `/demo/*` placeholders; the corrected `after` run uses real `/aline/...` route patterns.
- Phase 4 valid production Lighthouse: `docs/ui-evidence/phase4/lighthouse-prod-v2/`; bundle report: `docs/ui-evidence/phase4/bundle-report.json`. Older `lighthouse/` and `lighthouse-prod/` runs are superseded.
- Phase 5 before/after screenshots and axe reports: `docs/ui-evidence/phase5/before/`, `docs/ui-evidence/phase5/after/`; summary: `docs/ui-evidence/phase5/summary.md`.
- Phase 5 production Lighthouse: `docs/ui-evidence/phase5/lighthouse-prod/`; bundle report: `docs/ui-evidence/phase5/bundle-report.json`.
- Phase 6A after screenshots/axe: `docs/ui-evidence/phase6a/after/`; summary: `docs/ui-evidence/phase6a/summary.md`.
- Phase 6A production Lighthouse: `docs/ui-evidence/phase6a/lighthouse-prod/`; bundle report: `docs/ui-evidence/phase6a/bundle-report.json`.
- Phase 6A uses a gated preview because the real creator routes require Firebase auth/seed data; no separate before screenshots were captured after code changes, so the baseline is the static audit counts recorded in `docs/REDESIGN_LOG.md`.
- Lighthouse values below are prior mobile runs unless a Phase 4, Phase 5, or Phase 6A preview route is linked in `docs/REDESIGN_LOG.md`.
- Full-input screenshots at 360×640 and 1280×800 in both themes are blocked by missing Firebase emulator/seed/test accounts and provider sandboxes. See `docs/screens/before/README.md`.

## Routes — 85 `page.tsx` (82 product + 3 gated previews)

| Route | Component file | Role | Mobile layout done | Desktop layout done | Dark mode checked | Skeleton | Empty state | Error state | Uses only ui primitives | axe clean | Lighthouse (mobile) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `components/pages/LandingPage` | public | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ | ✅ | 86/100/92/100 | Phase 2 shell/axe/screenshots verified; page-level state migration remains out of scope. Baseline was 75/97/92/100. |
| `/[username]` | `components/pages/PublicProfile`<br>`features/creator-page/CreatorPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Phase 4 preview + token migration; real creator data states still need seed accounts. |
| `/[username]/booking` | `components/pages/public/BookingPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Booking route and modal tokenized; no seeded slots/tiers. |
| `/[username]/community` | `components/pages/public/CommunityPage` | public | ~ | ~ | ~ | ✅ | ✅ | ✅ | ~ | ✅ | TBD | Shared `CreatorSubpage` + `CommunityJoinSheet`; tier/auth data not seeded. |
| `/[username]/community/[postId]` | `components/pages/public/PostDetailPage`<br>`components/pages/public/ArticleReaderPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Detail reader tokenized and primitive-migrated; post data states not seeded. |
| `/[username]/community/chat/[tierId]` | `components/parts/community/CommunityChatView` | public | ~ | ~ | ~ | ☐ | ☐ | ~ | ~ | ✅ | TBD | Chat tokenized; tier access and live messages need seed accounts. |
| `/[username]/gatherings` | `components/pages/public/GatheringsPage` | public | ~ | ~ | ~ | ✅ | ✅ | ✅ | ~ | ✅ | TBD | Shared `CreatorSubpage`; gathering data not seeded. |
| `/[username]/gatherings/[gatheringId]` | `components/pages/public/GatheringDetailPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Booking/check-in flows present; data states not seeded. |
| `/[username]/giveaways` | `components/pages/public/GiveawaysPage` | public | ~ | ~ | ~ | ✅ | ✅ | ✅ | ~ | ✅ | TBD | Shared `CreatorSubpage`; giveaway data not seeded. |
| `/[username]/giveaways/[giveawayId]` | `components/pages/public/GiveawayDetailPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Entry/auth states need seed accounts. |
| `/[username]/messaging` | `components/pages/public/MessagingPage` | public | ~ | ~ | ~ | ✅ | ✅ | ✅ | ~ | ✅ | TBD | Shared `CreatorSubpage`; live message states need auth. |
| `/[username]/store` | `components/pages/public/StorePage` | public | ~ | ~ | ~ | ✅ | ✅ | ✅ | ~ | ✅ | TBD | Shared `CreatorSubpage`; product data not seeded. |
| `/[username]/store/[productId]` | `components/pages/public/ProductDetailPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Cart/checkout overlays tokenized; money uses shared formatter. |
| `/admin` | `components/pages/Dashboards/Admin/AdminPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 1,729 lines; 22 tiny-text. |
| `/admin/categories` | `components/pages/Dashboards/Admin/AdminCategoriesPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/admin/changelog` | `components/pages/Dashboards/Admin/AdminChangelogPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/admin/comms` | `components/pages/Dashboards/Admin/AdminCommunication` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; broadcast overlay. |
| `/admin/countries` | `components/pages/Dashboards/Admin/AdminCountriesPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/admin/country-currencies` | `components/pages/Dashboards/Admin/AdminCountryCurrenciesPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; money formatting. |
| `/admin/currencies` | `components/pages/Dashboards/Admin/AdminCurrenciesPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; money formatting. |
| `/admin/feedback` | `components/pages/Dashboards/Admin/AdminFeedbackPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/admin/logs` | `components/pages/Dashboards/Admin/AdminLogsPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 9 tiny-text. |
| `/admin/payouts` | `components/pages/Dashboards/Admin/PayoutsPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; payout actions. |
| `/admin/users` | `components/pages/Dashboards/Admin/AdminUsersPage` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 933 lines; 20 tiny-text. |
| `/articles` | `app/(main)/articles/page.tsx` (redirect) | public | n/a | n/a | n/a | n/a | n/a | n/a | n/a | B | TBD | Redirect to `/explore/posts`; preserve behavior. |
| `/articles/[slug]` | `components/pages/public/ArticleReaderPage` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Phase 3 reader migrated; Phase 4 token pass cleared legacy palette. |
| `/booking/pay/[bookingId]` | `app/booking/pay/[bookingId]/PayClient.tsx` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Phase 4 token/money migration; provider state not live. |
| `/bookings` | `app/(main)/bookings/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 812-line component. |
| `/changelog` | `components/pages/ChangelogPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/community/manage` | `app/(main)/community/manage/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/community/manage/[subscriptionId]` | `app/(main)/community/manage/[subscriptionId]/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/tier data capture. |
| `/content-guidelines` | `components/pages/Legal/ContentGuidelinesPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; long-form legal. |
| `/creator` | `features/creator-home/CreatorHome.tsx` | creator | ✅ | ✅ | ✅ | n/a | n/a | ✅ | ✅ | ✅ | 97/100/96/66 | Phase 6A gated preview; shared `ErrorState`/`Button`/`Card`/`Badge`, consolidated share action, 0 axe/overflow/targets. Real auth/data states still need seed accounts. |
| `/creator/bookings` | `components/pages/Dashboards/BookingsPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 812 lines; 32 orange. |
| `/creator/community` | `components/pages/Dashboards/CommunityPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/community/chat/[tierId]` | `components/parts/community/CommunityChatView` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; chat viewport. |
| `/creator/content` | `components/pages/Dashboards/ContentPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 855 lines; 24 orange. |
| `/creator/content/articles` | `components/pages/Dashboards/ArticlesPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/content/articles/[articleId]` | `components/parts/dashboard/ArticleForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; editor states. |
| `/creator/content/articles/new` | `components/parts/dashboard/ArticleForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; editor states. |
| `/creator/content/new` | `features/content` (composer) | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; publish flow. |
| `/creator/gatherings` | `components/pages/Dashboards/GatheringsPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/gatherings/[id]/edit` | `components/parts/dashboard/GatheringsForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/gatherings/new` | `components/parts/dashboard/GatheringsForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required. |
| `/creator/giveaways` | `components/pages/Dashboards/GiveawaysPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/giveaways/new` | `components/parts/dashboard/GiveawayForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; 10 tiny-text. |
| `/creator/messages` | `components/pages/Dashboards/MessagesPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; split-pane. |
| `/creator/notices` | `components/pages/Dashboards/NoticesPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/partners` | `components/pages/Dashboards/PartnersPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/creator/partners/new` | `components/parts/dashboard/PartnerForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; logo upload. |
| `/creator/payouts` | `components/pages/Dashboards/PayoutsPage` | creator | ✅ | ✅ | ✅ | ~ | ✅ | ~ | ✅ | ✅ | 96/100/96/66 | Phase 6A gated preview; `Button`/`Input`/`Card`/`Tabs`/`StatusScreen`/`Badge`, semantic spinner, withdrawal logic unchanged. Real money/auth states need seed accounts. |
| `/creator/sales` | `components/pages/Dashboards/SalesPage` | creator | ✅ | ✅ | ✅ | ✅ | ✅ | ~ | ✅ | ✅ | 96/100/96/66 | Phase 6A gated preview; shared cards, badges, search/select, avatars, currency formatter; subscription logic unchanged. Real order data needs seed accounts. |
| `/creator/settings` | `components/pages/Dashboards/SettingsPage` | creator | ✅ | ✅ | ✅ | ✅ | n/a | ~ | ✅ | ✅ | 98/100/96/66 | Phase 6A gated preview; `Tabs`, form primitives, `Switch`, `Card`, `MediaImage`, `Badge`, `Skeleton`; write/upload logic unchanged. Real auth/uploads need seed accounts. |
| `/creator/store` | `components/pages/Dashboards/StorePage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; store overlays. |
| `/creator/store/coupons/new` | `components/parts/dashboard/CouponForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; currency-aware. |
| `/creator/store/folders/new` | `components/parts/dashboard/FolderForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required. |
| `/creator/store/orders/new` | `components/parts/dashboard/OrderForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; money. |
| `/creator/store/products/new` | `components/parts/dashboard/ProductForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; media upload. |
| `/creator/supporters` | `components/pages/Dashboards/SupportersPage` | creator | ✅ | ✅ | ✅ | ✅ | ✅ | ~ | ✅ | ✅ | 100/100/96/66 | Phase 6A gated preview including broadcast dialog; shared `Dialog`, form primitives, `Avatar`, `EmptyState`, `Card`, `Badge`, `Skeleton`; Firestore subscriptions/comms unchanged. |
| `/creator/verify` | `features/verification/VerificationFlow` | creator | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | 99/100/96/66 | Thin `VerifyPage` wrapper; gated preview axe/evidence passed. Real auth, uploads, OTP, and payout status still need seed/test accounts. |
| `/dev/actions` | `app/dev/actions/Preview.tsx` | internal | ~ | ☐ | ~ | n/a | n/a | ~ | ~ | ✅ | 100/100/96/66 | Phase 4 sheet captures at 360 light/dark; LCP 0.9 s, TBT 0 ms. Exclude from production nav. |
| `/dev/auth-onboarding` | `app/dev/auth-onboarding/Preview.tsx` | internal | ✅ | ✅ | ✅ | n/a | n/a | ✅ | ✅ | ✅ | 97/100/96/66 | Phase 5 gated preview; 12 screenshots across 4 modes, zero axe/overflow/targets, LCP 0.9 s. `noindex`; exclude from production nav. |
| `/dev/auth-verify` | `app/dev/auth-verify/Preview.tsx` | internal | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | 99/100/96/66 | Phase 5 gated preview; 12 screenshots across 4 modes, zero axe/overflow/targets, LCP 0.9 s. `noindex`; exclude from production nav. |
| `/dev/components` | `app/dev/components/ComponentGallery.tsx` | internal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Internal gallery; primary system verification surface. |
| `/dev/creator-core` | `app/dev/creator-core/Preview.tsx` | internal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96–100/100/96/66 | Phase 6A gated mock-data preview for 5 creator core surfaces plus `?dialog=broadcast`; 24 screenshots across 4 modes, `noindex`; exclude from production nav. |
| `/dev/creator-page` | `app/dev/creator-page/Preview.tsx` | internal | ✅ | ✅ | ✅ | ~ | ~ | ~ | ~ | ✅ | 100/100/96/66 | Phase 4 all-mode screenshots and axe; preview, not real `[username]`. LCP 0.9 s, TBT 0 ms. SEO 66 is expected. |
| `/explore` | `components/pages/ExplorePage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/explore/posts` | `components/pages/ExplorePostsPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 86/100/100/100 | Public baseline. |
| `/explore/posts/[post-id]` | `components/pages/ExplorePostDetailPage`<br>`components/pages/public/ArticleReaderPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; post data required. |
| `/for-brands` | `app/(main)/for-brands/page.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/for-creators` | `app/(main)/for-creators/page.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 91/100/100/100 | Public baseline. |
| `/for-supporters` | `app/(main)/for-supporters/page.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/help-center` | `components/pages/HelpCenterPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/login` | `components/pages/LoginPage` | auth | ✅ | ✅ | ✅ | n/a | n/a | ✅ | ✅ | ✅ | 99/100/96/66 | Phase 5 tokenized form, inline `role="alert"` errors, and 44 px legal links; production score improved from 93/100/96/66. Original baseline was 67/97/92/69. |
| `/onboarding` | `features/onboarding/OnboardingFlow` | auth | ✅ | ✅ | ✅ | n/a | n/a | ✅ | ✅ | ✅ | 97/100/96/66 | Thin `StartPage` wrapper; six guided steps, validation, and `sessionStorage` draft. Gated preview axe/evidence passed; real Firebase profile write needs seed/test account. |
| `/payment` | `components/parts/PaymentCallback` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | 100/100/96/66 | Phase 4 token/money migration; provider callback not live. LCP 0.9 s, TBT 0 ms. SEO 66 is expected on preview/callback routes. |
| `/payout-policy` | `components/pages/Legal/PayoutPolicyPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; long-form legal. |
| `/privacy` | `components/pages/Legal/PrivacyPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/profile` | `components/pages/ProfilePage` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; account deletion. |
| `/store/pay/[orderId]` | `app/store/pay/[orderId]/PayClient.tsx` | public | ~ | ~ | ~ | ~ | ~ | ~ | ~ | ✅ | TBD | Phase 4 token/money migration; provider/order state not live. |
| `/supporter` | `components/pages/Dashboards/SupporterSpace` | supporter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 2,017 lines; 47 orange. |
| `/supporter/[postId]` | `components/parts/Navigation`<br>`components/parts/Footer`<br>`components/pages/Dashboards/supporter/SupporterPostDetail`<br>`components/pages/public/ArticleReaderPage` | supporter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; public-shell coupling. |
| `/supporter/notices` | `components/pages/Dashboards/NoticesPage`<br>`components/parts/FeedbackFAB`<br>`components/parts/Navigation` | supporter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; public-shell coupling. |
| `/terms` | `components/pages/Legal/TermsPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/transactions` | `app/(main)/transactions/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; money; payout status. |

## Layouts — 8 `layout.tsx`

| Shell | File | Role | Mobile layout done | Desktop layout done | Dark mode checked | States covered | Uses only ui primitives | axe clean | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Root document shell | `app/layout.tsx` | all | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Fonts, theme, toasts, metadata. |
| Public marketing shell | `app/(main)/layout.tsx` | public | ✅ | ✅ | ✅ | ☐ | ✅ | ✅ | Phase 2 skip link, config-driven header/footer, 360/1280 light/dark screenshots. |
| Auth shell | `app/(authentication)/layout.tsx` | auth | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | New shared skip link and theme toggle; 360/1280 light/dark screenshots. |
| Creator dashboard shell | `app/(dashboards)/creator/layout.tsx`<br>`components/parts/dashboard/Layout.tsx` | creator | ✅ | ✅ | TBD | ☐ | ✅ | TBD | Config-driven tabs + grouped More sheet + collapsible sidebar verified by unit tests; visual auth capture blocked. |
| Admin dashboard shell | `app/(dashboards)/admin/layout.tsx` | admin | ✅ | ✅ | TBD | ☐ | ✅ | TBD | Config sidebar + shared bottom nav + Admin marker; visual auth capture blocked. |
| Supporter dashboard shell | `app/(dashboards)/supporter/layout.tsx` | supporter | ✅ | ✅ | TBD | ☐ | ✅ | TBD | Shared `DashboardMobileNav` and config sidebar; visual auth capture blocked. |
| Public creator-profile shell | `app/(public_profile)/layout.tsx` | public | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 subpage shell adopted; real creator data states not seeded. |
| Community chat shell | `app/(public_profile)/[username]/community/chat/[tierId]/layout.tsx` | public | ~ | ~ | ~ | ~ | ~ | ✅ | Chat widgets tokenized; full-height interaction needs tier seed data. |

## Route states — 6 files

| State | File | Role | Mobile checked | Desktop checked | Dark mode checked | axe clean | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| App error boundary | `app/error.tsx` | all | ☐ | ☐ | ☐ | TBD | Verify retry/back. |
| Global error boundary | `app/global-error.tsx` | all | ☐ | ☐ | ☐ | TBD | Must work without app CSS assumptions. |
| Not found | `app/not-found.tsx` | all | ☐ | ☐ | ☐ | TBD | Public recovery path. |
| Root loading | `app/loading.tsx` | all | ☐ | ☐ | ☐ | TBD | Avoid layout shift. |
| Creator profile error | `app/(public_profile)/[username]/error.tsx` | public | ☐ | ☐ | ☐ | TBD | Creator-specific recovery. |
| Creator profile loading | `app/(public_profile)/[username]/loading.tsx` | public | ☐ | ☐ | ☐ | TBD | Match final profile layout. |

## Large / high-risk overlays — 20 named modals

These are part of the matrix because they carry money, checkout, booking, giveaway, and destructive actions. Each must use one shared dialog/sheet primitive, with focus trap, escape/back, mobile sheet behavior, loading/error states, and axe coverage.

| Overlay | File | Used by | Mobile checked | Desktop checked | Dark mode checked | States covered | Uses only ui primitives | axe clean | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Support modal | `components/parts/public/SupportModal.tsx` | Creator page | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token pass and axe capture; money/data states need seed data. |
| Subscribe modal | `components/parts/public/SubscribeModal.tsx` | Creator page | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token pass and axe capture; tier states need seed data. |
| Booking modal | `components/parts/public/BookingModal.tsx` | Creator page | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token pass; dates/timezones need seeded availability. |
| Checkout modal | `components/parts/public/store/CheckoutModal.tsx` | Store | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token/money pass; payment states not live. |
| Cart modal | `components/parts/public/store/CartModal.tsx` | Store | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token/money pass; seed data needed. |
| Product detail modal | `components/parts/public/store/ProductDetailModal.tsx` | Store | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token pass; media/variants need seed data. |
| My purchases modal | `components/parts/public/store/MyPurchasesModal.tsx` | Store | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token/money pass; empty/loading/error need seeded auth. |
| Order tracking modal | `components/parts/public/store/OrderTrackingModal.tsx` | Store | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token/money pass; status timeline needs seed data. |
| Share modal | `components/parts/public/ShareModal.tsx` | Creator/giveaway | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token pass; clipboard interaction needs test. |
| Public winners modal | `components/parts/public/giveaway/WinnersModal.tsx` | Giveaway detail | ~ | ~ | ~ | ~ | ~ | ✅ | Phase 4 token pass; winner data needs seed data. |
| Giveaway modal | `components/pages/Dashboards/giveawayspage/GiveawayModal.tsx` | Creator giveaways | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 573 lines; money/prizes. |
| Creator winners modal | `components/pages/Dashboards/giveawayspage/WinnersModal.tsx` | Creator giveaways | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Winner selection. |
| Product modal | `components/pages/Dashboards/storepage/ProductModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 555 lines; 8 tiny-text. |
| Coupon modal | `components/pages/Dashboards/storepage/CouponModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Currency/discount validation. |
| Folder modal | `components/pages/Dashboards/storepage/FolderModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 351 lines. |
| Create order modal | `components/pages/Dashboards/storepage/CreateOrderModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Money; confirm orphan/removal. |
| Partner modal | `components/pages/Dashboards/partnerspage/PartnerModal.tsx` | Creator partners | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Logo upload. |
| Broadcast email modal | `components/pages/Dashboards/supporterspage/BroadcastEmailModal.tsx` | Creator supporters | ✅ | ✅ | ✅ | ~ | ✅ | ✅ | Phase 6A uses shared `Dialog`, `Input`, `Textarea`, and `Button`; gated preview evidence captured. Real audience/comms delivery needs seed accounts. |
| Check-in modal | `components/parts/dashboard/gatherings/CheckInModal.tsx` | Creator gatherings | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | QR/search. |
| Confirm modal | `components/ui/ConfirmModal.tsx` | Global | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Existing primitive; rename/upgrade to dialog semantics. |

## Non-modal overlays / global surfaces

| Surface | File | Role | Mobile checked | Desktop checked | Dark mode checked | States covered | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Notification drawer | `components/ui/NotificationDrawer.tsx` | all auth | ☐ | ☐ | ☐ | ☐ | Convert to shared Drawer/Sheet. |
| Toasts | `components/ui/Toast.tsx` | all | ✅ | ✅ | ✅ | ~ | Phase 4 tokenized; contrast findings removed. Live-region/mobile offset still needs dedicated interaction test. |
| Feedback FAB | `components/parts/FeedbackFAB.tsx` | public | ☐ | ☐ | ☐ | ☐ | Reposition with new bottom nav. |
| Public navigation | `components/parts/Navigation.tsx` | public/supporter | ✅ | ✅ | ✅ | n/a | Wraps `PublicHeader`; supporter routes no longer import it. |
| Footer | `components/parts/Footer.tsx` | public/supporter | ✅ | ✅ | ✅ | n/a | Wraps `PublicFooter`; supporter routes no longer import it. |
| Creator bottom nav | `components/parts/dashboard/CreatorBottomNav.tsx` | creator | ✅ | n/a | TBD | n/a | Replaced by `DashboardMobileNav`; legacy file retained but unused. |
| Creator desktop layout | `components/parts/dashboard/Layout.tsx` | creator | ✅ | ✅ | TBD | ☐ | Sidebar/share/nav consolidated; page-level bodies remain pending. |

## Sign-off rule

A phase is not complete until:

1. Every row in the phase’s scope is checked.
2. Before/after screenshots exist at 360×640 and 1280×800 in light and dark.
3. axe has 0 serious/critical violations and no new moderate issues on touched routes.
4. Lighthouse mobile performance is ≥ 85 on touched public routes, or the miss is documented with a plan.
5. The route still satisfies the original feature behavior and money formatting.
6. Evidence is linked in `docs/REDESIGN_LOG.md`.
