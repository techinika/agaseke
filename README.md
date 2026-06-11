# Agaseke

Agaseke is a comprehensive content monetization platform built with Next.js 16, Firebase, and TypeScript. It empowers creators to build communities, share exclusive content, sell merchandise and digital products, and earn revenue through subscriptions, tips, and direct sales.

## Features

### For Creators

- **Creator Profiles**: Personalized pages at `/[username]` to showcase content and brand
- **Content System**:
  - Public and private posts
  - Support-only exclusive content
  - Media uploads (images, videos, documents)
  - **Email notifications to supporters** when new content is posted
- **Store** (`/creator/store`):
  - Digital products (PDFs, videos, audio, images)
  - Physical products with stock management
  - Size options for merchandise
  - Bulk pricing discounts
  - Coupon/discount codes
  - Product-specific coupons
  - Folders (product bundles) with bundle discounts
  - Order management and tracking
  - **Order progress tracking**: Start Processing → Mark as Shipped → Mark as Delivered
  - **Go back** to previous status if mistakes or delays
  - **Email notifications** sent to customers when order status changes
  - Platform fee payer option (buyer pays 10% extra or creator absorbs 10%)
  - Reopen cancelled orders
  - Create manual orders from dashboard
- **Sales** (`/creator/sales`):
  - Real-time sales statistics (Total Sales, Your Earnings, Total Orders, Unique Buyers)
  - Recent Sales table with product images, buyer profile photos/emails, product type badges
  - Top Products section with rank badges, units sold, earnings
  - Search by buyer name, product name, or email
  - Time filters (All Time, This Week, This Month, This Year)
  - Only visible when Store is enabled in settings
- **Giveaways** (`/creator/giveaways`):
  - Create and edit contests with multiple prize types
  - Random draw or challenge-based selection
  - **Spinning wheel animation** for lucky draw winner selection
  - Access control (public/supporters/minimum tier)
  - Partner sponsorship support with sponsor logos
  - Winner selection with automatic notification
  - Shareable giveaway links
  - Public profile shows ended giveaways with winner announcements
  - Congratulatory message for winners on public profile
  - Edit individual giveaway details from dashboard
- **Partners** (`/creator/partners`):
  - Manage brands and businesses you collaborate with
  - Feature partners on public profile
  - Partners displayed below tabs section, before footer
  - Partners shown on sponsored giveaways
  - Improved card-based layout with descriptions
- **Supporters** (`/creator/supporters`):
  - View list of all supporters with total support amounts
  - Search supporters by name or email
  - Filter by support amount (above/below threshold)
  - Broadcast email to all supporters or filtered subset
  - Personalized email with [NAME] placeholder
- **Messaging** (`/creator/messages`):
  - Direct messaging with supporters
  - Per-conversation enable/disable
  - Email notifications for new messages
- **Book a Meeting** (`/creator/bookings`):
  - Booking requests management with accept/decline actions
  - Set availability (days of week, time slots, date range)
  - Configure meeting type (online, in-person, or both)
  - Location or video link settings
  - Paid tiered booking system with tier selection (choose a tier with a price)
  - Calendar integration: Google Calendar, Yahoo Calendar, Apple/Outlook (.ics) buttons in response email
  - Meeting location/link displayed in booking summary and confirmation email
  - Server-side validation: date range, day-of-week, time slot matching, and price verification
  - Duration-aware conflict detection (overlapping time ranges instead of exact string match)
  - Reason encryption at rest using AES-256-GCM (key from `ENCRYPTION_KEY` env var)
  - In-app notifications sent to both creator and booker on request, payment, and response
  - Confirmation email sent to booker on successful booking request
  - Automatic email notifications for booking responses
  - "Book a Meeting" button on public profiles (shown when availability is set)
  - Clear availability to temporarily disable booking feature
- **Gatherings** (`/creator/gatherings`):
  - Enable/disable via Perks settings (hidden from sidebar when disabled)
  - Event creation with date, time, location, and description
  - Edit and update existing events
  - Enable/disable individual events (disabled events not shown publicly)
  - Paid gatherings with ticket pricing (Momo/Card payment integration)
  - Minimum support tier access control for gated events
  - RSVP capacity limits
  - Guest check-in with search and real-time attendee list via `onSnapshot`
  - Email notifications for check-ins, new gatherings (to supporters), and RSVPs (to creator)
  - In-app notifications for new gatherings and RSVPs
  - Public profile shows Events tab when gatherings are enabled
  - Location visible after RSVP (not after check-in)
- **Supporters Perks**:
  - Configurable minimum support tiers
  - Store access control (public or supporters-only)
  - Booking access control (public or supporters-only)
  - Gatherings toggle (enable/disable entire feature)
- **Dashboard** (`/creator`):
  - Analytics overview
  - Content management
  - Payout tracking
  - Social share flier generator with customization:
    - Choose from preset accent colors or custom color picker
    - Auto-adjusts text color for visibility
    - Edit headline text (max 30 characters)
    - Download personalized share image for social media

### For Supporters

- **Public Profiles**: Browse creator content at `/[username]`
- **Public Profile Subpages**: Full-page versions of each tab with SEO-friendly URLs:
  - `/[username]/community` - All public posts and supporter-only content
  - `/[username]/community/[postId]` - Individual post detail with comments and likes
  - `/[username]/store` - Browse products, track orders, view purchased items
  - `/[username]/store/[productId]` - Individual product detail page
  - `/[username]/gatherings` - Upcoming events and past gatherings
  - `/[username]/gatherings/[gatheringId]` - Individual event detail with RSVP
  - `/[username]/giveaways` - Active and past giveaways with winners
  - `/[username]/giveaways/[giveawayId]` - Individual giveaway detail with enter/share/winners
  - `/[username]/booking` - Book a meeting with the creator
  - `/[username]/messaging` - Direct message the creator
- **Community Interaction**: Like posts and leave comments on creator content
- **Support**: One-time payments via mobile money (MomoPay) or card (credit/debit)
- **Gift Once**: Quick support button available on all subpages
- **Winner Notification**: Congratulatory message when winning a giveaway
- **Progressive Web App**: Install Agaseke as a standalone app on your device

### Admin Dashboard (`/admin`)

- **Platform Overview**:
  - Real-time statistics (profiles, creators, income, views)
  - Product, giveaway, order, and support counts
  - Visitor tracking (today, week, month)
  - Recent activity feed
  - Top earners and most viewed creators
- **User Management** (`/admin/users`):
  - View all platform users with pagination (25 per page, cursor-based)
  - Filter by user type (creator, supporter)
  - Search by name or email
  - Make users admins or remove admin status (using `isAdmin` boolean field)
  - Click user row to open side panel with full profile details and phone number
  - Creator profile (from `creators` collection) displayed in side panel if exists
- **Payouts** (`/admin/payouts`):
  - View and process withdrawal requests
  - Approve or reject payouts
  - Automatic email notification after payout approval
- **Broadcast** (`/admin/comms`):
  - Send broadcast emails to all users
- **Activity Logs** (`/admin/logs`):
  - View all platform activities
  - Filter by level (info, success, warning, error)
  - Filter by category (auth, payment, payout, support, etc.)
  - Search logs
  - Export logs to CSV
  - Click any log row to open detail side panel with full message, timestamp, user/creator info, and formatted metadata JSON
  - Comprehensive error logging: all server catch blocks log full error data to Firestore `activityLogs` with creator name + current user context
  - Client-side error logging via `logError` from `@/lib/logger` in all booking and payment components

### SEO & Discovery

- **Dynamic Metadata**:
  - Page-specific titles, descriptions, and keywords
  - Open Graph tags for social sharing
  - Twitter Card meta tags
  - Canonical URLs for duplicate content prevention
- **Structured Data (JSON-LD)**:
  - Organization schema for brand identity
  - WebSite schema with search action
  - Person schema for creator profiles
  - BreadcrumbList for navigation context
  - FAQPage schema for help center
- **Sitemap**:
  - Auto-generated from creator profiles
  - Dynamic priorities and change frequencies
  - Image metadata for rich results
- **Robots.txt**:
  - Selective crawling rules
  - Specific rules for search engines (Google, Twitter, Facebook)
- **Viewport & Theme**:
  - Responsive viewport configuration
  - Orange theme color for mobile browsers

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Cloudinary (images, videos, files)
- **Payments**: PesaPal (Mobile Money)
- **Email**: API routes with email service integration

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (Firestore, Auth)
- Cloudinary account
- PesaPal merchant account

### Installation

1. Clone and install:
```bash
git clone https://github.com/techinika/agaseke.git
cd agaseke
npm install
```

2. Create `.env.local`:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Encryption (booking reasons at rest)
ENCRYPTION_KEY=your_secret_key_min_16_chars

# SMTP (email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. Run development server:
```bash
npm run dev
```

## Project Structure

```
agaseke/
├── app/
│   ├── (auth)/                  # Login, signup pages
│   ├── (dashboards)/            # Creator dashboard routes
│   │   └── creator/
│   │       ├── content/         # Content management
│   │       ├── gatherings/       # Events management
│   │       ├── messages/        # Messaging inbox
│   │       ├── payouts/          # Earnings & payouts
│   │       ├── settings/         # Creator settings
│   │       ├── store/            # Store management
│   │       ├── sales/            # Sales tracking & analytics
│   │       ├── supporters/       # Supporters & broadcast email
│   │       ├── partners/         # Partner management
│   │       ├── giveaways/        # Giveaway management
│   │       └── verify/           # Identity verification
│   ├── [username]/               # Public creator profiles
│   │   ├── community/             # Full community page
│   │   │   └── [postId]/          # Individual post detail with comments/likes
│   │   ├── gatherings/            # Full gatherings page
│   │   │   └── [gatheringId]/     # Individual event detail
│   │   ├── store/                 # Full store page
│   │   │   └── [productId]/       # Individual product detail
│   │   ├── giveaways/             # Full giveaways page
│   │   │   └── [giveawayId]/      # Individual giveaway detail
│   │   ├── booking/               # Book a meeting page
│   │   └── messaging/             # Full messaging page
│   └── api/
│       ├── comms/email/          # Email notification APIs
│       ├── support/              # Payment APIs
│       └── upload/               # File upload APIs
├── components/
│   ├── pages/
│   │   ├── Dashboards/          # Dashboard components
│   │   └── PublicProfile.tsx     # Public profile page
│   ├── parts/
│   │   ├── dashboard/           # Dashboard UI parts
│   │   │   └── gatherings/      # Gathering sub-components (ListPanel, DetailPanel, CheckInModal)
│   │   └── public/              # Public profile parts
│   │       ├── CommunityTab.tsx  # Content display
│   │       ├── MessageTab.tsx    # Messaging UI
│   │       └── StoreTab.tsx      # Store UI
│   └── ui/                      # Shared UI components
├── auth/                         # Authentication context
├── db/                           # Firebase config
├── types/                        # TypeScript types
│   ├── creator.ts               # Creator interface
│   ├── messaging.ts              # Messaging types
│   ├── store.ts                 # Store types
│   ├── giveaway.ts               # Giveaway types
│   └── booking.ts                # Booking types
└── public/                      # Static assets
```

## Firestore Collections

### Core Collections

| Collection | Description |
|------------|-------------|
| `creators` | Creator profiles with settings |
| `profiles` | User profile data |
| `supportedCreators` | Support transactions (creatorId, amount, supporterId) |
| `activityLogs` | Platform activity logs for admin monitoring |

### Messaging

| Collection | Description |
|------------|-------------|
| `chatrooms` | Conversations between creator and supporter |
| `chatrooms/{id}/messages` | Individual messages |

### Content

| Collection | Description |
|------------|-------------|
| `creatorContent` | Posts (public/private) |
| `creatorGatherings` | Events |
| `gatheringsAttendance` | RSVP records |

### Store

| Collection | Description |
|------------|-------------|
| `storeProducts` | Products (digital/physical) |
| `storeOrders` | Customer orders |
| `storeCoupons` | Discount coupons |
| `sales` | Individual sale records with earnings breakdown |

### Giveaways

| Collection | Description |
|------------|-------------|
| `giveaways` | Giveaway contests |
| `giveawayEntries` | Participant entries |
| `creatorPartners` | Brand/business partnerships |

### Bookings

| Collection | Description |
|------------|-------------|
| `bookingRequests` | Meeting booking requests |

## Key Interfaces

## Key Interfaces

### Creator Settings (Firestore)
```typescript
interface Creator {
  messagingEnabled?: boolean;      // Enable/disable messaging
  messagingAllowAll?: boolean;     // Allow all supporters or min amount
  messagingMinAmount?: number;     // Minimum support for messaging
  storeEnabled?: boolean;          // Enable store feature
  storePublic?: boolean;          // Store visible to all or supporters only
  giveawayEnabled?: boolean;       // Enable giveaway feature
  bookingEnabled?: boolean;        // Enable booking feature
  bookingAccess?: "public" | "supporters"; // Who can book meetings
  bookingAvailability?: BookingAvailability; // Availability settings
}
```

### Booking Request
```typescript
interface BookingRequest {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  bookerId?: string;
  bookerName: string;
  bookerEmail: string;
  bookerPhone: string;
  reason: string;                   // Encrypted at rest (AES-256-GCM)
  preferredType: "online" | "physical" | "both";
  preferredDate: string;
  preferredTime: string;
  meetingLocation?: string;         // URL for online, address for physical
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  responseNote?: string;
  paid?: boolean;                   // True if a paid tier booking
  tierId?: string;                  // Selected tier for paid booking
  tierPrice?: number;
  tierDuration?: string;            // e.g., "30min", "60min"
  paymentTxRef?: string;            // Payment transaction reference
  paymentMethod?: string;           // "card" or "momo"
}

interface BookingAvailability {
  daysOfWeek: number[];           // 0=Sunday, 6=Saturday
  bookingType: "online" | "physical" | "both";
  startDate?: string;
  endDate?: string;
  defaultSlots: BookingTimeSlot[];
  tiers?: BookingTier[];          // Paid tiers with prices
  location?: string;
  onlineLink?: string;
}

interface BookingTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface BookingTier {
  id: string;
  name: string;
  price: number;
  duration: string;               // e.g., "30min", "60min"
  description?: string;
}
```

### Chatroom
```typescript
interface Chatroom {
  creatorId: string;
  supporterId: string;
  supporterName: string;
  lastMessage: string;
  unreadCount: number;
  enabled: boolean;               // Per-conversation toggle
  createdAt: Timestamp;
}
```

### Store Product
```typescript
interface Product {
  name: string;
  description: string;
  price: number;
  type: "digital" | "physical";
  stock?: number;                  // For physical products
  imageUrl?: string;
  fileUrl?: string;               // For digital products
  bulkPricing?: {                 // Quantity discounts
    minQuantity: number;
    discountPercentage: number;
  }[];
  active: boolean;
}
```

### Order
```typescript
interface Order {
  buyerId: string;
  buyerName: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered";
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
}
```

### Giveaway
```typescript
interface Giveaway {
  title: string;
  description: string;
  type: "random" | "challenge";
  access: "public" | "supporters" | "tier";
  minSupportAmount?: number;
  startDate: Timestamp;
  endDate: Timestamp;
  maxWinners: number;
  rewards: GiveawayReward[];
  partners: GiveawayPartner[];
  status: "draft" | "active" | "ended" | "completed";
  winners: GiveawayWinner[];
}

interface GiveawayReward {
  type: "cash" | "merchandise" | "discount" | "service";
  title: string;
  quantity: number;
}
```

## API Routes

### Email Notifications
- `POST /api/comms/email/message` - New message notification
- `POST /api/comms/email/store/order` - Order confirmation
- `POST /api/comms/email/store/status` - Order status change notification
- `POST /api/comms/email/gathering/checkin` - Check-in notification
- `POST /api/comms/email/gathering/declined` - Gathering declined notification
- `POST /api/comms/email/gathering/undo` - Gathering undo notification
- `POST /api/comms/email/gathering/created` - Notify all supporters + in-app notification when gathering is published
- `POST /api/comms/email/gathering/rsvp` - Notify creator + in-app notification when someone RSVPs
- `POST /api/comms/email/broadcast` - Broadcast email to supporters
- `POST /api/comms/email/payout/processed` - Payout processed notification
- `POST /api/comms/email/content/new` - Notify supporters of new content
- `POST /api/comms/email/booking/request` - Booking request notification to creator
- `POST /api/comms/email/booking/response` - Booking response notification to booker

### Bookings
- `POST /api/bookings` - Submit a booking request (validates availability, price, conflicts; encrypts reason)
- `POST /api/encrypt` - Encrypt text with AES-256-GCM (server-side utility)
- `POST /api/decrypt` - Decrypt text with AES-256-GCM (server-side utility)
- `GET /booking/pay/[bookingId]` - Paid booking payment page
- `POST /api/support/with-card/ipn` - IPN webhook for card booking payments (notifies buyer + admin)
- `POST /api/support/with-momo/webhook` - Webhook for MoMo booking payments (notifies buyer + admin)

### File Uploads
- `POST /api/upload/content/image` - Image upload
- `POST /api/upload/content/video` - Video upload
- `POST /api/upload/content/docs` - Document upload
- `POST /api/upload/picture` - Profile picture

### Payments
- `POST /api/support/with-momo/pay` - Mobile money payment
- Webhook handlers for payment confirmation

## Configuration

### Enabling/Disabling Features

Features are controlled via creator settings in Firestore:

1. **Messaging**: Toggle in `/creator/settings` (Messaging tab)
2. **Store**: Toggle in `/creator/settings` (Perks tab)
3. **Book a Meeting**: Toggle in `/creator/settings` (Perks tab), manage at `/creator/bookings`
4. **Per-conversation disable**: In `/creator/messages`, use the Ban icon

### Store Access Control

When `storePublic: false`:
- Only supporters can view and purchase
- Public users see "Support to access" message

### Messaging Access Control

- `messagingEnabled`: Master toggle
- `messagingAllowAll`: Allow all supporters or minimum amount
- `messagingMinAmount`: Required support amount
- Per-chatroom `enabled` field: Block individual users

## Bug Fixes

- **Public Profile Firebase Error**: Fixed `where() called with invalid data` error by adding proper null checks for `currentUser?.uid` and `username` before executing Firestore queries.

## UI/UX Improvements

### Confirmation Modals
- Added `ConfirmModal` component (`components/ui/ConfirmModal.tsx`) for consistent delete confirmations
- Replaced all `confirm()` browser dialogs with proper modal UI
- Replaced all `alert()` calls with toast notifications

### Dashboard Layout
- Consistent sidebar layout with Back button and primary action aligned horizontally
- Broadcast Email button moved to sidebar on Supporters page
- Add Partner button moved to sidebar on Partners page

### Account Deletion
- Profile deletion now checks for creator status and pending payouts
- If pending payout exists, user must withdraw funds first
- Firebase auth account deleted, profile archived with `status: "archived"`
- Creator profile preserved for content accessibility

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Type Check
```bash
npm run typecheck
```

## Deployment

The app is optimized for Vercel deployment:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

## License

MIT License - see LICENSE file for details.

## Support

For issues or feature requests, please open an issue on GitHub.

## Recent Updates

### Sales Dashboard & Store Enhancements (May 2026)
- **Sales Page** (`/creator/sales`): New dashboard page for tracking product sales and earnings
  - Real-time sales statistics: Total Sales, Your Earnings, Total Orders, Unique Buyers
  - Recent Sales table with product images, buyer profile photos/emails, product type (Digital/Physical) badges
  - Top Products section with rank badges, product images, units sold, type indicator
  - Search by buyer name, product name, or email
  - Time filters: All Time, This Week, This Month, This Year
  - Only visible in sidebar when `storeEnabled` is true in creator settings
- **Store Payment Fix**: Uses `supporterId` instead of `buyerId` to correctly get logged-in user ID for transactions
- **Order Data Handling**: Fixed `order.items.some()` undefined error by checking if `items` array exists before using it
- **My Purchases**: Added button in StoreTab for viewing order history with digital product download capability
- **Sales Collection**: Each sale record includes `productId`, `buyerId`, `creatorId`, `creatorUid`, `productName`, `buyerName`, `buyerEmail`, `quantity`, `productPrice`, `totalAmount`, `platformFee`, `creatorEarnings`, `referralEarnings`, `referralUid`, `status`, `paymentMethod`, `createdAt`

### SEO & Discovery Enhancements (May 2025)
- **Dynamic Metadata**: Server-side `generateMetadata` for all creator profile pages (`/[username]`, `/[username]/community`, `/[username]/store`, `/[username]/gatherings`, `/[username]/giveaways`, `/[username]/messaging`)
- **Sitemap**: Auto-generated sitemap includes all creator profiles, enabled subpages, AND individual detail pages (products, posts, giveaways, gatherings) with UID-to-username mapping
- **baseUrl**: Separated `baseUrl` utility to `lib/baseUrl.ts` to avoid firebase-admin being bundled in client components
- **Payment Confirmation**: Different confirmation messages for store payments ("Confirming your order payment..." / "Your payment of X RWF has been processed successfully.") vs support gifts ("Confirming your gift..." / "Your gift of X RWF has been sent successfully.")

### Detail Pages & PWA (May 2026)
- **Product Detail Pages**: `/[username]/store/[productId]` — Full product view instead of modal, with add-to-cart, size selection, bulk pricing
- **Post Detail Pages**: `/[username]/community/[postId]` — Full post view with comments and likes system
- **Giveaway Detail Pages**: `/[username]/giveaways/[giveawayId]` — Full giveaway view with enter, share, and winner viewing
- **Event Detail Pages**: `/[username]/gatherings/[gatheringId]` — Full event view with RSVP, capacity, and location info
- **Booking Page**: `/[username]/booking` — Standalone booking page instead of modal, with calendar picker, time slots, and meeting type selection
- **Comments & Likes**: Added real-time comments and likes to community posts (Firestore subcollections)
- **Progressive Web App**: Added manifest.json, service worker with cache-first strategy for static assets, and install prompts

### Performance & SEO Improvements (May 2026)
- **Server-Side JSON-LD**: Schema components (`HomeSchema`, `ExploreSchema`, `CreatorSchema`) migrated from client-side `document.createElement` to server-rendered `<script>` tags — structured data now visible to all crawlers
- **Full SEO Metadata Coverage**: Added `openGraph` + `twitter:card` metadata to 13 previously-missing pages (changelog, help-center, payout-policy, profile, login, onboarding, dashboard index pages)
- **Twitter Cards on Detail Pages**: Added twitter metadata to all 5 detail page types (`[postId]`, `[productId]`, `[giveawayId]`, `[gatheringId]`, `booking`)
- **Home Page Metadata**: Added explicit `export const metadata` to root landing page with OG/Twitter tags
- **Server Components**: Converted legal pages (`TermsPage`), `loading.tsx`, and all SEO schema components from client to server components — reducing JS bundle
- **Dynamic Imports**: Code-split heavy libraries — `framer-motion` on error/404 pages, `qrcode.react` on share page, `canvas-confetti` loaded lazily
- **Memoized Handlers**: Added `useCallback` to 11 event handlers in `PostDetailPage` and `StoreTab` to prevent unnecessary re-renders
- **Async Memo Fix**: Replaced async `useMemo` anti-pattern (returning Promises) with proper `useEffect` + `Promise.all` in `SupportersPage`
- **Heading Hierarchy**: Added missing `<h1>` to 4 dashboard pages; fixed `<h1>`→`<h3>` jump in `NoticesPage`
- **Alt Text**: Fixed 9 empty `alt=""` attributes on profile/content images across the platform
- **Sitemap Partitioning**: Split sitemap into 6 category files via `generateSitemaps` (static, creators, products, posts, giveaways, gatherings) — all links preserved, under 50K per file
- **Noindex on Dashboards**: Added `robots: noindex` to 21 dashboard/admin sub-pages to prevent private routes from appearing in search results
- **Sitemap Coverage**: Added `/changelog` to sitemap static pages
- **Admin Description Fix**: Corrected copy-paste error on admin dashboard metadata
- **Notification Icons**: Added missing `new_like` and `new_comment` icon entries in `NotificationDrawer`

### Gatherings & Event Perfection (May 2026)
- **Description Field**: Added `description` textarea to gathering create/edit form on creator dashboard; displayed on gathering cards
- **Paid Gatherings**: `ticketPrice` field in create/edit form — paid gatherings visible to everyone, payment flows through existing Momo/Card pay routes with `type: "gathering"`; webhooks/IPNs create `gatheringsAttendance` with `paid: true` on confirmation
- **Payment Modal in GatheringsTab**: Paid gatherings trigger a payment modal (Momo/Card toggle, phone input, pay button) before creating attendance record; listens to `transactions` collection via `onSnapshot` for confirmation with 2-minute timeout
- **Min Support Tier Access Control**: Events gated by `minSupportTier` hidden from non-qualifying users; shown as locked with minimum amount message
- **Location Visibility**: Changed from "after check-in" to "after RSVP"
- **Real-Time Attendees**: Switched from `getDocs` to `onSnapshot` for live attendee list on creator dashboard
- **Optimized Past Query**: Uses `where("status", "in", ["Disabled", "Past"])` instead of client-side filtering
- **Supporter Notifications**: All supporters notified via email + in-app notification when a gathering is created
- **Creator Notifications**: Creator notified via email + in-app notification when someone RSVPs (free or paid)
- **Dashboard Logging**: All gathering actions (create, update, delete, check-in, decline, undo) logged via `logActivity`
- **Activity Logs in Email Routes**: All gathering email routes (`checkin`, `declined`, `undo`, `created`, `rsvp`) now write success/error entries to `activityLogs` collection with `category: "gathering"`
- **ticketSales Subcollection**: `handleGatheringPayment.ts` writes a `ticketSales` document on successful payment, and the dashboard listens for cumulative revenue/count across all events
- **Dashboard Refactored**: Monolithic `GatheringsPage.tsx` (1026 lines) split into focused sub-components (`GatheringListPanel`, `GatheringDetailPanel`, `CheckInModal`) under `components/parts/dashboard/gatherings/`
- **Log Category Fix**: `GatheringsForm.tsx` and all gathering-related `logActivity` calls use `category: "gathering"` instead of `"general"`

### Comprehensive Error Logging (May 2026)
- **Server-Side Firestore Logging**: Every catch block in all API routes now writes to `activityLogs` collection via `adminDb.collection("activityLogs").add()` with:
  - Creator name (`creatorName`) and current logged-in user info (`userId`, `userEmail`, `userName`)
  - Full error serialization via `JSON.stringify(error, Object.getOwnPropertyNames(error)).slice(0, 5000)`
  - Routes covered: bookings, booking request/response email, Momo pay/webhook, Card pay/IPN, public profile
- **Client-Side Logging**: `logError` from `@/lib/logger` added to all catch blocks in `BookingPage`, `BookingModal`, `BookingsPage` (6 catches), `PayClient` (4 paths), `GatheringsTab`, and `GatheringDetailPage`
- **Admin Logs Detail Panel**: Click any log row to open slide-in side panel with full entry details and formatted metadata JSON

### Admin Panel Enhancements (May 2026)
- **User Side Panel**: Clicking a user row opens a slide-in side panel showing full profile (from `profiles` collection) and creator profile (from `creators` collection) if exists
- **User Pagination**: Replaced `onSnapshot` with `getDocs` + `startAfter` cursor-based pagination (25 per page)
- **Phone Number Display**: Added `phoneNumber` field to `UserProfile` interface and displayed in side panel
- **Log Detail Panel**: Added slide-in side panel to `AdminLogsPage` showing full log entry details on click
- **Transaction Breakdown**: Added time-filtered (Day/Week/Month/Annual) transaction breakdown table by type (Support, Store, Booking, Gathering) and status (Successful/Failed/Pending) with totals row to admin dashboard

### Bug Fixes (May 2025)
- **Store Checkout**: Fixed creator ID mismatch - now uses `creatorHandle` (username) for `creatorId` field and `creatorUid` for `creatorUid` field when processing store orders
- **Payment Transaction**: Fixed transaction lookup by ensuring proper reference matching in IPN handler

### Content Formatting, Gift Once & Media Enhancements (June 2026)
- **Whitespace preservation**: Added `whitespace-pre-wrap` to comment text, reply text, and gathering description elements across supporter and public pages so newlines and spaces render correctly in non-HTML content
- **Gift Once button**: Added "Gift Once" quick support button to gathering detail page and community post detail page, matching the pattern on other public subpages
- **Post detail page alignment**: Public `PostDetailPage` now shows creator avatar, name, and handle at the top; image uses `object-contain`; video uses `aspect-video` with `controlsList="nodownload"`; document viewer added with page navigation — matching `/supporter` layout
- **Media enhancements on community pages & post detail**: YouTube links in any post type now show embedded preview (not just video-type); images are click-to-zoom with full-screen lightbox; videos are playable inline with `controlsList="nodownload"`; documents open in Google Docs viewer via "Read Document" button with modal overlay and per-post page pagination
- **Supporter View nav link**: Added explicit `/supporter` link to navbar dropdown; dropdown closes on outside click via mousedown listener
- **Support Modal mobile optimization**: `SupportModal` redesigned with responsive spacing, font sizes, and padding; slides up as bottom sheet on mobile (`items-end`), scrolls when content overflows (`max-h-[90vh] overflow-y-auto`), with `rounded-t-2xl` corners; slide-up entrance (`slide-in-from-bottom-full`) and slide-down exit (`slide-out-to-bottom-full`) animations added, with `zoom-in/out-95` on desktop
- Files updated: `SupporterSpace.tsx`, `SupporterPostDetail.tsx`, `PostDetailPage.tsx`, `ContentPage.tsx`, `CommunityTab.tsx`, `GatheringDetailPage.tsx`, `Navigation.tsx`, `SupportModal.tsx`

### Verification & Payouts Fix (June 2026)
- **Payouts Destination Display**: Changed from showing `payoutNumber` to showing the payout type (`Bank Account`, `Mobile Money`, `Airtel Money`) from the creator's `verificationRequests` submission, including account name and number. Shows "Not Verified" when not verified.
- **Admin Verification Approval**: Admin approve/reject now updates the corresponding `verificationRequests` document's `status` to `"approved"` or `"rejected"` alongside the existing `creators` doc update.
- **Supporter Following List Fixed**: The supporter sidebar "Following" list was empty because `supportedCreators` stores handles while content uses UIDs. Now properly maps handles → UIDs when building the following list and content filters.
- **Gathering Email Routes**: All three gathering email routes (`checkin`, `declined`, `undo`) now use the shared `transporter` from `@/lib/emailTransporter` instead of defining their own local transporter.
- **Gathering Attendance Lookup**: Changed attendance queries from `where("supporterId", ...)` to `where("gatheringId", ...)` with local filtering, fixing page refresh issues where paid tickets weren't detected after reload.

### Data Model Unification & Views Fix (May 2026)
- **Views Not Incrementing Fix**: Supporter feed (`/supporter`) IntersectionObserver filtered posts by `f.type === "content"`, excluding types like "image", "video", "document". Changed to `f.type !== "gathering"` — all content types now count views.
- **Observer Optimization**: Replaced `seenPosts` state with `useRef` to prevent re-render loops where every view disconnected/reconnected the observer. Local feed state now updates immediately when a view is counted.
- **Comment/Like Data Model Unification**: Supporter pages now use subcollections (`creatorContent/{postId}/comments`, `creatorContent/{postId}/likes`) matching public/community pages, instead of separate top-level collections (`postComments`, `postLikes`). Comments and likes are now visible across all pages (supporter feed, supporter post detail, public profile, community page).
- **Removed Inefficient Global Comment Query**: `getDocs(collection(db, "postComments"))` previously fetched every comment in the app to tally per-post counts. Replaced with a denormalized `commentCount` field on each `creatorContent` doc, updated atomically via Firestore `increment()`.
- **Real-Time Comments & Likes**: Supporter post detail page (`/supporter/[postId]`) now uses `onSnapshot` for both comments and likes (was one-time `getDocs`), matching the public `PostDetailPage` pattern. Like counts update in real-time when others interact.
- **Tailwind CSS v4 Theme Variables**: Added `card`, `card-hover`, `border`, `border-strong`, `muted`, `muted-foreground` CSS variables to `globals.css` for consistent component theming.
- **Gift Once Button on Booking Page**: Added "Gift Once" quick support button and `SupportModal` to the booking page (`/[username]/booking`), matching the pattern on other public subpages.

### Dark Mode Theme-ification (May 2026)
- **Replaced hardcoded colors with CSS variable theme classes across 40+ files**: All page backgrounds (`bg-[#FBFBFC]`/`bg-[#F9FAFB]`/`bg-white`), text colors (`text-gray-*`/`text-slate-*`), borders (`border-gray-*`/`border-slate-*`), and surface backgrounds (`bg-gray-*`/`bg-slate-*`) replaced with theme-aware classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-muted`, `bg-foreground`).
- Dark mode now works across all pages: supporter dashboard, creator dashboard, admin dashboard, public profile pages, navigation, footer, modals, and UI components.
- Uses Tailwind v4's `@custom-variant dark` with class-based toggling via `next-themes` — `.dark` class on `<html>` switches all CSS variables to the dark palette.

### Booking System Enhancements (May 2026)
- **Paid Tiered Booking**: Creators can set paid tiers with prices and durations; bookers select a tier during booking and pay before the request is submitted
- **Server-Side Validation**: Booking API validates date range, day-of-week, time slot matching, and price verification against Firestore tiers
- **Conflict Detection**: Duration-aware overlap detection instead of exact string match for time slot conflicts
- **Reason Encryption**: Booking reasons encrypted at rest using AES-256-GCM with per-message random IV; decrypted client-side when viewing the dashboard
- **Encryption API**: Reusable `/api/encrypt` and `/api/decrypt` endpoints using AES-256-GCM with SHA-256 derived key from `ENCRYPTION_KEY` env var
- **Calendar Links**: Response email includes Google Calendar, Yahoo Calendar, and Apple/Outlook (.ics) download buttons
- **Meeting Location**: Location/link displayed in booking summary, confirmation email, and response email with type label
- **In-App Notifications**: Creator receives `booking_request` notification; booker (if logged in) receives notification and confirmation email on booking request
- **Payment Notifications**: Both IPN (card) and MoMo webhooks send `booking_paid` notification to buyer, confirmation email to booker, and `new_transaction` notification to all admin profiles
- **Robust Creator Lookup**: Profiles collection fallback resolves handle → uid → creator document, fixing null document ID mismatches

### Public Profile Architecture Refactor (June 2026)
- **Shared Layout**: Created `app/(public_profile)/layout.tsx` providing Navbar, Footer, and wrapper for all 11 public profile routes — eliminated per-page duplication
- **Subpage Refactor**: Removed individual Navbar/Footer/wrapper from `PublicProfile.tsx` and 10 subpage components (Community, Store, Messaging, Giveaways, Gatherings, Booking, PostDetail, ProductDetail, GiveawayDetail, GatheringDetail)
- **SEO Consolidation**: Deleted `SeoUpdater.tsx` (client-side DOM mutations that competed with server metadata); consolidated all JSON-LD schema into `CreatorSchma.tsx` (merged interactionStatistic, image, sameAs from the removed inline script)
- **Loading & Error Boundaries**: Added `loading.tsx` (Suspense fallback) and `error.tsx` (Error boundary) to the route group
- **ISR Configuration**: Added `export const revalidate = 300` (5 min) to all 11 route pages; 3600 (1h) for messaging (`noindex`)
- **View Count Dedup**: Session-storage + `useRef` guard prevents incrementing Firestore view counter on repeated navigations within the same session

### Firestore Security Rules (June 2026)
- **Comprehensive Rules**: Generated complete Firestore security rules covering all 25 collections with helper functions (`isAuth`, `isAdmin`, `isCreator`, `isOwner`, `isSupporterOf`), role-based access (admin/creator/user), and server-side-only collections
- **Documentation**: Full rules with architecture notes, limitations (auto-generated doc IDs in `supportedCreators`), and migration guidance written to `rules.txt`
- **Syntax Fixes**: Fixed `rules_version` quoting and path variable concatenation in rule functions

### App Check Integration (June 2026)
- **Client-Side App Check**: Added `initializeAppCheck` with `ReCaptchaV3Provider` to `db/firebase.ts`, gated behind `typeof window !== "undefined"` for Next.js SSR safety
- **Configuration**: Added `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to `.env.example`; requires registering a reCAPTCHA v3 site key in Firebase Console under App Check

### Admin Dashboard Stats Fix (June 2026)
- **Admin Read Overrides**: Fixed 4 collections in Firestore security rules (`rules.txt`) that blocked the admin dashboard (`/admin`) from reading stats, causing all values to show 0 with "Missing or insufficient permissions":
  - `platformIncome`: Changed from `allow read, write: if false` to `allow read: if isAdmin(request.auth.uid)`
  - `supportedCreators`: Added `isAdmin(request.auth.uid)` override so admin can read all support relationships
  - `storeProducts`: Added `isAdmin(request.auth.uid)` override so admin sees both active and inactive products
  - `giveaways`: Added `isAdmin(request.auth.uid)` override so admin sees draft giveaways too

### Changelog Page Permission Fix (June 2026)
- **Added `changelog` collection rule**: The `changelog` collection had no matching security rule, so Firestore's default deny rejected all reads. Added public read (`allow read: if true`) and admin-only write rules.

### User Feedback Collection Rules (June 2026)
- **Added `userFeedback` collection rule**: Admin-only read (`allow read: if isAdmin()`), any authenticated user can submit (`allow create: if isAuth()`) via the FeedbackFAB component. Fixes permission error on `/admin/feedback`.

### Supporter Feed Gatherings Separation (June 2026)
- **Separated gatherings from content feed**: Gatherings no longer mixed in with content posts on `/supporter`. Rendered in their own "Upcoming Events" section above the feed with distinct orange-accented cards showing date badge, time, location, attendee count, and ticket price. Clicking navigates to `/${creatorHandle}/gatherings/${gatheringId}`.

### Mobile Bottom Tab Bar (June 2026)
- **Sticky bottom tabs on mobile**: Public profile navigation tabs (`TabManager`) now stick to the bottom of the viewport on mobile (`fixed bottom-0`) with a top shadow and backdrop blur. Desktop behavior unchanged (sticky at top with bottom border). Active tab icon scales up on mobile for visual feedback.

### CreatorContent Security Rule Fix (June 2026)
- **Fixed creatorId vs uid mismatch**: The `creatorContent` collection stores `creatorId` as the creator's handle (username), but the Firestore rules compared it against `request.auth.uid` (Firebase UID). Changed create/update/delete rules to use `isCreator(creatorId)` which looks up the handle in the `creators` collection and verifies the owning UID matches the requesting user. Fixes permission-denied errors when creating or managing content in the creator dashboard.
- **Fixed isAdmin checks in 3 collections**: Changed `isAdmin(resource.data.uid/creatorId)` to `isAdmin(request.auth.uid)` in `creators`, `creatorGatherings`, and `storeProducts` rules. The old form checked if the *document owner* was an admin instead of checking if the *requesting user* was an admin.
