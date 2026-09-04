# Zosavuta - Quick Start Guide

Get up and running with Zosavuta in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Firebase account (free tier available)
- Code editor (VS Code recommended)

## Step 1: Setup Firebase (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a new project" → name it "Zosavuta"
3. Skip Google Analytics (optional)
4. In Project Settings, copy these values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

## Step 2: Configure Environment (1 minute)

1. In your project, copy `.env.example` to `.env.local`
2. Paste your Firebase values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

## Step 3: Install & Run (2 minutes)

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit http://localhost:3000 ✨

## Try It Out

### As a Customer
1. Click "Browse Events" on homepage
2. Click any event → "Proceed to Checkout"
3. Fill in details → "Complete Payment" (mock)
4. View confirmation

### As an Organizer
1. Click "Create Event" in navigation
2. Fill in event details
3. Click "Create Event"
4. Visit `/organizer/dashboard` to see your event

### As an Admin
1. Visit `/admin` to see platform analytics
2. View revenue trends and ticket sales

## Demo Data

The app includes 6 sample events for testing:
- Afrobeats Music Festival (Nairobi)
- Tech Innovation Summit (Kampala)
- Football Championship (Lagos)
- Comedy Night (Addis Ababa)
- Web Development Workshop (Dar es Salaam)
- Food Festival (Kigali)

Plus 3 sample bookings to test the bookings page.

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/events` | Browse events |
| `/events/1` | Event details |
| `/auth` | Sign in/up |
| `/checkout/1` | Payment checkout |
| `/my-bookings` | Your tickets |
| `/organizer` | Create event |
| `/organizer/dashboard` | Your analytics |
| `/admin` | Platform analytics |
| `/support` | Help & FAQ |

## Customize for Your Market

### Change Colors
Edit `/app/globals.css` - look for `--primary` and `--secondary` color variables

### Change Text
Search for hardcoded event names and replace with your market data

### Add Your Events
1. Go to `/organizer` and create events
2. Or add directly to Firestore

## Firebase Security Rules

Before deploying to production, set these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events are public readable
    match /events/{document=**} {
      allow read: if true;
      allow create, update, delete: if request.auth.uid == resource.data.organizer;
    }
    
    // Orders are user-owned
    match /orders/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
    
    // User profiles are personal
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

## Common Issues

### "Firebase config is missing"
- Check `.env.local` file exists and has correct values
- Restart dev server after adding env vars

### "Cannot find module 'firebase'"
```bash
pnpm install firebase
```

### Events not showing
- Firestore needs `events` collection
- Or wait for demo data to load

## Next Steps

1. **Add Real Payments**
   - Sign up for [PayChangu](https://paychangu.com/)
   - Update `/app/checkout/[id]/page.tsx`

2. **Send Emails**
   - Add SendGrid integration
   - Send confirmation emails

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Monitor**
   - Setup Sentry for error tracking
   - Add Google Analytics

## Support

- Docs: See `README_ZOSAVUTA.md`
- Summary: See `ZOSAVUTA_SUMMARY.md`
- Firebase Docs: https://firebase.google.com/docs
- Next.js Docs: https://nextjs.org/docs

## What's Included

- ✅ Full event discovery & booking system
- ✅ User authentication
- ✅ Organizer event creation
- ✅ Admin analytics dashboard
- ✅ Mock payment checkout
- ✅ Responsive mobile design
- ✅ Modern Navy + Orange theme
- ✅ 50+ UI components
- ✅ Demo data & bookings

## What to Add Before Production

- [ ] Real PayChangu integration
- [ ] Email notifications
- [ ] SMS notifications
- [ ] QR code generation
- [ ] Seat selection
- [ ] Bus route management
- [ ] Advanced admin features
- [ ] Mobile app (React Native)
- [ ] Affiliate program
- [ ] Social sharing

---

**You're ready to go! Happy building! 🚀**

Questions? See the full documentation in `README_ZOSAVUTA.md`
