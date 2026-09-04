# Zosavuta - Event Ticketing Platform

Zosavuta is a modern, full-featured event ticketing platform designed for the African market. It enables event organizers to create and manage events, while providing attendees with a seamless booking experience, including integrated bus transport options.

## Features

### For Attendees
- **Event Discovery**: Browse and search events by category, location, and date
- **Easy Booking**: Multi-step checkout with integrated payment processing
- **Ticket Management**: Download tickets, view QR codes, manage bookings
- **Transport Integration**: Optional round-trip bus transport with events
- **Secure Payments**: Mock PayChangu integration (ready for production)
- **Support System**: 24/7 customer support with FAQ section

### For Organizers
- **Event Creation**: Simple form to create and publish events
- **Dashboard Analytics**: Track sales, revenue, and attendee metrics
- **Ticket Management**: Monitor available tickets and sales in real-time
- **Revenue Tracking**: Detailed analytics on ticket sales and earnings

### For Administrators
- **Platform Analytics**: System-wide insights and metrics
- **Event Monitoring**: Track all platform events and categories
- **Revenue Dashboard**: Monitor total platform revenue and growth

## Technology Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom Navy + Orange theme
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **Payments**: Mock PayChangu integration (production-ready)
- **Charts**: Recharts for analytics visualization
- **Components**: shadcn/ui component library

## Project Structure

```
/app
  /events              # Event browsing and details
  /checkout            # Payment and booking checkout
  /organizer           # Event creation and organizer dashboard
  /admin               # Admin dashboard
  /auth                # Authentication pages
  /my-bookings         # User ticket management
  /support             # Customer support pages
  page.tsx             # Homepage
  layout.tsx           # Root layout
  globals.css          # Global styles and theme

/components
  navigation.tsx       # Main navigation
  event-card.tsx       # Event card component
  theme-provider.tsx   # Theme configuration
  ui/                  # shadcn/ui components

/lib
  firebase.ts          # Firebase configuration and initialization
  utils.ts             # Utility functions

/public                # Static assets
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd zosavuta

# Install dependencies
pnpm install
```

### 2. Configure Firebase

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Copy your Firebase config from Project Settings
5. Create `.env.local` file and add your credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Setup Firestore Collections

Create the following Firestore collections:

**events**
```javascript
{
  title: string
  description: string
  fullDescription: string
  category: 'music' | 'sports' | 'conference' | 'festival' | 'workshop'
  date: string (YYYY-MM-DD)
  time: string (HH:MM)
  location: string
  venue: string
  image: string (URL)
  ticketsTotal: number
  ticketsAvailable: number
  price: number
  seatingChart: boolean
  busTransport: boolean
  organizer: string (user ID)
  organizerEmail: string
  createdAt: timestamp
  status: 'draft' | 'active' | 'completed' | 'cancelled'
}
```

**orders**
```javascript
{
  userId: string
  eventId: string
  eventTitle: string
  quantity: number
  totalAmount: number
  status: 'pending' | 'confirmed' | 'refunded'
  paymentMethod: string
  createdAt: timestamp
  ticketNumbers: array<string>
}
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000 to see the application.

## Demo Data

The application comes with demo events and bookings for testing. These are loaded automatically if Firestore is not configured or empty.

### Demo Accounts (for testing)
- **Attendee**: Any email/password combination during auth
- **Organizer**: Sign up and create events via `/organizer`
- **Admin**: Access `/admin` for analytics dashboard

## PayChangu Integration

The checkout flow includes a mock PayChangu integration. To integrate real PayChangu:

1. Sign up for PayChangu at https://paychangu.com/
2. Get your API credentials
3. Update `.env.local`:
```env
NEXT_PUBLIC_PAYCHANGU_API_KEY=your_key
PAYCHANGU_SECRET_KEY=your_secret
```
4. Implement PayChangu API calls in `/app/checkout/[id]/page.tsx`

## Features Implementation Status

### Completed
- [x] Homepage with hero and features
- [x] Event browsing and filtering
- [x] Event detail pages
- [x] User authentication (Firebase)
- [x] Mock checkout process
- [x] User bookings management
- [x] Event creation for organizers
- [x] Organizer dashboard with analytics
- [x] Admin dashboard with platform metrics
- [x] Customer support system
- [x] Responsive design for mobile/tablet
- [x] Custom Navy + Orange theme

### Ready for Production
- [ ] PayChangu payment integration (structure in place)
- [ ] Firestore security rules implementation
- [ ] Email notifications system
- [ ] SMS notifications (M-Pesa confirmations)
- [ ] QR code generation and validation
- [ ] Seat selection UI
- [ ] Bus route management
- [ ] Ticket scanning mobile app
- [ ] Advanced admin features

## Deployment

### Deploy to Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Connect to Vercel
vercel --prod
```

### Environment Variables on Vercel

Add all Firebase credentials and payment API keys to Vercel project settings under "Environment Variables".

## Navigation

### Public Routes
- `/` - Homepage
- `/events` - Event listing and search
- `/events/[id]` - Event details
- `/auth` - Login/Sign up
- `/support` - Support and FAQ

### Protected Routes (Require Authentication)
- `/my-bookings` - User ticket management
- `/organizer` - Create event
- `/organizer/dashboard` - Organizer analytics
- `/checkout/[id]` - Checkout process

### Admin Routes
- `/admin` - Admin dashboard

## Color Scheme

Zosavuta uses a professional Navy + Orange color palette:
- **Primary**: Navy Blue (for buttons, headers, links)
- **Secondary/Accent**: Vibrant Orange (for CTAs, highlights)
- **Neutral**: Grays for text and borders
- **Success**: Green for confirmations
- **Alert**: Red for cancellations/refunds

## API Structure (Future)

When integrating with a backend API, use this structure:

```
POST /api/events              - Create event
GET  /api/events              - List events
GET  /api/events/[id]         - Get event details
POST /api/bookings            - Create booking
GET  /api/bookings            - List user bookings
POST /api/payments            - Process payment
POST /api/tickets/validate    - Validate ticket QR code
GET  /api/admin/analytics     - Get analytics data
```

## Security Considerations

- All user payment data is never stored locally
- Firebase Authentication handles secure user management
- Use HTTPS in production
- Implement Firestore security rules before production
- Validate all user inputs server-side
- Use environment variables for sensitive data

## Performance Optimization

- Images are optimized with Next.js Image component
- Lazy loading for routes with code splitting
- SWR for client-side data fetching and caching
- Recharts for efficient chart rendering
- Responsive images with srcset

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

To contribute to Zosavuta:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - Zosavuta Inc.

## Support

For support, contact us at:
- Email: support@zosavuta.com
- Phone: +254 700 000 000
- WhatsApp: +254 700 000 000

## Roadmap

### Q2 2026
- Live PayChangu integration
- SMS notifications
- Email confirmation system

### Q3 2026
- Mobile app (React Native)
- QR code scanning
- Advanced seat selection

### Q4 2026
- AI-powered event recommendations
- Social sharing features
- Affiliate program

## Acknowledgments

Built with Next.js, React, Firebase, and shadcn/ui. Designed with inspiration from modern ticketing platforms worldwide.
