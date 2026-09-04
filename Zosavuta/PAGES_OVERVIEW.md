# Zosavuta - Pages Overview

Complete mapping of all pages, features, and components in Zosavuta.

## Public Pages (No Auth Required)

### 1. Homepage `/`
**File**: `app/page.tsx`  
**Type**: Public landing page  
**Features**:
- Hero section with call-to-action
- Feature highlights (4 cards):
  - Easy Ticketing
  - Find Events Nearby
  - Transport Included
  - Secure Payments
- Call-to-action section
- Footer with site navigation
- Responsive design

**Components Used**:
- Navigation
- Button (shadcn/ui)
- Card (shadcn/ui)
- FeatureCard (custom)
- Lucide Icons

---

### 2. Event Discovery `/events`
**File**: `app/events/page.tsx`  
**Type**: Public browsing page  
**Features**:
- Event grid (3 columns on desktop)
- Search bar for title/location
- Category filter dropdown
- Sort dropdown (upcoming, price)
- 6 demo events or Firestore data
- Event cards with hover effects
- Empty state handling
- Loading state with spinner

**Components Used**:
- Navigation
- Input (shadcn/ui)
- Select (shadcn/ui)
- EventCard
- Empty (shadcn/ui)
- Lucide Icons

**Demo Events**:
1. Afrobeats Music Festival - 3,500 KES
2. Tech Innovation Summit - 2,500 KES
3. Football Championship - 5,000 KES
4. Comedy Night - 2,000 KES
5. Web Development Workshop - 3,000 KES
6. Annual Food Festival - 1,500 KES

---

### 3. Event Details `/events/[id]`
**File**: `app/events/[id]/page.tsx`  
**Type**: Public detail page  
**Features**:
- Event image (large banner)
- Event title and key details
- Date, time, location display
- Tabbed content:
  - Overview (full description)
  - Details (tickets, features)
  - Terms (cancellation policy)
- Quantity selector (1-10)
- Bus transport option (+1,500 KES)
- Price breakdown
- Sticky booking sidebar
- Back to events link

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Tabs (shadcn/ui)
- Button (shadcn/ui)
- Lucide Icons

**Sidebar Features**:
- Price display
- Quantity controls
- Transport selection
- Price summary with taxes
- Proceed to checkout button

---

### 4. Authentication `/auth`
**File**: `app/auth/page.tsx`  
**Type**: Public auth page  
**Features**:
- Toggle between Sign In and Sign Up modes
- Firebase authentication integration
- Form validation
- Error messages display
- Full name field (signup only)
- Email input with validation
- Password input with confirmation (signup)
- Submit button with loading state
- Mode toggle button

**Components Used**:
- Card (shadcn/ui)
- Input (shadcn/ui)
- Label (shadcn/ui)
- Button (shadcn/ui)
- Alert (shadcn/ui)
- Lucide Icons

**Validation**:
- Email format checking
- Password matching for signup
- Full name required for signup
- Error display with icons

---

### 5. Support & FAQ `/support`
**File**: `app/support/page.tsx`  
**Type**: Public support page  
**Features**:
- Header with support intro
- 3 contact cards (Email, Phone, Chat)
- Support ticket submission form
- 6 FAQ items
- Form validation
- Success message feedback
- WhatsApp integration
- Responsive contact options

**Contact Methods**:
- Email: support@zosavuta.com
- Phone: +254 700 000 000
- WhatsApp: Direct link

**FAQ Topics**:
1. How to refund tickets
2. Change ticket quantity
3. Bus transport details
4. Payment methods
5. Download tickets
6. Payment security

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Input (shadcn/ui)
- Textarea (shadcn/ui)
- Button (shadcn/ui)
- Field & FieldLabel
- Lucide Icons

---

## Protected Pages (Auth Required)

### 6. Checkout `/checkout/[id]`
**File**: `app/checkout/[id]/page.tsx`  
**Type**: Protected checkout flow  
**Features**:
- 3-step checkout process:
  1. Attendee Information
  2. Payment Details
  3. Order Confirmation
- Step progress indication
- Form validation at each step
- Mock PayChangu integration
- Order summary sidebar
- Itemized pricing breakdown
- Order ID generation

**Step 1: Attendee Information**
- First name input
- Last name input
- Email input (validated)
- Phone input

**Step 2: Payment Details**
- Cardholder name
- Card number (16 digits)
- Expiry date (MM/YY)
- CVV (3 digits)
- Form validation

**Step 3: Confirmation**
- Success checkmark
- Order ID display
- Email confirmation
- Status indicator
- Return home button

**Sidebar**:
- Event name
- Quantity and price
- Transport cost (if selected)
- Processing fee
- Total calculation
- Security badge

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Input (shadcn/ui)
- Label (shadcn/ui)
- Button (shadcn/ui)
- Field & FieldLabel
- Lucide Icons

---

### 7. My Bookings `/my-bookings`
**File**: `app/my-bookings/page.tsx`  
**Type**: Protected user page  
**Features**:
- Tabbed interface (Confirmed, Pending, Used)
- Booking cards with:
  - Event image
  - Event title and details
  - Booking status badge
  - Date and location
  - Quantity and price
  - Action buttons
- QR code display (toggleable)
- Download tickets button
- Refund request button
- 3 demo bookings for testing

**Booking Card Elements**:
- Event image (medium)
- Event title
- Status badge (color-coded)
- Date and time display
- Location and venue
- Quantity information
- Total price
- Action buttons

**Actions by Status**:
- **Confirmed**: Show QR, Download, Refund
- **Pending**: Payment confirmation message
- **Used**: Event completed indicator

**QR Display**:
- SVG QR code placeholder
- Order ID
- Venue entry instruction

**Demo Bookings**:
1. Afrobeats Festival - 2 tickets, Confirmed
2. Tech Summit - 1 ticket, Confirmed
3. Football Championship - 3 tickets, Pending

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Tabs (shadcn/ui)
- Button (shadcn/ui)
- Empty (shadcn/ui)
- Badge (shadcn/ui)
- Lucide Icons

---

## Organizer Pages

### 8. Create Event `/organizer`
**File**: `app/organizer/page.tsx`  
**Type**: Protected organizer page  
**Features**:
- Comprehensive event creation form
- Sections:
  1. Basic Information
  2. Event Details
  3. Ticket Information
- Form validation
- Firestore integration
- Error handling

**Section 1: Basic Information**
- Event title input
- Short description textarea
- Full description textarea
- Category dropdown (5 options)

**Section 2: Event Details**
- Date picker
- Time picker
- Location/city input
- Venue name input

**Section 3: Ticket Information**
- Total tickets number input
- Price per ticket input
- Seating option checkbox
- Bus transport option checkbox

**Categories**:
- Music
- Sports
- Conference
- Festival
- Workshop

**Validation**:
- All required fields checked
- Positive numbers for tickets/price
- Firebase error handling
- Success redirect

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Input (shadcn/ui)
- Textarea (shadcn/ui)
- Label (shadcn/ui)
- Button (shadcn/ui)
- Field & FieldLabel
- Alert (shadcn/ui)

---

### 9. Organizer Dashboard `/organizer/dashboard`
**File**: `app/organizer/dashboard/page.tsx`  
**Type**: Protected organizer page  
**Features**:
- Header with create event button
- 4 stat cards:
  - Total Revenue
  - Tickets Sold
  - Total Events
  - Active Events
- Monthly revenue line chart
- Weekly sales bar chart
- Events table with:
  - Event name
  - Date
  - Tickets sold/total
  - Revenue
  - Status badge
  - View action button
- Tab filtering (All, Active, Draft)

**Stat Cards**:
- Icon + label + value
- Color-coded
- Real-time data updates

**Charts**:
- Monthly Revenue (6 months)
- Weekly Sales (7 days)
- Recharts integration
- Responsive sizing

**Events Table**:
- Sortable/searchable data
- Status indicators
- Quick view links
- Hover effects

**Demo Analytics**:
- 5 total events
- 278,000 KES revenue
- 350 tickets sold
- 3 active events

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Tabs (shadcn/ui)
- Button (shadcn/ui)
- LineChart (Recharts)
- BarChart (Recharts)
- Table (shadcn/ui)
- Badge (shadcn/ui)
- Lucide Icons

---

## Admin Pages

### 10. Admin Dashboard `/admin`
**File**: `app/admin/page.tsx`  
**Type**: Admin analytics page  
**Features**:
- Warning banner (demo mode)
- 4 metric cards:
  - Total Revenue
  - Total Users
  - Active Events
  - Tickets Sold
- Tabbed analytics:
  1. Revenue Trend (line chart)
  2. Events Analysis (pie chart + top list)
  3. Tickets Sales (bar chart)
- Demo data for all sections

**Revenue Tab**:
- Monthly revenue line chart
- 6 months of data
- Trend visualization

**Events Tab**:
- Category distribution pie chart
- Top 4 events list with growth %
- Performance comparisons

**Tickets Tab**:
- Sales by category bar chart
- Sold vs available comparison

**Demo Data**:
- 2.4M KES total revenue
- 12,543 total users
- 156 active events
- 45,230 tickets sold

**Components Used**:
- Navigation
- Card (shadcn/ui)
- Tabs (shadcn/ui)
- Button (shadcn/ui)
- LineChart (Recharts)
- PieChart (Recharts)
- BarChart (Recharts)
- Alert (shadcn/ui)
- Lucide Icons

---

## Component Breakdown

### Navigation Component
**File**: `components/navigation.tsx`

Features:
- Logo with icon
- Desktop nav links
- Desktop auth buttons
- Mobile hamburger menu
- Mobile sheet sidebar
- Responsive design

Links:
- Browse Events
- Create Event
- Support

---

### Event Card Component
**File**: `components/event-card.tsx`

Features:
- Event image with hover zoom
- Category badge
- Title (line-clamped)
- Description (line-clamped)
- Date and time display
- Location display
- Ticket availability
- Price display
- Book now link
- Hover animations

---

### UI Components (shadcn/ui)
Total: 50+ components including:
- Button
- Input
- Card
- Select
- Textarea
- Label
- Badge
- Tabs
- Dialog
- Alert
- Dropdown-menu
- Sheet
- And 38+ more...

---

## Data Flow

### User Journey

**Customer**:
1. Homepage → Browse Events
2. Select Event → View Details
3. Add to Cart (quantity/transport)
4. Proceed → Checkout
5. Enter Details → Payment
6. Confirmation → My Bookings
7. View Tickets with QR

**Organizer**:
1. Sign In → Create Event
2. Fill Details → Save to Firebase
3. View Dashboard → Analytics
4. Monitor Sales → Track Revenue

**Admin**:
1. Visit `/admin`
2. View Platform Analytics
3. Monitor Trends
4. Track Performance

---

## Database Collections

**events**
- id, title, description, category, date, time
- location, venue, image, price
- ticketsTotal, ticketsAvailable
- organizer, status

**orders**
- id, userId, eventId, quantity
- totalAmount, status
- firstName, lastName, email, phone
- busTransport, ticketNumbers

**users** (structure ready)
- id, email, fullName
- phone, preferences

**tickets** (structure ready)
- id, orderId, eventId, qrCode
- status, validatedAt

---

## Key Features Summary

### Frontend Features
✅ Responsive Design
✅ Mobile-first Approach
✅ Modern UI/UX
✅ Form Validation
✅ Error Handling
✅ Loading States
✅ Empty States
✅ Smooth Animations

### Functional Features
✅ Event Discovery
✅ Event Booking
✅ Payment Checkout
✅ User Authentication
✅ Ticket Management
✅ Event Creation
✅ Analytics Dashboard
✅ Admin Monitoring

### Technical Features
✅ Next.js 15
✅ React 19
✅ Firebase Integration
✅ TypeScript
✅ Tailwind CSS
✅ shadcn/ui
✅ Recharts
✅ Lucide Icons

---

This complete pages overview covers all 10 major pages, their features, components, and data flows in Zosavuta!
