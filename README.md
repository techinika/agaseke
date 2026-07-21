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
  - **Dual-currency pricing**: Products can be priced in RWF or USD via currency toggle; `priceUSD` field for USD prices, `formatCurrency` for locale-aware display throughout the store
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
- **Community Subscriptions** (/creator/community):
  - Up to 2 membership tiers (monthly/yearly)
  - Custom benefits per tier
  - Public membership display on community page
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
- **Community Membership**: Subscribe to creator membership tiers with recurring payments (monthly/yearly) via Momo or card
- **Support**: Quick one-time support button available on all profile subpages
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
- **Storage**: Cloudinary (images, videos, files), Cloudflare R2 (asset uploads)
- **File Uploads**: Cloudflare Worker (`workers/upload/`) ΓÇö Firebase JWT auth, R2 storage, Firestore metadata
- **Payments**: Cloudflare Worker (`workers/payments/`) ΓÇö PesaPal (Card), Paypack (Mobile Money)
- **Bookings**: Cloudflare Worker (`workers/bookings/`) ΓÇö Booking lifecycle, payment callbacks, Firestore
- **Store**: Cloudflare Worker (`workers/store/`) ΓÇö Store callbacks, digital download authorization
- **Support**: Cloudflare Worker (`workers/support/`) ΓÇö Support payment callbacks, status queries
- **Email**: Cloudflare Worker (`workers/comms/`) ΓÇö Resend batch API, 19 email purposes, unified template
- **Community Subscriptions**: Cloudflare Worker (`workers/community/`) ΓÇö Firebase REST auth, tier management, subscription lifecycle, auto-renewals
- **General Utility**: Cloudflare Worker (`workers/general/`) ΓÇö Encryption/decryption, error logging, notifications, rate-limited endpoints

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
Γö£ΓöÇΓöÇ app/
Γöé   Γö£ΓöÇΓöÇ (auth)/                  # Login, signup pages
Γöé   Γö£ΓöÇΓöÇ (dashboards)/            # Creator dashboard routes
Γöé   Γöé   ΓööΓöÇΓöÇ creator/
Γöé   Γöé       Γö£ΓöÇΓöÇ content/         # Content management
Γöé   Γöé       Γö£ΓöÇΓöÇ gatherings/       # Events management
Γöé   Γöé       Γö£ΓöÇΓöÇ messages/        # Messaging inbox
Γöé   Γöé       Γö£ΓöÇΓöÇ payouts/          # Earnings & payouts
Γöé   Γöé       Γö£ΓöÇΓöÇ settings/         # Creator settings
Γöé   Γöé       Γö£ΓöÇΓöÇ store/            # Store management
Γöé   Γöé       Γö£ΓöÇΓöÇ sales/            # Sales tracking & analytics
Γöé   Γöé       Γö£ΓöÇΓöÇ supporters/       # Supporters & broadcast email
Γöé   Γöé       Γö£ΓöÇΓöÇ partners/         # Partner management
Γöé   Γöé       Γö£ΓöÇΓöÇ giveaways/        # Giveaway management
Γöé   Γöé       ΓööΓöÇΓöÇ verify/           # Identity verification
Γöé   Γö£ΓöÇΓöÇ [username]/               # Public creator profiles
Γöé   Γöé   Γö£ΓöÇΓöÇ community/             # Full community page
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ [postId]/          # Individual post detail with comments/likes
Γöé   Γöé   Γö£ΓöÇΓöÇ gatherings/            # Full gatherings page
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ [gatheringId]/     # Individual event detail
Γöé   Γöé   Γö£ΓöÇΓöÇ store/                 # Full store page
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ [productId]/       # Individual product detail
Γöé   Γöé   Γö£ΓöÇΓöÇ giveaways/             # Full giveaways page
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ [giveawayId]/      # Individual giveaway detail
Γöé   Γöé   Γö£ΓöÇΓöÇ booking/               # Book a meeting page
Γöé   Γöé   ΓööΓöÇΓöÇ messaging/             # Full messaging page
Γöé   ΓööΓöÇΓöÇ api/
Γöé       Γö£ΓöÇΓöÇ comms/email/          # Email notification APIs
Γöé       Γö£ΓöÇΓöÇ support/              # Payment APIs
Γöé       ΓööΓöÇΓöÇ upload/               # File upload APIs
Γö£ΓöÇΓöÇ components/
Γöé   Γö£ΓöÇΓöÇ pages/
Γöé   Γöé   Γö£ΓöÇΓöÇ Dashboards/          # Dashboard components
Γöé   Γöé   ΓööΓöÇΓöÇ PublicProfile.tsx     # Public profile page
Γöé   Γö£ΓöÇΓöÇ parts/
Γöé   Γöé   Γö£ΓöÇΓöÇ dashboard/           # Dashboard UI parts
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ gatherings/      # Gathering sub-components (ListPanel, DetailPanel, CheckInModal)
Γöé   Γöé   ΓööΓöÇΓöÇ public/              # Public profile parts
Γöé   Γöé       Γö£ΓöÇΓöÇ CommunityTab.tsx  # Content display
Γöé   Γöé       Γö£ΓöÇΓöÇ MessageTab.tsx    # Messaging UI
Γöé   Γöé       ΓööΓöÇΓöÇ StoreTab.tsx      # Store UI
Γöé   ΓööΓöÇΓöÇ ui/                      # Shared UI components
Γö£ΓöÇΓöÇ auth/                         # Authentication context
Γö£ΓöÇΓöÇ db/                           # Firebase config
Γö£ΓöÇΓöÇ types/                        # TypeScript types
Γöé   Γö£ΓöÇΓöÇ creator.ts               # Creator interface
Γöé   Γö£ΓöÇΓöÇ messaging.ts              # Messaging types
Γöé   Γö£ΓöÇΓöÇ store.ts                 # Store types
Γöé   Γö£ΓöÇΓöÇ giveaway.ts               # Giveaway types
Γöé   ΓööΓöÇΓöÇ booking.ts                # Booking types
Γö£ΓöÇΓöÇ workers/                       # Cloudflare Workers
Γöé   Γö£ΓöÇΓöÇ upload/                   # File upload Worker (R2 + Firestore)
Γöé   Γö£ΓöÇΓöÇ comms/                    # Email comms Worker (Resend, 19 purposes, webhook)
Γöé   Γö£ΓöÇΓöÇ payments/                 # Payments Worker (Momo + Card with Paypack/PesaPal)
Γöé   Γö£ΓöÇΓöÇ bookings/                 # Bookings Worker (create, respond, callback, availability)
Γöé   Γö£ΓöÇΓöÇ store/                    # Store Worker (callbacks, digital downloads, status)
Γöé   Γö£ΓöÇΓöÇ support/                  # Support Worker (payment callbacks, status)
Γöé   Γö£ΓöÇΓöÇ community/                # Community subscriptions Worker (tiers, subscriptions, renewals)
Γöé   ΓööΓöÇΓöÇ general/                  # General utility Worker (encryption, error logging, notifications)
ΓööΓöÇΓöÇ public/                      # Static assets
```

## Firestore Collections

### Core Collections

| Collection | Description |
|------------|-------------|
| `creators` | Creator profiles with settings |
| `profiles` | User profile data |
| `supportedCreators` | Support transactions (creatorId, amount, supporterId) |
| `activityLogs` | Platform activity logs for admin monitoring |
| `sentEmails` | Archive of all transactional emails sent via comms Worker |
| `emailEvents` | Resend webhook events (bounces, deliveries, opens, clicks) |

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
  price: number;                   // RWF amount (always set)
  priceUSD?: number;               // USD amount (when currency === "USD")
  currency?: "RWF" | "USD";        // Pricing currency (defaults to RWF)
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
- `POST <NEXT_PUBLIC_UPLOAD_WORKER_URL>` - Upload Worker (Firebase JWT auth ΓåÆ R2 ΓåÆ Firestore)
- `POST /api/upload/content/image` - Image upload (legacy)
- `POST /api/upload/content/video` - Video upload (legacy)
- `POST /api/upload/content/docs` - Document upload (legacy)
- `POST /api/upload/picture` - Profile picture (legacy)

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

### Dual-Currency Store Pricing (July 2026)
- **Product interface extended**: Added `currency?: "RWF" | "USD"` and `priceUSD?: number` to both `types/store.ts` and `components/parts/public/store/types.ts`.
- **Currency selector in ProductModal**: New RWF/USD toggle on create/edit form; when USD is selected, shows both `priceUSD` (primary) and `price` (RWF equivalent) inputs.
- **Helper functions**: `getProductCurrency(product)` returns the product's currency (defaulting to RWF), `getProductPrice(product)` returns the correct price field based on currency.
- **Format all price displays**: Replaced every hardcoded `"RWF"` string with `formatCurrency(getProductPrice(p), getProductCurrency(p))` across 17 display components — ProductCard, ProductDetailModal, ProductDetailPage, CartModal, CheckoutModal, FolderCard, FolderExplorer, OrderTrackingModal, MyPurchasesModal, ProductsList, OrdersList, CreateOrderModal, FolderModal, FoldersList, CouponModal.
- **Cart/checkout currency-aware**: `getItemPrice`/`getCartTotal` use `getProductPrice`; payment data sent to workers includes `currency` field; `CartModal`, `CheckoutModal`, and `FolderExplorer` accept a `currency` prop for formatted display.

### Homepage Renovation & Currency Fixes (July 2026)
- **Hero redesigned**: Problem-first narrative ΓÇö "You're Working Hard. But the Money Isn't Coming." banner, followed by pain points (no Mobile Money support on global platforms, scattered tools, brands ignore small creators) and a "That changes now" pivot. Left column (3/5) has the copy + claim handle CTA + payment methods, right column (2/5) has fanned creator cards.
- **Pan-African positioning**: Removed all Rwanda-only references from homepage, layout metadata, footer, and FAQ structured data. Open to everyone, especially African creators.
- **Currency-configurable payout threshold**: `AdminCurrenciesPage.tsx` now stores a `payoutThreshold` per currency. `PayoutPolicyPage.tsx` and `PayoutsPage.tsx` read dynamically from Firestore.
- **Featured creator cards**: Fetch real data from Firestore (`creators` collection, order by name, limit 3). Cards match `PublicProfile` SendGiftSection style: 64px avatar, green verified badge, handle, bio (line-clamp-2), focus tags, social dot-badges (IG/≡¥òÅ/YT/TK). No earnings or fan counts shown.
- **Rotated diamond background**: Orange-tinted square behind the card stack (`w-[500px] h-[500px] bg-orange-500/[0.07] rotate-45`).
- **PaymentCallback fix**: 3 hardcoded "RWF" ΓåÆ `{txData?.amount} {txData?.currency || "RWF"}`, imported `formatCurrency`.
- **SupportersPage currency tracking**: Added `currency` to `SupporterSupport` & `AggregatedSupporter` interfaces; totals show `creatorCurrency`, per-supporter amounts show `supporter.currency`, filter labels use `creatorCurrency`.
- **SalesPage product totals fix**: Product aggregation now tracks per-sale currencies (`currencies` map) and displays the predominant one via `product.primaryCurrency` instead of hardcoded `getCurrencySymbol("RWF")`.
- **SupporterSpace purchase currency**: Purchase items now show `{purchase.currency || "RWF"}` instead of hardcoded RWF.
- **AdminPage withdrawal currency**: Added `currency` field to `withdrawRequests` on creation. Admin withdrawal displays (approval/rejection messages, withdrawal list) use `{req.currency || "RWF"}` instead of hardcoded RWF.
- **Supporter page content creation form**: Inline social-media-style composer with textarea, always-visible Image/Video/Document attachment buttons, public/supporters-only toggle, and Post button. Posts to `creatorContent` collection with email notification to supporters.
- **Upload progress & preview**: Uploading files now shows a spinner with "Uploading..." status. Images show a preview thumbnail; videos show an inline player with controls; documents show a "File attached" badge. A Trash2 button lets users remove the uploaded file. Accept filter set imperatively per button (image/video/document) so the correct file types are shown in the OS picker.
- **Posts appear in feed immediately**: After posting from `/supporter`, the new post is prepended to the local feed state ΓÇö no page refresh needed.
- **No title on /supporter posts**: Posts created from the inline composer don't save a `title` field. Titles are hidden in the feed when absent.
- **Past events filtering**: Events on `/supporter` with dates before end of today (`eventDate >= endOfToday`) are hidden ΓÇö only upcoming events appear in the "Upcoming Events" section.
- **MobileBottomBar enlarged**: Icons 14ΓåÆ18px, labels text-[8px]ΓåÆtext-[10px] font-medium, padding py-1.5ΓåÆpy-2.
- **Desktop creator button prominent**: Orange background, shadow-lg shadow-orange-200, label "Creator Dashboard" or "Become Creator".

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
- **Product Detail Pages**: `/[username]/store/[productId]` ΓÇö Full product view instead of modal, with add-to-cart, size selection, bulk pricing
- **Post Detail Pages**: `/[username]/community/[postId]` ΓÇö Full post view with comments and likes system
- **Giveaway Detail Pages**: `/[username]/giveaways/[giveawayId]` ΓÇö Full giveaway view with enter, share, and winner viewing
- **Event Detail Pages**: `/[username]/gatherings/[gatheringId]` ΓÇö Full event view with RSVP, capacity, and location info
- **Booking Page**: `/[username]/booking` ΓÇö Standalone booking page instead of modal, with calendar picker, time slots, and meeting type selection
- **Comments & Likes**: Added real-time comments and likes to community posts (Firestore subcollections)
- **Progressive Web App**: Added manifest.json, service worker with cache-first strategy for static assets, and install prompts

### Performance & SEO Improvements (May 2026)
- **Server-Side JSON-LD**: Schema components (`HomeSchema`, `ExploreSchema`, `CreatorSchema`) migrated from client-side `document.createElement` to server-rendered `<script>` tags ΓÇö structured data now visible to all crawlers
- **Full SEO Metadata Coverage**: Added `openGraph` + `twitter:card` metadata to 13 previously-missing pages (changelog, help-center, payout-policy, profile, login, onboarding, dashboard index pages)
- **Twitter Cards on Detail Pages**: Added twitter metadata to all 5 detail page types (`[postId]`, `[productId]`, `[giveawayId]`, `[gatheringId]`, `booking`)
- **Home Page Metadata**: Added explicit `export const metadata` to root landing page with OG/Twitter tags
- **Server Components**: Converted legal pages (`TermsPage`), `loading.tsx`, and all SEO schema components from client to server components ΓÇö reducing JS bundle
- **Dynamic Imports**: Code-split heavy libraries ΓÇö `framer-motion` on error/404 pages, `qrcode.react` on share page, `canvas-confetti` loaded lazily
- **Memoized Handlers**: Added `useCallback` to 11 event handlers in `PostDetailPage` and `StoreTab` to prevent unnecessary re-renders
- **Async Memo Fix**: Replaced async `useMemo` anti-pattern (returning Promises) with proper `useEffect` + `Promise.all` in `SupportersPage`
- **Heading Hierarchy**: Added missing `<h1>` to 4 dashboard pages; fixed `<h1>`ΓåÆ`<h3>` jump in `NoticesPage`
- **Alt Text**: Fixed 9 empty `alt=""` attributes on profile/content images across the platform
- **Sitemap Partitioning**: Split sitemap into 6 category files via `generateSitemaps` (static, creators, products, posts, giveaways, gatherings) ΓÇö all links preserved, under 50K per file
- **Noindex on Dashboards**: Added `robots: noindex` to 21 dashboard/admin sub-pages to prevent private routes from appearing in search results
- **Sitemap Coverage**: Added `/changelog` to sitemap static pages
- **Admin Description Fix**: Corrected copy-paste error on admin dashboard metadata
- **Notification Icons**: Added missing `new_like` and `new_comment` icon entries in `NotificationDrawer`

### Gatherings & Event Perfection (May 2026)
- **Description Field**: Added `description` textarea to gathering create/edit form on creator dashboard; displayed on gathering cards
- **Paid Gatherings**: `ticketPrice` field in create/edit form ΓÇö paid gatherings visible to everyone, payment flows through existing Momo/Card pay routes with `type: "gathering"`; webhooks/IPNs create `gatheringsAttendance` with `paid: true` on confirmation
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

### Content Formatting, Support Button & Media Enhancements (June 2026)
- **Whitespace preservation**: Added `whitespace-pre-wrap` to comment text, reply text, and gathering description elements across supporter and public pages so newlines and spaces render correctly in non-HTML content
- **Support button**: Added quick support button to gathering detail page and community post detail page, matching the pattern on other public subpages
- **Post detail page alignment**: Public `PostDetailPage` now shows creator avatar, name, and handle at the top; image uses `object-contain`; video uses `aspect-video` with `controlsList="nodownload"`; document viewer added with page navigation ΓÇö matching `/supporter` layout
- **Media enhancements on community pages & post detail**: YouTube links in any post type now show embedded preview (not just video-type); images are click-to-zoom with full-screen lightbox; videos are playable inline with `controlsList="nodownload"`; documents open in Google Docs viewer via "Read Document" button with modal overlay and per-post page pagination
- **Supporter View nav link**: Added explicit `/supporter` link to navbar dropdown; dropdown closes on outside click via mousedown listener
- **Support Modal mobile optimization**: `SupportModal` redesigned with responsive spacing, font sizes, and padding; slides up as bottom sheet on mobile (`items-end`), scrolls when content overflows (`max-h-[90vh] overflow-y-auto`), with `rounded-t-2xl` corners; slide-up entrance (`slide-in-from-bottom-full`) and slide-down exit (`slide-out-to-bottom-full`) animations added, with `zoom-in/out-95` on desktop
- Files updated: `SupporterSpace.tsx`, `SupporterPostDetail.tsx`, `PostDetailPage.tsx`, `ContentPage.tsx`, `CommunityTab.tsx`, `GatheringDetailPage.tsx`, `Navigation.tsx`, `SupportModal.tsx`

### Verification & Payouts Fix (June 2026)
- **Payouts Destination Display**: Changed from showing `payoutNumber` to showing the payout type (`Bank Account`, `Mobile Money`, `Airtel Money`) from the creator's `verificationRequests` submission, including account name and number. Shows "Not Verified" when not verified.
- **Admin Verification Approval**: Admin approve/reject now updates the corresponding `verificationRequests` document's `status` to `"approved"` or `"rejected"` alongside the existing `creators` doc update.
- **Supporter Following List Fixed**: The supporter sidebar "Following" list was empty because `supportedCreators` stores handles while content uses UIDs. Now properly maps handles ΓåÆ UIDs when building the following list and content filters.
- **Gathering Email Routes**: All three gathering email routes (`checkin`, `declined`, `undo`) now use the shared `transporter` from `@/lib/emailTransporter` instead of defining their own local transporter.
- **Gathering Attendance Lookup**: Changed attendance queries from `where("supporterId", ...)` to `where("gatheringId", ...)` with local filtering, fixing page refresh issues where paid tickets weren't detected after reload.

### Data Model Unification & Views Fix (May 2026)
- **Views Not Incrementing Fix**: Supporter feed (`/supporter`) IntersectionObserver filtered posts by `f.type === "content"`, excluding types like "image", "video", "document". Changed to `f.type !== "gathering"` ΓÇö all content types now count views.
- **Observer Optimization**: Replaced `seenPosts` state with `useRef` to prevent re-render loops where every view disconnected/reconnected the observer. Local feed state now updates immediately when a view is counted.
- **Comment/Like Data Model Unification**: Supporter pages now use subcollections (`creatorContent/{postId}/comments`, `creatorContent/{postId}/likes`) matching public/community pages, instead of separate top-level collections (`postComments`, `postLikes`). Comments and likes are now visible across all pages (supporter feed, supporter post detail, public profile, community page).
- **Removed Inefficient Global Comment Query**: `getDocs(collection(db, "postComments"))` previously fetched every comment in the app to tally per-post counts. Replaced with a denormalized `commentCount` field on each `creatorContent` doc, updated atomically via Firestore `increment()`.
- **Real-Time Comments & Likes**: Supporter post detail page (`/supporter/[postId]`) now uses `onSnapshot` for both comments and likes (was one-time `getDocs`), matching the public `PostDetailPage` pattern. Like counts update in real-time when others interact.
- **Tailwind CSS v4 Theme Variables**: Added `card`, `card-hover`, `border`, `border-strong`, `muted`, `muted-foreground` CSS variables to `globals.css` for consistent component theming.
- **Support Button on Booking Page**: Added quick support button and `SupportModal` to the booking page (`/[username]/booking`), matching the pattern on other public subpages.

### Dark Mode Theme-ification (May 2026)
- **Replaced hardcoded colors with CSS variable theme classes across 40+ files**: All page backgrounds (`bg-[#FBFBFC]`/`bg-[#F9FAFB]`/`bg-white`), text colors (`text-gray-*`/`text-slate-*`), borders (`border-gray-*`/`border-slate-*`), and surface backgrounds (`bg-gray-*`/`bg-slate-*`) replaced with theme-aware classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-muted`, `bg-foreground`).
- Dark mode now works across all pages: supporter dashboard, creator dashboard, admin dashboard, public profile pages, navigation, footer, modals, and UI components.
- Uses Tailwind v4's `@custom-variant dark` with class-based toggling via `next-themes` ΓÇö `.dark` class on `<html>` switches all CSS variables to the dark palette.

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
- **Robust Creator Lookup**: Profiles collection fallback resolves handle ΓåÆ uid ΓåÆ creator document, fixing null document ID mismatches

### Public Profile Architecture Refactor (June 2026)
- **Shared Layout**: Created `app/(public_profile)/layout.tsx` providing Navbar, Footer, and wrapper for all 11 public profile routes ΓÇö eliminated per-page duplication
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

### Condensed Creator Sidebar (June 2026)
- **Grouped sidebar menu**: Condensed the creator dashboard sidebar from 14 flat items into 6 compact groups with expandable sub-menus. Groups: Overview (standalone), Content (Posts, Notices), Commerce (Store, Sales), Community (Events, Bookings, Giveaways, Messages, Supporters), Partners (standalone), Account (Verify, Payouts, Settings). Sub-items that are disabled in creator settings are conditionally hidden.
- **Payouts moved to Account**: Moved `/creator/payouts` from the Commerce group to the Account group (Verify, Payouts, Settings) for clearer logical grouping ΓÇö payouts are account-level, not store-specific.

### Predictable SupportedCreators Doc IDs (June 2026)
- **Migrated to predictable doc IDs**: Changed `handleSupportPayment.ts` to use `{supporterId}_{creatorHandle}` as document IDs in `supportedCreators` instead of auto-generated IDs. Anonymous supporters still use auto-generated IDs (not applicable for `isSupporterOf` checks).
- **Enforced supporter-only private content reads**: The `creatorContent` Firestore rule now restricts private content reads to the creator and their supporters via `isSupporterOf(creatorId)`. Public content remains readable by any authenticated user.
- **Allowed non-creator counter updates**: Non-creator users can now increment `views`, `commentCount`, and `stats.likes` on `creatorContent` documents (via `affectedKeys().hasOnly()` rule). This ensures like/comment/view counts update correctly when supporters interact with content.
- **Reinstated `await` on `updateDoc`**: Removed fire-and-forget `.catch(() => {})` patterns from `SupporterSpace.tsx` and `SupporterPostDetail.tsx` for comment and like counter updates. Now properly awaited with error propagation. View count tracking remains fire-and-forget (background noise in observer callbacks).

### Payouts Moved to Account Group (June 2026)
- **Moved /creator/payouts**: Relocated the Payouts link from the Commerce sidebar group to the Account group (now: Verify, Payouts, Settings). Payouts are account-level, not store-specific.

### NoticesPage Encoding Fix (June 2026)
- **Fixed unicode character encoding**: Replaced garbled close button icon in `NoticesPage.tsx` with a standard bullet character.

### Admin Verification Requests Fix (June 2026)
- **Fixed wrong collection query**: Admin page was querying `creators` collection (`verified == false && verificationStatus == "pending"`) but the verify page writes to `verificationRequests` collection. Changed to query `verificationRequests` where `status == "pending"` and enrich with creator profile data (name, handle, profilePicture) via a uid-based lookup. Also fixed approve/reject handler to reference the creator doc by `handle` instead of `target.id` (now the request doc ID).

### Dual-ID Supporter Check (June 2026)
- **Added `supporterUids` map to creator docs**: Each creator doc now has a `supporterUids` map (`{ uid: true }`) that tracks unique supporter UIDs. Set server-side in `handleSupportPayment.ts` during support transactions.

### Comms Worker ΓÇö Cloudflare Native Email (July 2026)
- **New Cloudflare Worker** (`workers/comms/`): Replaces all Nodemailer/SMTP-based email routes with Cloudflare's native `env.EMAIL.send()` binding. Zero SMTP config, zero API keys, automatic SPF/DKIM/DMARC via Cloudflare DNS.
- **Single unified template**: `renderEmailHtml()` builds a responsive HTML email from per-service template data (header color, title, body, CTA, footer). Each service only provides data, not markup.
- **18 email services** covering all transactional email purposes: welcome, profile live, booking request/response, gathering created/RSVP/checkin/declined/undo, message new/digest, store order/status, support received, payout processed, content new, verification request/feedback, broadcast.
- **Firebase JWT auth**: Reuses the same `jose` + JWKS pattern as the upload Worker.
- **Firestore helpers**: `fetchSupporters()` and `fetchCreatorEmail()` fetch recipient emails from Firestore using the service account OAuth flow (cached 1-hour tokens).

### Workers Auth & CORS Standardization (July 2026)
- **All 7 workers now use dual-path auth**: Jose JWKS verification first (correct `service_accounts/v1/jwk/` endpoint), Firebase REST API as fallback. Previously all workers used Firebase REST only, and the upload worker had a broken X.509 certificate URL instead of the correct JWKS endpoint.
- **CORS extracted to shared `cors.ts`**: Removed duplicate inline CORS functions from all 6 workers. Single `cors.ts` per worker with `X-Firebase-AppCheck` header support.
- **Auth order swapped**: Jose first (fast, local, no network), Firebase REST fallback — avoids unnecessary failing network call on every request.
- **Missing deps fixed**: `workers/comms/package.json` was missing `jose` and `@cloudflare/workers-types` dependencies (relied on hoisting).
- **`FIREBASE_PROJECT_ID` added**: Added to all `wrangler.jsonc` vars and `keep_vars: true` flag to preserve dashboard-configured variables across deployments.
- **Enhanced logging**: Token header (`kid`, `alg`) logged on every auth attempt; API key masked in logs.

### Upload Worker & Asset Type Migration (July 2026)
- **New Cloudflare Worker** (`workers/upload/`): Handles all file uploads ΓÇö Firebase JWT auth via `jose` + Google JWKS, stores in R2 bucket (`agaseke-assets`), records metadata in Firestore `assets` collection. No GET handler; files served directly from R2 via custom domain `assets.agaseke.me`.
- **9 asset types**: `creator_profile`, `creator_cover`, `post_image`, `post_video`, `post_document`, `product_thumbnail`, `product_content`, `partner_logo`, `verification_document` ΓÇö each with its own R2 path prefix and Firestore usage description.
- **Frontend upload service** (`lib/uploadService.ts`): `uploadFile()` (FormData) and `uploadBase64Image()` (JSON/base64) with typed `AssetType`, auto-attaches Firebase ID token as `Authorization: Bearer`.
- **ProductModal/FolderModal/PartnerModal updated**: All use the correct typed asset constants (`product_thumbnail`, `product_content`, `partner_logo`) instead of generic `post_image`.
- **SupporterSpace upload retry**: On upload failure, the file preview stays visible with a Retry button and a Trash button to discard. The failed file is retained in state so re-clicking Retry re-uploads without re-selecting.
- **Error logging**: All Worker catch blocks log errors with `console.error`, including JWT verification failures and request context (method + URL). Observability enabled in wrangler config.
- **Updated `isSupporterOf` rule**: The Firestore rule function now checks TWO sources ΓÇö the new predictable doc ID pattern `{uid}_{handle}` in `supportedCreators` AND the `supporterUids` map on the creator doc. This ensures backward compatibility with old auto-generated support records after running the backfill migration.
- **Added migration script**: `scripts/backfillSupporterUids.js` ΓÇö run once to populate `supporterUids` on all existing creator docs from current `supportedCreators` records.

### MobileBottomBar Component (June 2026)
- **Reusable sticky bottom bar**: Extracted the mobile bottom navigation into a reusable `MobileBottomBar` component (`components/parts/MobileBottomBar.tsx`). Appears on `/supporter`, `/explore`, and the homepage for all logged-in users on mobile screens. Hidden on `lg+` screens. Includes compact `size={14}` icons with `text-[8px]` labels.
- **Admin button**: Shows a Shield icon linking to `/admin` when the user has `isAdmin: true`.
- **Solid background**: Uses `bg-background` (opaque) instead of translucent backdrop blur to prevent overlap visibility issues.
- **Feedback modal inline**: Feedback form integrated directly into the component with Firestore submission, replacing the standalone `FeedbackFAB` floating button that overlapped other fixed elements.
- **Sticky right sidebar on /supporter**: Right sidebar made sticky on desktop (`sticky top-24`) so it stays in view while scrolling the feed.
- **Navbar spacing**: Reduced `pt-20` ΓåÆ `pt-12` on the content container to tighten the gap between the sticky navbar and page content.

### Simplified CreatorContent Read Rule (June 2026)
- **Removed `isCreator` and `isSupporterOf` from read rule**: After the initial split, even the `isCreator` check (which uses `get()`) caused Firestore query rejection. Simplified to a single conditional: `allow read: if isAuth() && !resource.data.isPrivate`. This rule has zero `get()` calls and is fully statically verifiable. Private content reads are now gated entirely by the client ΓÇö only supporters fetch private posts; any permission failure is caught gracefully.
- **Decoupled private content query in SupporterSpace**: Moved the private content query out of `Promise.all` into a separate try/catch block so a permission failure on the private query doesn't crash the entire supporter page load.

### Irreversible Country/Currency & Mobile Feedback Button (July 2026)
- **Country/Currency irreversible**: Added warnings on onboarding (`StartPage.tsx`) that country and currency cannot be changed once set. Made both fields read-only in `SettingsPage.tsx` once set, displaying the current value as muted text with an irreversible notice.
- **ActivityRow currency fix**: Changed `sup.currency || creatorCurrency` fallback to `sup.currency || "RWF"` so old pre-USD transactions don't get mislabeled when a creator switches currencies.
- **"gifted you" → "supported you"**: Renamed the remaining "gifted you" text in `ActivityRow.tsx` to "supported you".
- **Feedback button on mobile**: Removed `hidden md:block` from the feedback button in the dashboard header so it's visible on all screen sizes. Header is already sticky.

### Public Page Fixes & Button Rename (July 2026)
- **Support button rename**: Changed "Gift Once" button text to "Support {creatorFirstName}" across all public profile subpages.
- **Firestore composite index fix**: Removed `orderBy("createdAt")` from `creatorContent` queries in CommunityPage.tsx — now uses client-side sorting, eliminating the need for a composite index.
- **SupportModal NaN fix**: `NEXT_PUBLIC_CREATOR_SHARE` now falls back to `0.9` if unset, preventing `NaN` from being sent to `sendSupportEmail`. Replaced hardcoded `0.9` with the env var.
- **Optional chaining guards**: Added `?.` guards on `BookingPage.tsx` (`createBooking` response), `GiveawayDetailPage.tsx` (`giveaway.winners`), and `CommunityPage.tsx` (`creatorData.uid`) to prevent undefined crashes.
- **GatheringsTab stale closure fix**: Replaced closure-captured `paying`/`user` with refs in `listenForTransaction`, preventing payment timeout logic from using stale state.
- **Community Worker deps**: Added missing `jose` and `@cloudflare/workers-types` to `workers/community/package.json`.
- **ContentPage title crash fix**: `post.title.toLowerCase()` threw when posts had no title. Added optional fallback `(post.title || '')` before calling `.toLowerCase()`.
- **Community button on public profile**: Added "Join {name}'s Community" button below the support button on `SendGiftSection.tsx`, matching the booking button in size (`w-full mt-3 py-3 px-4`) with a distinct emerald color scheme (`bg-emerald-600 text-white`). Passes `communityEnabled` from the `PublicProfile` page to conditionally render when tiered community subscriptions are enabled. Links to `/{handle}/community` for subscription management.
- **Dual-currency community tier pricing**: Added `currency` and `priceUSD` fields to the `CommunityTier` interface across all type definitions (`types/community.ts`, `lib/communityService.ts`, `workers/community/src/types.ts`). Dashboard tier editor now has an RWF/USD currency toggle with conditional `priceUSD` input (and RWF equivalent field when USD is selected). Worker tiers service (`tiers.ts`) passes currency to Firestore on save and maps it on read. Worker subscriptions service (`subscriptions.ts`) uses tier currency in payment body instead of hardcoded `"RWF"`, and the subscription document stores the currency for renewal use. Public display uses `formatCurrency()` in `CommunityTab.tsx` and `SubscribeModal.tsx`. Members table in dashboard shows formatted currency via `formatCurrency()`.
- **Dual-currency booking tier pricing**: Added `currency` and `priceUSD` fields to `BookingTier` and `currency` to `BookingRequest`/`CreateBookingRequest`/`BookingDocument`. Dashboard tier editor (`BookingsPage.tsx`) has RWF/USD currency toggle with conditional `priceUSD` input and RWF equivalent field. Booking worker `create.ts` reads tier currency and passes it through to Firestore booking doc and SQS payment body. Public booking page (`BookingPage.tsx`) displays prices with `formatCurrency()` and sends currency in `createBooking` payload. PayClient displays amounts with `formatCurrency()` and passes `currency` in payment initiation payload.

### API Route Migration & General Worker (July 2026)
- **Removed old Next.js API routes**: `app/api/log-error/route.ts` and `app/api/comms/post/notification/route.ts` deleted. Replaced by general worker endpoints.
- **General worker endpoints**: `POST /api/general/log-error` (no auth, writes to Firestore `activityLogs`) and `POST /api/general/notification` (Firebase auth, creates in-app notifications).
- **All client callers updated** (7 components + ErrorContent) to call the general worker directly.
- **New env vars**: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` for Firestore OAuth2 token generation.

### Worker Security & Rate Limiting (July 2026)
- **Rate limiting added to all 8 workers**: IP-based sliding window rate limiter per endpoint. Limits: 10 req/min (payment/booking create) to 60 req/min (tier reads). 429 responses include `Retry-After` header.
- **Timing-safe comparisons**: SHA-256 + `crypto.subtle.timingSafeEqual` for X-Internal-Auth and webhook HMAC verification.
- **CORS fallback fix**: Workers echo origin instead of falling back to ALLOWED_ORIGINS[0].
- **Generic error messages**: All workers return `"Internal server error"` instead of leaking details.
- **Firestore query injection fix**: URL-encoded query parameters in comms worker.
- **Base64 upload validation**: Size check before decode, preventing OOM crashes.
- **Console.log removed** from auth.ts across all workers.
- **33 empty catch blocks filled** with console.error logging.

### Mixed-Currencies Awareness & Income Tracking (July 2026)
- **Smart currency toggle**: Currency picker (RWF/USD) in store products, gathering tickets, booking tiers, and community membership forms now only appears when the creator already has items in more than one currency. Single-currency creators see no toggle — reducing UI noise.
- **Default currency from profile**: All new items default to `creator.currency` (falls back to `"RWF"`) instead of hardcoding `"RWF"`.
- **Community subscription income tracking**: On successful payment, the community worker now writes `platformIncome` and `creatorIncome` records with proper platform/creator/referral splits, using the correct earnings field (`totalEarningsUSD` vs `totalEarnings`) based on the subscription's currency.
- **Admin leaderboard dual-currency**: Top earners now merge both RWF (`totalEarnings`) and USD (`totalEarningsUSD`) earnings with a combined sort, showing both amounts in the display.
- **Dynamic currency in notifications**: All backend worker notifications (`payments`, `bookings`, `support`) now use the transaction's actual currency in admin alert messages instead of hardcoded `"RWF"`.
- **Booking priceUSD verification**: Server-side booking validation uses `priceUSD` when the tier currency is USD, matching the frontend display.
- **Notification messages include currency**: Booking payment notifications for both creator and buyer now include the transaction currency. Email booking request templates show the amount with its currency suffix.

### Verification Email & Activity Logs Fix (July 2026)
- **Fixed "No recipients resolved" on verification feedback email**: Admin approval/rejection of KYC verification was failing with a 500 error because the profile lookup queried `where("username", "==", target.uid)`, but `username` is the creator handle (e.g. `gisa_patrick`), not the UID. Since profile document IDs are always the Firebase Auth UID, replaced the query with a direct `getDoc(doc(db, "profiles", target.uid))`.
- **Fixed "createdAt?.toDate is not a function" on activity logs page**: The admin logs page (`/admin/logs`) crashed when rendering logs written by Cloudflare Workers via REST API, which store timestamps differently than the Firebase client SDK. Added a `toDateSafe()` helper that handles Firestore `Timestamp` objects, ISO strings, raw `{seconds, nanoseconds}` objects, and native `Date` objects. Replaced all three bare `.toDate()` call sites (CSV export, log list, detail panel).

### Verification Requests Deduplication (July 2026)
- **Fixed stale/duplicate verification requests in admin dashboard**: The admin verification list was showing already-verified users and duplicate entries for the same user. Four causes fixed:
  - `AdminUsersPage.verifyUser()` was marking creators verified directly without updating their `verificationRequests` documents, leaving stale `pending` records. Now queries and approves all pending requests for that user.
  - `AdminPage.handleAction()` only updated `limit(1)` pending request per user, so if duplicates existed, older ones stayed `pending`. Now updates all pending requests for that user.
  - `VerifyPage.handleFinalSubmit()` used `addDoc` without checking for existing pending requests, allowing multiple submissions. Now queries for existing pending requests and rejects duplicates.
  - Admin page verification listener and `fetchData()` now deduplicate by `uid` client-side (keeping the most recent), so any existing DB cruft is hidden from the UI.

### Public Explore Posts Page (July 2026)
- **New `/explore/posts` page** for SEO: A dedicated discoverable page listing all public posts from every creator, with full SEO metadata (Open Graph, Twitter Cards, JSON-LD breadcrumbs, `CollectionPage` schema, hreflang).
- **Author attribution**: Each post card shows the creator's avatar, name, and handle linked to their profile — making the page valuable for creator discovery.
- **Cursor-based pagination**: Loads 10 posts at a time with a "Load More" button, matching the existing explore page pattern.
- **Full media support**: Renders images, videos, documents (with page navigation), YouTube embeds, and text content with "Read more" truncation — matching the community tab experience.
- **Client-side search**: Filter posts by title, content, or creator name/handle without additional Firestore queries.
- **Image lightbox & document viewer**: Click images to view full-screen; click documents to open in an overlay with Google Docs viewer.
- **Post detail page at `/explore/posts/[post-id]`**: Individual post view with dynamic server-side SEO metadata (OG, Twitter, article schema), creator attribution, full content rendering, like/comment system, and share button.
- **Navigation link**: Added "Posts" nav item in the desktop navigation bar next to "Explore" and "Help".
- **Links updated**: "View Post" and title links on the explore posts page now point to `/explore/posts/[id]` instead of creator community pages.

### SEO Improvements (July 2026)
- **Enhanced `/explore` (creators) metadata**: Richer title/description/OG tags with hreflang and country name; added `CollectionPage` JSON-LD structured data with organization publisher and about section.
- **Enhanced `/explore/posts` metadata**: Same improvements — richer metadata, hreflang, `CollectionPage` structured data.
- **ExplorePostDetailPage**: Server-side `generateMetadata` for dynamic OG images, article schema with author attribution, and per-post keywords.
- **Noindex on all private routes**: Added `robots: { index: false, follow: false }` to creator layout (covers all creator pages including client-component chat) and admin payouts page — ensuring no dashboard/auth page can be indexed.
- **Support button on public post detail**: Added support button (Heart icon) in the stats footer of `/explore/posts/[post-id]`, right-aligned next to views/comments. Opens `SupportModal` with pre-filled heartfelt message. Button is smaller on mobile (hidden text label).
- **SupportModal `defaultMessage` prop**: Added optional `defaultMessage` prop to pre-fill the heartfelt message textarea, used by the explore post detail page with `"I love this post! \"[title]\""`.
- **Login redirect on post comments**: "Log in to join the conversation" link now includes `?redirect=/explore/posts/[post-id]` so users return to the exact post after authentication.
- **Support button on supporter feed & community tab**: Added per-post support button (Heart icon) on `/supporter` feed (`SupporterSpace.tsx`) and public community profile tab (`CommunityTab.tsx`). Each post card footer now shows a support button that opens `SupportModal` with the post's creator info and default message.
- **Admin users CSV export**: Added "Download CSV" button on `/admin/users` that fetches all platform users and exports basic info (UID, email, display name, type, username, admin status, phone, support stats, timestamps) to a date-stamped CSV file.
