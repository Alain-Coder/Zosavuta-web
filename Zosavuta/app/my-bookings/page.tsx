'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CalendarIcon, MapPinIcon, TagIcon, InfoIcon, TicketIcon, BusIcon, ArrowRightIcon, ArmchairIcon, ClockIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { getBookingsByUser as getBusBookingsByUser } from '@/lib/bus/api';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { QRCodeSVG } from 'qrcode.react';

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventVenue: string;
  eventImage: string;
  quantity: number;
  price: number;
  totalAmount: number;
  status: 'confirmed' | 'used' | 'refunded' | 'pending';
  bookingDate: string;
  ticketNumbers: string[];
  isListed?: boolean;
  resalePrice?: number;
  tier?: string;
  firstName?: string;
  lastName?: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busBookings, setBusBookings] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/orders?userId=${user.uid}`);
        let data: Booking[] = res.ok ? await res.json() : [];

        try {
          const headers = await getAuthHeaders();
          const resaleRes = await fetch(`/api/resale?sellerId=${user.uid}&status=available`, { headers });
          if (resaleRes.ok) {
            const listings: { orderId: string; price: number }[] = await resaleRes.json();
            const listedMap = new Map(listings.map((l) => [l.orderId, l.price]));
            data = data.map((b) => ({
              ...b,
              isListed: listedMap.has(b.id),
              resalePrice: listedMap.get(b.id),
            }));
          }
        } catch {
          // resale fetch optional
        }

        setBookings(data);

        // Fetch bus bookings
        try {
          const bb = await getBusBookingsByUser(user.uid);
          setBusBookings(bb);
        } catch {
          setBusBookings([]);
        }
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const usedBookings = bookings.filter((b) => b.status === 'used');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  return (
    <>
      {/* Resale Dialog State handled in BookingCard */}
      
      {/* Page Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <h1 className="text-4xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground text-lg mt-2">Manage your event tickets and bookings</p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="confirmed" className="w-full">
          <TabsList>
            <TabsTrigger value="confirmed">Confirmed ({confirmedBookings.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
            <TabsTrigger value="used">Used ({usedBookings.length})</TabsTrigger>
            <TabsTrigger value="bus" className="flex items-center gap-1.5">
              <BusIcon className="w-3.5 h-3.5" />
              Bus Tickets ({busBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="confirmed" className="mt-6 space-y-6">
            {confirmedBookings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">You haven&apos;t booked any events yet</p>
                <Link href="/events">
                  <Button className="bg-primary hover:bg-primary/90">Browse Events</Button>
                </Link>
              </Card>
            ) : (
              confirmedBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  status="confirmed" 
                  onUpdate={async () => {
                    try {
                      const headers = await getAuthHeaders();
                      const resaleRes = await fetch(`/api/resale?sellerId=${user!.uid}&status=available`, { headers });
                      const listings: { orderId: string; price: number }[] = resaleRes.ok ? await resaleRes.json() : [];
                      const listedMap = new Map(listings.map((l) => [l.orderId, l.price]));
                      setBookings((prev) =>
                        prev.map((b) =>
                          b.id === booking.id
                            ? { ...b, isListed: listedMap.has(b.id), resalePrice: listedMap.get(b.id) }
                            : b
                        )
                      );
                    } catch {
                      setBookings((prev) =>
                        prev.map((b) => (b.id === booking.id ? { ...b, isListed: true } : b))
                      );
                    }
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-6 space-y-6">
            {pendingBookings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No pending bookings</p>
              </Card>
            ) : (
              pendingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} status="pending" />
              ))
            )}
          </TabsContent>

          <TabsContent value="used" className="mt-6 space-y-6">
            {usedBookings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No past events yet</p>
              </Card>
            ) : (
              usedBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} status="used" />
              ))
            )}
          </TabsContent>

          {/* ── Bus Tickets Tab ── */}
          <TabsContent value="bus" className="mt-6 space-y-6">
            {busBookings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No bus tickets yet</p>
              </Card>
            ) : (
              busBookings.map((busBooking) => (
                <BusTicketCard
                  key={busBooking.id}
                  booking={busBooking}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function BookingCard({
  booking,
  status,
  onUpdate,
}: {
  booking: Booking;
  status: 'confirmed' | 'pending' | 'used';
  onUpdate?: () => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const [showResaleDialog, setShowResaleDialog] = useState(false);
  const [resalePrice, setResalePrice] = useState(booking.price);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSoldOut = async () => {
      if (!booking.eventId) return;
      try {
        const res = await fetch(`/api/events/${booking.eventId}`);
        if (res.ok) {
          const eventData = await res.json();
          setIsSoldOut(eventData.ticketsAvailable <= 0 || eventData.status === 'sold_out');
        }
      } catch (error) {
        // Silently fail — sold-out check is non-critical
      }
    };
    checkSoldOut();
  }, [booking.eventId]);

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    used: 'bg-blue-100 text-blue-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  const formatDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return `${months[monthIndex]} ${day}, ${year}`;
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleResaleListing = async () => {
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/resale', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId: booking.id, price: resalePrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list ticket');

      toast({
        title: 'Ticket Listed!',
        description: `Your ticket for ${booking.eventTitle} is now on the marketplace for MWK ${resalePrice.toLocaleString()}.`,
      });
      setShowResaleDialog(false);
      if (onUpdate) onUpdate();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to list ticket for resale.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resaleDialogModal = (
    <Dialog open={showResaleDialog} onOpenChange={setShowResaleDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resell your Ticket</DialogTitle>
          <DialogDescription>
            Set a price for your ticket. Other users will be able to see and buy it from the marketplace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="price">Asking Price (MWK)</Label>
            <Input
              id="price"
              type="number"
              value={resalePrice}
              onChange={(e) => setResalePrice(Number(e.target.value))}
              className="col-span-3"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <InfoIcon className="w-3 h-3" />
              Original price: MWK {booking.price.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg text-xs text-orange-800">
            <p className="font-bold mb-1">How it works:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Your ticket will be listed on the Marketplace.</li>
              <li>Once someone buys it, you will receive the funds.</li>
              <li>Your original ticket will be invalidated and a new one issued to the buyer.</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowResaleDialog(false)}>Cancel</Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white" 
            onClick={handleResaleListing}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Listing..." : "Confirm Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (booking.tier === 'VIP' || booking.tier?.toUpperCase() === 'VIP') {
    return (
      <div className="relative group my-4">
        {/* VIP Ticket Container */}
        <div className="flex flex-col md:flex-row bg-gradient-to-r from-slate-950 via-zinc-900 to-black rounded-[24px] border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.2)] text-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-amber-400">
          
          {/* Holographic / Metallic background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Left Side: Event Details & Image */}
          <div className="flex-1 flex flex-col sm:flex-row relative z-10">
            {/* Image */}
            <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 relative">
              <img
                src={booking.eventImage}
                alt={booking.eventTitle}
                className="w-full h-full object-cover filter saturate-125 brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent to-slate-950/60" />
              
              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${
                  booking.status === 'confirmed' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 p-6 flex flex-col justify-between bg-transparent relative">
              {/* Watermark */}
              <div className="absolute top-4 right-4 opacity-5 pointer-events-none text-amber-500">
                <TicketIcon className="w-24 h-24" />
              </div>

              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-amber-400 font-bold tracking-[0.2em] text-[8px] uppercase mb-1 block">Premium Live Experience</span>
                    <h3 className="text-2xl font-black tracking-tight text-white uppercase">{booking.eventTitle}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 text-black items-center gap-1.5 uppercase tracking-widest shadow-lg shadow-amber-500/20">
                        👑 Elite VIP All Access
                      </span>
                      {booking.isListed && (
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 items-center gap-1.5 uppercase tracking-widest shadow-sm">
                          <TagIcon className="w-3 h-3" />
                          Listed for Resale
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400 mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date & Time</p>
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <CalendarIcon className="w-4 h-4 text-amber-500" />
                      <span>{formatDate(booking.eventDate)} • {booking.eventTime}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Venue</p>
                    <div className="flex items-center gap-2 font-semibold text-white truncate">
                      <MapPinIcon className="w-4 h-4 text-amber-500" />
                      <span className="truncate">{booking.eventVenue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 w-fit">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ticket Type</p>
                    <p className="font-bold text-amber-400 uppercase tracking-wider">VIP PASS</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quantity</p>
                    <p className="font-bold text-white">{booking.quantity}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Amount</p>
                    <p className="font-black text-amber-400">MWK {booking.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap mt-6">
                {status === 'confirmed' && (
                  <>
                    <Button variant="outline" className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Download Pass
                    </Button>
                    {!booking.isListed && (
                      <Button 
                        onClick={() => setShowResaleDialog(true)}
                        className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border-none shadow-md shadow-orange-600/20"
                      >
                        <TagIcon className="w-4 h-4" />
                        Resell Ticket
                      </Button>
                    )}
                  </>
                )}
                {status === 'pending' && (
                  <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Awaiting payment
                  </div>
                )}
                {status === 'used' && (
                  <Button disabled variant="outline" className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider border-zinc-800 text-zinc-500 bg-transparent">
                    Event Completed
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Perforated Divider (Hidden on mobile, vertical on desktop) */}
          <div className="hidden md:flex flex-col items-center justify-center relative bg-transparent border-l-2 border-dashed border-amber-500/30">
            <div className="absolute top-0 -mt-3 w-6 h-6 bg-background rounded-full border-b-2 border-amber-500/50" />
            <div className="absolute bottom-0 -mb-3 w-6 h-6 bg-background rounded-full border-t-2 border-amber-500/50" />
          </div>
          
          {/* Mobile Perforated Divider (Horizontal on mobile) */}
          <div className="md:hidden flex items-center justify-center relative bg-transparent border-t-2 border-dashed border-amber-500/30">
            <div className="absolute left-0 -ml-3 w-6 h-6 bg-background rounded-full border-r-2 border-amber-500/50" />
            <div className="absolute right-0 -mr-3 w-6 h-6 bg-background rounded-full border-l-2 border-amber-500/50" />
          </div>

          {/* Right Side: Stub & Actual QR */}
          <div className="md:w-64 bg-black/40 p-6 flex flex-col items-center justify-center relative border-l border-amber-500/10 z-10">
            <div className="text-center w-full">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 mb-4">Admit VIP {booking.quantity}</p>
              
              <div className="bg-white p-3.5 rounded-2xl shadow-xl mx-auto mb-4 border border-amber-500/20 hover:shadow-2xl transition-all duration-300">
                <QRCodeSVG 
                  value={`https://zosavuta.com/verify-ticket/${booking.id}`}
                  size={110}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                  includeMargin={true}
                  className="mx-auto"
                />
              </div>
              
              <p className="text-xs font-mono font-bold text-amber-400 bg-zinc-900 py-1.5 px-3 rounded-lg border border-amber-500/20">
                {booking.ticketNumbers?.[0] || booking.id.split('-').pop()}
              </p>
              
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-500 mt-4 animate-pulse">
                Scan at VIP entrance
              </p>
            </div>
          </div>
        </div>
        {resaleDialogModal}
      </div>
    );
  }

  return (
    <div className="relative group my-4">
      {/* Regular Ticket Container */}
      <div className="flex flex-col md:flex-row bg-card rounded-[24px] shadow-lg border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-xl group-hover:border-primary/20">
        
        {/* Left Side: Event Details & Image */}
        <div className="flex-1 flex flex-col sm:flex-row">
          {/* Image */}
          <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 relative">
            <img
              src={booking.eventImage}
              alt={booking.eventTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent to-black/20" />
            
            {/* Status Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md ${
                booking.status === 'confirmed' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {booking.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 p-6 flex flex-col justify-between bg-card relative">
            {/* Subtle watermark */}
            <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
              <TicketIcon className="w-24 h-24" />
            </div>

            <div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">{booking.eventTitle}</h3>
                  <div className="flex gap-2 mt-2">
                    {booking.isListed && (
                      <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 items-center gap-1.5 uppercase tracking-widest shadow-sm">
                        <TagIcon className="w-3 h-3" />
                        Listed for Resale
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-6 relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Date & Time</p>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span>{formatDate(booking.eventDate)} • {booking.eventTime}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Venue</p>
                  <div className="flex items-center gap-2 font-semibold text-foreground truncate">
                    <MapPinIcon className="w-4 h-4 text-primary" />
                    <span className="truncate">{booking.eventLocation}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border/50 relative z-10 w-fit">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ticket Type</p>
                  <p className="font-bold text-foreground capitalize">{booking.tier || 'Regular'} Admission</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quantity</p>
                  <p className="font-bold text-foreground">{booking.quantity}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
                  <p className="font-black text-primary">MWK {booking.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap mt-6 relative z-10">
              {status === 'confirmed' && (
                <>
                  <Button variant="outline" className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Download
                  </Button>
                  {!booking.isListed && (
                    <Button 
                      onClick={() => setShowResaleDialog(true)}
                      variant="secondary" 
                      className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white border-none shadow-md shadow-orange-600/20"
                    >
                      <TagIcon className="w-4 h-4" />
                      Resell
                    </Button>
                  )}
                </>
              )}
              {status === 'pending' && (
                <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4" />
                  Awaiting payment
                </div>
              )}
              {status === 'used' && (
                <Button disabled variant="outline" className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider">
                  Event Completed
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Perforated Divider (Hidden on mobile, vertical on desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center relative bg-card border-l-2 border-dashed border-border/60">
          <div className="absolute top-0 -mt-3 w-6 h-6 bg-background rounded-full border-b-2 border-border/50" />
          <div className="absolute bottom-0 -mb-3 w-6 h-6 bg-background rounded-full border-t-2 border-border/50" />
        </div>
        
        {/* Mobile Perforated Divider (Horizontal on mobile) */}
        <div className="md:hidden flex items-center justify-center relative bg-card border-t-2 border-dashed border-border/60">
          <div className="absolute left-0 -ml-3 w-6 h-6 bg-background rounded-full border-r-2 border-border/50" />
          <div className="absolute right-0 -mr-3 w-6 h-6 bg-background rounded-full border-l-2 border-border/50" />
        </div>

        {/* Right Side: Stub & QR */}
        <div className="md:w-64 bg-muted/30 p-6 flex flex-col items-center justify-center relative border-l border-border/10">
          <div className="text-center w-full">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Admit {booking.quantity}</p>
            
            <div className="bg-white p-3.5 rounded-2xl shadow-sm mx-auto mb-4 border border-border/50 hover:shadow-md transition-shadow">
              <QRCodeSVG 
                value={`https://zosavuta.com/verify-ticket/${booking.id}`}
                size={110}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
                includeMargin={true}
                className="mx-auto"
              />
            </div>
            
            <p className="text-xs font-mono font-bold text-foreground bg-muted py-1.5 px-3 rounded-lg border border-border/50">
              {booking.id.split('-').pop()}
            </p>
            
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-4">
              Scan at entrance
            </p>
          </div>
        </div>
      </div>

      {resaleDialogModal}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BUS TICKET CARD  —  boarding-pass style
═══════════════════════════════════════════════════════ */

import type { Booking as BusBooking } from '@/lib/bus/types';

function BusTicketCard({
  booking,
}: {
  booking: any;
}) {
  const [expanded, setExpanded] = useState(false);

  const fmt = (d: Date) =>
    new Date(d).toLocaleString('en-MW', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const fmtTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-MW', { hour: '2-digit', minute: '2-digit' });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-MW', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const statusColor =
    booking.status === 'confirmed'
      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
      : booking.status === 'cancelled'
      ? 'bg-red-500/15 text-red-700 border-red-500/30'
      : 'bg-amber-500/15 text-amber-700 border-amber-500/30';

  return (
    <div className="relative group my-4">
      {/* ── Outer shell ── */}
      <div className="flex flex-col md:flex-row rounded-[24px] overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">

        {/* ════ LEFT PANEL ════ */}
        <div className="flex-1 relative">
          {/* Gradient header band */}
          <div className="h-2 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />

          <div className="p-6">
            {/* Top row: operator + status */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow">
                  <BusIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bus Ticket</p>
                  <p className="text-sm font-black text-foreground leading-none">
                    {booking.busModel ?? 'Coach Service'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColor}`}>
                {booking.status}
              </span>
            </div>

            {/* ── Route: origin → destination ── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="text-center min-w-[80px]">
                <p className="text-2xl font-black text-foreground leading-none">
                  {booking.origin?.slice(0, 3).toUpperCase() ?? 'ORG'}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate max-w-[90px]">
                  {booking.origin ?? '—'}
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 w-full">
                  <div className="h-px flex-1 bg-border" />
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <div className="h-px flex-1 border-t border-dashed border-border" />
                  <ArrowRightIcon className="w-4 h-4 text-teal-500 shrink-0" />
                  <div className="h-px flex-1 border-t border-dashed border-border" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div className="h-px flex-1 bg-border" />
                </div>
                {booking.distanceKm && (
                  <p className="text-[10px] text-muted-foreground font-medium">{booking.distanceKm} km</p>
                )}
              </div>

              <div className="text-center min-w-[80px]">
                <p className="text-2xl font-black text-foreground leading-none">
                  {booking.destination?.slice(0, 3).toUpperCase() ?? 'DST'}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate max-w-[90px]">
                  {booking.destination ?? '—'}
                </p>
              </div>
            </div>

            {/* ── Times grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Departure</p>
                <div className="flex items-center gap-1 text-foreground font-bold text-sm">
                  <ClockIcon className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  {booking.departureTime ? fmtTime(new Date(booking.departureTime)) : '—'}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {booking.departureTime ? fmtDate(new Date(booking.departureTime)) : ''}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Arrival</p>
                <div className="flex items-center gap-1 text-foreground font-bold text-sm">
                  <ClockIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {booking.arrivalTime ? fmtTime(new Date(booking.arrivalTime)) : '—'}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {booking.arrivalTime ? fmtDate(new Date(booking.arrivalTime)) : ''}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Seat(s)</p>
                <div className="flex items-center gap-1 text-foreground font-bold text-sm">
                  <ArmchairIcon className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  {booking.seatNumbers?.join(', ') ?? `${booking.seats} seats`}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Fare</p>
                <p className="text-foreground font-black text-sm text-teal-600">
                  MWK {booking.totalPrice.toLocaleString()}
                </p>
              </div>
            </div>

            {/* ── Info pills ── */}
            <div className="flex flex-wrap gap-2">
              {booking.licensePlate && (
                <span className="flex items-center gap-1.5 bg-muted/60 border border-border/50 rounded-lg px-3 py-1 text-xs font-semibold text-foreground">
                  🚌 {booking.licensePlate}
                </span>
              )}
              {booking.amenities?.map((a: string) => (
                <span key={a} className="bg-teal-500/10 border border-teal-500/20 text-teal-700 rounded-lg px-2.5 py-1 text-xs font-semibold">
                  {a}
                </span>
              ))}
              {booking.tripStatus && (
                <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 rounded-lg px-2.5 py-1 text-xs font-semibold">
                  {booking.tripStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ════ PERFORATED DIVIDER ════ */}
        <div className="hidden md:flex flex-col items-center justify-center relative bg-card border-l-2 border-dashed border-border/50 w-0">
          <div className="absolute top-0 -mt-3 w-6 h-6 bg-background rounded-full border-b-2 border-border/40" />
          <div className="absolute bottom-0 -mb-3 w-6 h-6 bg-background rounded-full border-t-2 border-border/40" />
        </div>
        <div className="md:hidden h-0 relative border-t-2 border-dashed border-border/50">
          <div className="absolute left-0 -ml-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-r-2 border-border/40" />
          <div className="absolute right-0 -mr-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-l-2 border-border/40" />
        </div>

        {/* ════ RIGHT STUB ════ */}
        <div className="md:w-56 bg-gradient-to-b from-teal-500/5 to-indigo-500/5 p-6 flex flex-col items-center justify-center gap-4">
          {/* QR Code */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-border/50">
            <QRCodeSVG
              value={`https://zosavuta.com/verify-bus/${booking.id}`}
              size={100}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="Q"
              includeMargin={false}
            />
          </div>

          {/* Reference */}
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Booking Ref</p>
            <p className="font-mono font-black text-sm text-foreground bg-muted px-3 py-1 rounded-lg border border-border/50">
              {booking.bookingReference ?? booking.id.split('-').pop()?.toUpperCase()}
            </p>
          </div>

          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-teal-600 text-center">
            Show at boarding
          </p>
        </div>
      </div>
    </div>
  );
}
