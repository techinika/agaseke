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
  - Set availability (days of week, time slots)
  - Configure meeting type (online, in-person, or both)
  - Location or video link settings
  - Automatic email notifications for booking responses
  - "Book a Meeting" button on public profiles (simple text button, shown when availability is set)
  - Clear availability to temporarily disable booking feature
- **Gatherings** (`/creator/gatherings`):
  - Enable/disable via Perks settings (hidden from sidebar when disabled)
  - Event creation with date, time, location
  - Edit and update existing events
  - Enable/disable individual events (disabled events not shown publicly)
  - RSVP capacity limits
  - Guest check-in with search
  - Email notifications for check-ins
  - Public profile shows Events tab when gatherings are enabled
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
- **Public Profile Subpages**: Full-page versions of each tab:
  - `/[username]/community` - All public posts and supporter-only content
  - `/[username]/store` - Browse products, track orders, view purchased items
  - `/[username]/gatherings` - Upcoming events and past gatherings
  - **Giveaways**: Enter giveaways and view winner announcements
  - `/[username]/giveaways` - Active and past giveaways with winners
  - `/[username]/messaging` - Direct message the creator
- **Support**: One-time payments via mobile money or card
- **Gift Once**: Quick support button available on all subpages
- **Winner Notification**: Congratulatory message when winning a giveaway

### Admin Dashboard (`/admin`)

- **Platform Overview**:
  - Real-time statistics (profiles, creators, income, views)
  - Product, giveaway, order, and support counts
  - Visitor tracking (today, week, month)
  - Recent activity feed
  - Top earners and most viewed creators
- **User Management** (`/admin/users`):
  - View all platform users
  - Filter by user type (creator, supporter)
  - Search by name or email
  - Make users admins or remove admin status (using `isAdmin` boolean field)
  - View user details and support history
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

# App
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
│   │       ├── supporters/       # Supporters & broadcast email
│   │       ├── partners/         # Partner management
│   │       ├── giveaways/        # Giveaway management
│   │       └── verify/           # Identity verification
│   ├── [username]/               # Public creator profiles
│   │   ├── community/             # Full community page
│   │   ├── gatherings/           # Full gatherings page
│   │   ├── store/                 # Full store page
│   │   ├── giveaways/             # Full giveaways page
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
  reason: string;
  preferredType: "online" | "physical" | "both";
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  responseNote?: string;
}

interface BookingAvailability {
  daysOfWeek: number[];           // 0=Sunday, 6=Saturday
  bookingType: "online" | "physical" | "both";
  startDate?: string;
  endDate?: string;
  defaultSlots: BookingTimeSlot[];
  location?: string;
  onlineLink?: string;
}

interface BookingTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
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
- `POST /api/comms/email/broadcast` - Broadcast email to supporters
- `POST /api/comms/email/payout/processed` - Payout processed notification
- `POST /api/comms/email/content/new` - Notify supporters of new content
- `POST /api/comms/email/booking/request` - Booking request notification to creator
- `POST /api/comms/email/booking/response` - Booking response notification to booker

### Bookings
- `POST /api/bookings` - Submit a booking request

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
