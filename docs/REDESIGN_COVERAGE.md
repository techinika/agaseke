# Agaseke Full-App Redesign — Coverage Matrix

**Phase:** 0 (audit only)
**Branch:** `design/full-app-redesign`
**Updated:** 2026-11-17
**Status:** All redesign work is unchecked. No page has been approved or rebuilt.

This matrix is the release checklist for the redesign. A route is not “done” until every applicable column is checked and evidence is linked in `docs/REDESIGN_LOG.md`.

## Legend

| Mark | Meaning |
| --- | --- |
| `☐` | Not done / not verified for the redesign |
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
- Lighthouse values below are prior mobile runs; re-run after redesign.
- Full-input screenshots at 360×640 and 1280×800 in both themes are blocked by missing Firebase emulator/seed/test accounts and provider sandboxes. See `docs/screens/before/README.md`.

## Routes — 82 `page.tsx`

| Route | Component file | Role | Mobile layout done | Desktop layout done | Dark mode checked | Skeleton | Empty state | Error state | Uses only ui primitives | axe clean | Lighthouse (mobile) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `components/pages/LandingPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 75/97/92/100 | Public baseline; 12 tiny-text occurrences. |
| `/[username]` | `components/pages/PublicProfile`<br>`features/creator-page/CreatorPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; auth/data required for real creator. |
| `/[username]/booking` | `components/pages/public/BookingPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; booking data required. |
| `/[username]/community` | `components/pages/public/CommunityPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; tier/auth state required. |
| `/[username]/community/[postId]` | `components/pages/public/PostDetailPage`<br>`components/pages/public/ArticleReaderPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; post data required. |
| `/[username]/community/chat/[tierId]` | `components/parts/community/CommunityChatView` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/tier required; uses dedicated layout. |
| `/[username]/gatherings` | `components/pages/public/GatheringsPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; gathering data required. |
| `/[username]/gatherings/[gatheringId]` | `components/pages/public/GatheringDetailPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; booking/check-in flows. |
| `/[username]/giveaways` | `components/pages/public/GiveawaysPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; giveaway data required. |
| `/[username]/giveaways/[giveawayId]` | `components/pages/public/GiveawayDetailPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; entry/auth states. |
| `/[username]/messaging` | `components/pages/public/MessagingPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; message states. |
| `/[username]/store` | `components/pages/public/StorePage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; product data required. |
| `/[username]/store/[productId]` | `components/pages/public/ProductDetailPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; cart/checkout overlays. |
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
| `/articles/[slug]` | `components/pages/public/ArticleReaderPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; article data required; 25 orange. |
| `/booking/pay/[bookingId]` | `app/booking/pay/[bookingId]/PayClient.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Provider/payment state required. |
| `/bookings` | `app/(main)/bookings/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 812-line component. |
| `/changelog` | `components/pages/ChangelogPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/community/manage` | `app/(main)/community/manage/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture. |
| `/community/manage/[subscriptionId]` | `app/(main)/community/manage/[subscriptionId]/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/tier data capture. |
| `/content-guidelines` | `components/pages/Legal/ContentGuidelinesPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; long-form legal. |
| `/creator` | `features/creator-home/CreatorHome.tsx` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; money cards. |
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
| `/creator/payouts` | `components/pages/Dashboards/PayoutsPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; money; 25 orange. |
| `/creator/sales` | `components/pages/Dashboards/SalesPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; table/filter. |
| `/creator/settings` | `components/pages/Dashboards/SettingsPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 1,081 lines; 60 orange. |
| `/creator/store` | `components/pages/Dashboards/StorePage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; store overlays. |
| `/creator/store/coupons/new` | `components/parts/dashboard/CouponForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; currency-aware. |
| `/creator/store/folders/new` | `components/parts/dashboard/FolderForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required. |
| `/creator/store/orders/new` | `components/parts/dashboard/OrderForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; money. |
| `/creator/store/products/new` | `components/parts/dashboard/ProductForm` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth required; media upload. |
| `/creator/supporters` | `components/pages/Dashboards/SupportersPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; broadcast overlay. |
| `/creator/verify` | `components/pages/Dashboards/VerifyPage` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; upload/status. |
| `/dev/actions` | `app/dev/actions/Preview.tsx` | internal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Internal preview; exclude from production nav. |
| `/dev/components` | `app/dev/components/ComponentGallery.tsx` | internal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Internal gallery; primary system verification surface. |
| `/dev/creator-page` | `app/dev/creator-page/Preview.tsx` | internal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 78/97/96/100 | Preview, not real `[username]`; creator-page proxy only. |
| `/explore` | `components/pages/ExplorePage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/explore/posts` | `components/pages/ExplorePostsPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 86/100/100/100 | Public baseline. |
| `/explore/posts/[post-id]` | `components/pages/ExplorePostDetailPage`<br>`components/pages/public/ArticleReaderPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; post data required. |
| `/for-brands` | `app/(main)/for-brands/page.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/for-creators` | `app/(main)/for-creators/page.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 91/100/100/100 | Public baseline. |
| `/for-supporters` | `app/(main)/for-supporters/page.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/help-center` | `components/pages/HelpCenterPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/login` | `components/pages/LoginPage` | auth | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | 89/100/100/100 | Public baseline; provider buttons. |
| `/onboarding` | `components/pages/StartPage` | auth | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | 869 lines; 27 orange; onboarding state. |
| `/payment` | `components/parts/PaymentCallback` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Provider callback state required. |
| `/payout-policy` | `components/pages/Legal/PayoutPolicyPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Public; long-form legal. |
| `/privacy` | `components/pages/Legal/PrivacyPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/profile` | `components/pages/ProfilePage` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; account deletion. |
| `/store/pay/[orderId]` | `app/store/pay/[orderId]/PayClient.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Provider/order state required. |
| `/supporter` | `components/pages/Dashboards/SupporterSpace` | supporter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; 2,017 lines; 47 orange. |
| `/supporter/[postId]` | `components/parts/Navigation`<br>`components/parts/Footer`<br>`components/pages/Dashboards/supporter/SupporterPostDetail`<br>`components/pages/public/ArticleReaderPage` | supporter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; public-shell coupling. |
| `/supporter/notices` | `components/pages/Dashboards/NoticesPage`<br>`components/parts/FeedbackFAB`<br>`components/parts/Navigation` | supporter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; public-shell coupling. |
| `/terms` | `components/pages/Legal/TermsPage` | public | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | B | TBD | Public baseline. |
| `/transactions` | `app/(main)/transactions/page.tsx` | account | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | TBD | Auth/data capture; money; payout status. |

## Layouts — 6 `layout.tsx`

| Shell | File | Role | Mobile layout done | Desktop layout done | Dark mode checked | States covered | Uses only ui primitives | axe clean | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Root document shell | `app/layout.tsx` | all | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Fonts, theme, toasts, metadata. |
| Public marketing shell | `app/(main)/layout.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Header/footer/Navigation coupling. |
| Creator dashboard shell | `app/(dashboards)/creator/layout.tsx` | creator | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Desktop sidebar + mobile bottom nav + share. |
| Admin dashboard shell | `app/(dashboards)/admin/layout.tsx` | admin | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Admin nav, mobile overflow, role gate. |
| Public creator-profile shell | `app/(public_profile)/layout.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Creator page shell; conflicts with public shell? |
| Community chat shell | `app/(public_profile)/[username]/community/chat/[tierId]/layout.tsx` | public | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Full-height chat; bottom nav interaction. |

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
| Support modal | `components/parts/public/SupportModal.tsx` | Creator page | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Money; 433 lines; highest risk. |
| Subscribe modal | `components/parts/public/SubscribeModal.tsx` | Creator page | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Money; 437 lines. |
| Booking modal | `components/parts/public/BookingModal.tsx` | Creator page | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 392 lines; dates/timezones/payment. |
| Checkout modal | `components/parts/public/store/CheckoutModal.tsx` | Store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 513 lines; payment; money. |
| Cart modal | `components/parts/public/store/CartModal.tsx` | Store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Currency-aware totals. |
| Product detail modal | `components/parts/public/store/ProductDetailModal.tsx` | Store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Media/variants. |
| My purchases modal | `components/parts/public/store/MyPurchasesModal.tsx` | Store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Empty/loading/error. |
| Order tracking modal | `components/parts/public/store/OrderTrackingModal.tsx` | Store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Status timeline. |
| Share modal | `components/parts/public/ShareModal.tsx` | Creator/giveaway | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Clipboard fallback. |
| Public winners modal | `components/parts/public/giveaway/WinnersModal.tsx` | Giveaway detail | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Public winner data. |
| Giveaway modal | `components/pages/Dashboards/giveawayspage/GiveawayModal.tsx` | Creator giveaways | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 573 lines; money/prizes. |
| Creator winners modal | `components/pages/Dashboards/giveawayspage/WinnersModal.tsx` | Creator giveaways | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Winner selection. |
| Product modal | `components/pages/Dashboards/storepage/ProductModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 555 lines; 8 tiny-text. |
| Coupon modal | `components/pages/Dashboards/storepage/CouponModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Currency/discount validation. |
| Folder modal | `components/pages/Dashboards/storepage/FolderModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | 351 lines. |
| Create order modal | `components/pages/Dashboards/storepage/CreateOrderModal.tsx` | Creator store | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Money; confirm orphan/removal. |
| Partner modal | `components/pages/Dashboards/partnerspage/PartnerModal.tsx` | Creator partners | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Logo upload. |
| Broadcast email modal | `components/pages/Dashboards/supporterspage/BroadcastEmailModal.tsx` | Creator supporters | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Audience/preview. |
| Check-in modal | `components/parts/dashboard/gatherings/CheckInModal.tsx` | Creator gatherings | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | QR/search. |
| Confirm modal | `components/ui/ConfirmModal.tsx` | Global | ☐ | ☐ | ☐ | ☐ | ☐ | TBD | Existing primitive; rename/upgrade to dialog semantics. |

## Non-modal overlays / global surfaces

| Surface | File | Role | Mobile checked | Desktop checked | Dark mode checked | States covered | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Notification drawer | `components/ui/NotificationDrawer.tsx` | all auth | ☐ | ☐ | ☐ | ☐ | Convert to shared Drawer/Sheet. |
| Toasts | `components/ui/Toast.tsx` | all | ☐ | ☐ | ☐ | ☐ | Verify live region/mobile offset. |
| Feedback FAB | `components/parts/FeedbackFAB.tsx` | public | ☐ | ☐ | ☐ | ☐ | Reposition with new bottom nav. |
| Public navigation | `components/parts/Navigation.tsx` | public/supporter | ☐ | ☐ | ☐ | ☐ | Audit duplicated public/supporter shells. |
| Footer | `components/parts/Footer.tsx` | public/supporter | ☐ | ☐ | ☐ | ☐ | Supporter pages currently import public footer. |
| Creator bottom nav | `components/parts/dashboard/CreatorBottomNav.tsx` | creator | ☐ | ☐ | ☐ | ☐ | Replace with typed nav config. |
| Creator desktop layout | `components/parts/dashboard/Layout.tsx` | creator | ☐ | ☐ | ☐ | ☐ | Sidebar/share/nav consolidation. |

## Sign-off rule

A phase is not complete until:

1. Every row in the phase’s scope is checked.
2. Before/after screenshots exist at 360×640 and 1280×800 in light and dark.
3. axe has 0 serious/critical violations and no new moderate issues on touched routes.
4. Lighthouse mobile performance is ≥ 85 on touched public routes, or the miss is documented with a plan.
5. The route still satisfies the original feature behavior and money formatting.
6. Evidence is linked in `docs/REDESIGN_LOG.md`.
