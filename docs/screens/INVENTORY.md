# Screen inventory

Every route a **creator**, **supporter** or **fan** can reach, with the component
that renders it. Priority is the mobile-first refactor order:
**P0** = money / share / first impression, **P1** = core creator or fan task,
**P2** = management, admin, legal. Admin is listed for completeness; it is not in
the mobile UI scope.

## Fan / guest (no account)

| # | Route | Component | What it does today | Priority |
|---|---|---|---|---:|
| 1 | `/` | `components/pages/LandingPage.tsx` | Marketing home, featured creators | P0 |
| 2 | `/explore` | `components/pages/ExplorePage.tsx` | Creator search + paginated list | P1 |
| 3 | `/explore/posts` | `components/pages/ExplorePostsPage.tsx` | Public post feed | P1 |
| 4 | `/explore/posts/[post-id]` | `components/pages/ExplorePostDetailPage.tsx` | Public post detail | P1 |
| 5 | `/articles` | `components/pages/public/ArticleReaderPage.tsx` (list route) | Public articles | P2 |
| 6 | `/articles/[slug]` | `components/pages/public/ArticleReaderPage.tsx` | Article reader | P2 |
| 7 | `/[username]` | `components/pages/PublicProfile.tsx` | **Creator public page + tabs** | **P0** |
| 8 | `/[username]/store` | `components/pages/public/StorePage.tsx` | Store list | P1 |
| 9 | `/[username]/store/[productId]` | `components/pages/public/ProductDetailPage.tsx` | Product detail + buy | P1 |
| 10 | `/[username]/gatherings` | `components/pages/public/GatheringsPage.tsx` | Events list | P1 |
| 11 | `/[username]/gatherings/[gatheringId]` | `components/pages/public/GatheringDetailPage.tsx` | Event detail + RSVP | P1 |
| 12 | `/[username]/giveaways` | `components/pages/public/GiveawaysPage.tsx` | Giveaways list | P1 |
| 13 | `/[username]/giveaways/[giveawayId]` | `components/pages/public/GiveawayDetailPage.tsx` | Giveaway detail + enter | P1 |
| 14 | `/[username]/community` | `components/pages/public/CommunityPage.tsx` | Public + locked posts, tiers | P0 |
| 15 | `/[username]/community/[postId]` | `components/pages/public/PostDetailPage.tsx` | Post detail (private media) | P0 |
| 16 | `/[username]/community/chat` | `components/pages/public/CommunityPage.tsx` (chat) | Community chat entry | P2 |
| 17 | `/[username]/community/chat/[tierId]` | `components/parts/community/CommunityChatView.tsx` | Tier chat | P2 |
| 18 | `/[username]/booking` | `components/pages/public/BookingPage.tsx` | Book a meeting | P1 |
| 19 | `/[username]/messaging` | `components/pages/public/MessagingPage.tsx` | Message the creator | P2 |
| 20 | `/payment` | `app/(public_profile)/payment/page.tsx` | Payment return/status page | P0 |
| 21 | `/store/pay/[orderId]` | `app/store/pay/[orderId]/PayClient.tsx` | Store checkout status | P0 |
| 22 | `/booking/pay/[bookingId]` | `app/booking/pay/[bookingId]/PayClient.tsx` | Booking payment status | P0 |
| 23 | Support flow | `components/parts/public/SupportModal.tsx` | **Support bottom sheet / modal** | **P0** |
| 24 | Share flow | `components/parts/public/ShareModal.tsx`, `components/parts/SharePage.tsx` | Share link + QR | P0 |
| 25 | `/for-creators` | `components/pages/StartPage.tsx` | Marketing | P2 |
| 26 | `/for-supporters` | marketing page | Marketing | P2 |
| 27 | `/for-brands` | marketing page | Marketing | P2 |
| 28 | `/help-center` | `components/pages/HelpCenterPage.tsx` | Help | P2 |
| 29 | `/changelog` | `components/pages/ChangelogPage.tsx` | Changelog | P2 |
| 30 | `/terms` | `components/pages/Legal/TermsPage.tsx` | Legal | P2 |
| 31 | `/privacy` | `components/pages/Legal/PrivacyPage.tsx` | Legal | P2 |
| 32 | `/payout-policy` | `components/pages/Legal/PayoutPolicyPage.tsx` | Legal | P2 |
| 33 | `/content-guidelines` | `components/pages/Legal/ContentGuidelinesPage.tsx` | Legal | P2 |
| 34 | 404 / error | `app/not-found.tsx`, `app/error.tsx`, `app/(public_profile)/[username]/error.tsx` | Error states | P1 |

## Authenticated supporter / fan

| # | Route | Component | What it does today | Priority |
|---|---|---|---|---:|
| 35 | `/login` | `components/pages/LoginPage.tsx` | Sign in (Google) | P1 |
| 36 | `/onboarding` | onboarding page component | Profile / creator onboarding | P1 |
| 37 | `/supporter` | `components/pages/Dashboards/SupporterSpace.tsx` | Supporter feed / library-ish home | P0 |
| 38 | `/supporter/notices` | `components/pages/Dashboards/NoticesPage.tsx` | Creator notices | P1 |
| 39 | `/supporter/[postId]` | `components/pages/Dashboards/supporter/SupporterPostDetail.tsx` | Private post view | P0 |
| 40 | `/transactions` | `app/(main)/transactions/page.tsx` | My payments | P1 |
| 41 | `/bookings` | `app/(main)/bookings/page.tsx` | My bookings | P1 |
| 42 | `/community` | `components/pages/Dashboards/CommunityPage.tsx` | My community memberships | P2 |
| 43 | `/community/manage` | `app/(main)/community/manage/page.tsx` | Manage memberships | P2 |
| 44 | `/community/manage/[subscriptionId]` | `app/(main)/community/manage/[subscriptionId]/page.tsx` | Manage one | P2 |
| 45 | `/profile` | `components/pages/ProfilePage.tsx` | Account settings | P1 |

## Creator dashboard

| # | Route | Component | What it does today | Priority |
|---|---|---|---|---:|
| 46 | `/creator` | `components/pages/Dashboards/CreatorSpace.tsx` | Dashboard home | **P0** |
| 47 | `/creator/content` | `components/pages/Dashboards/ContentPage.tsx` | Posts list | P1 |
| 48 | `/creator/content/new` | `components/parts/dashboard/PostForm.tsx` | Create post | P1 |
| 49 | `/creator/content/articles` | `components/pages/Dashboards/ArticlesPage.tsx` | Articles list | P2 |
| 50 | `/creator/content/articles/new` | `components/parts/dashboard/ArticleForm.tsx` | Write article | P2 |
| 51 | `/creator/content/articles/[articleId]` | `components/parts/dashboard/ArticleForm.tsx` | Edit article | P2 |
| 52 | `/creator/notices` | `components/pages/Dashboards/NoticesPage.tsx` | Send notices | P1 |
| 53 | `/creator/store` | `components/pages/Dashboards/StorePage.tsx` | Store overview | P1 |
| 54 | `/creator/store/products` | `.../storepage/ProductsList.tsx` | Products | P1 |
| 55 | `/creator/store/products/new` | `.../storepage/ProductModal.tsx` | Add product | P1 |
| 56 | `/creator/store/folders` | `.../storepage/FoldersList.tsx` | Collections | P2 |
| 57 | `/creator/store/folders/new` | `.../storepage/FolderModal.tsx` | Add collection | P2 |
| 58 | `/creator/store/coupons` | `.../storepage/CouponsList.tsx` | Coupons | P2 |
| 59 | `/creator/store/coupons/new` | `.../storepage/CouponModal.tsx` | Add coupon | P2 |
| 60 | `/creator/store/orders` | `.../storepage/OrdersList.tsx` | Orders | P1 |
| 61 | `/creator/store/orders/new` | `.../storepage/CreateOrderModal.tsx` | Manual order | P2 |
| 62 | `/creator/sales` | `components/pages/Dashboards/SalesPage.tsx` | Sales | P1 |
| 63 | `/creator/gatherings` | `components/pages/Dashboards/GatheringsPage.tsx` | Events | P1 |
| 64 | `/creator/gatherings/new` | `components/parts/dashboard/GatheringsForm.tsx` | Create event | P1 |
| 65 | `/creator/gatherings/[id]` | `.../gatherings/GatheringDetailPanel.tsx` | Event detail | P1 |
| 66 | `/creator/gatherings/[id]/edit` | `components/parts/dashboard/GatheringsForm.tsx` | Edit event | P1 |
| 67 | `/creator/bookings` | `components/pages/Dashboards/BookingsPage.tsx` | Booking requests | P1 |
| 68 | `/creator/giveaways` | `components/pages/Dashboards/GiveawaysPage.tsx` | Giveaways | P1 |
| 69 | `/creator/giveaways/new` | `components/parts/dashboard/GiveawayForm.tsx` | Create giveaway | P1 |
| 70 | `/creator/messages` | `components/pages/Dashboards/MessagesPage.tsx` | DMs | P1 |
| 71 | `/creator/community` | `components/pages/Dashboards/CommunityPage.tsx` | Tiers | P2 |
| 72 | `/creator/community/chat` | community chat | Chat list | P2 |
| 73 | `/creator/community/chat/[tierId]` | `CommunityChatView.tsx` | Tier chat | P2 |
| 74 | `/creator/supporters` | `components/pages/Dashboards/SupportersPage.tsx` | Supporters list | P1 |
| 75 | `/creator/partners` | `components/pages/Dashboards/PartnersPage.tsx` | Partners | P2 |
| 76 | `/creator/partners/new` | `.../partnerspage/PartnerModal.tsx` | Add partner | P2 |
| 77 | `/creator/verify` | `components/pages/Dashboards/VerifyPage.tsx` | ID verification | P1 |
| 78 | `/creator/payouts` | `components/pages/Dashboards/PayoutsPage.tsx` | Earnings / payouts | **P0** |
| 79 | `/creator/settings` | `components/pages/Dashboards/SettingsPage.tsx` | Settings | P1 |

## Admin (out of scope, exists)

`/admin`, `/admin/categories`, `/admin/changelog`, `/admin/comms`,
`/admin/countries`, `/admin/country-currencies`, `/admin/currencies`,
`/admin/feedback`, `/admin/logs`, `/admin/payouts`, `/admin/users`.

## Overlays and cross-cutting states

| State | Where | Notes |
|---|---|---|
| Support sheet | `SupportModal.tsx` | 4 internal steps, no URL, no deep-link |
| Cart / checkout | `parts/public/store/CartModal.tsx`, `CheckoutModal.tsx` | Modal flow |
| Product detail | `ProductDetailModal.tsx` | Modal duplicate of the product page |
| Order tracking | `OrderTrackingModal.tsx` | Status |
| Share | `ShareModal.tsx`, `SharePage.tsx` | Link + QR variants |
| QR download | `SharePage.tsx` / `qrcode.react` | Creator share |
| Notifications | `components/ui/NotificationDrawer.tsx` | Drawer |
| Feedback | `DashboardLayout`, `MobileBottomBar` | Duplicate implementations |
| Skeleton | `PublicProfile.tsx` `ProfileSkeleton`, `DetailSkeleton.tsx` | Only some pages |
| Spinner | `CreatorSpace.tsx:155`, many others | Full-page spinner |
| Empty / error | `TabErrorState.tsx`, ad-hoc per page | Inconsistent |
| Cookie/PWA | `PwaRegister.tsx` | Service worker registration |
| Login nudge | `LoginNotice.tsx` | Fixed bottom-right, overlaps bottom bars |
