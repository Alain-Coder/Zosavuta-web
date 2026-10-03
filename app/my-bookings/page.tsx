'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CalendarIcon, MapPinIcon, TagIcon, InfoIcon, TicketIcon, ArrowRightIcon, ArmchairIcon, ClockIcon, DownloadIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
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
import { downloadTicketPdf } from '@/lib/ticket-pdf';

export interface TicketItem {
  id: number;
  ticketNumber: string;
  verificationToken: string | null;
  status: string;
  listedForResale: boolean;
  resaleListingId: string | null;
  resalePrice?: number | null;
  resaleStatus?: string | null;
}

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
  ticketTokens?: (string | null)[];
  tickets?: TicketItem[];
  isListed?: boolean;
  isResalePurchase?: boolean;
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders?userId=${user.uid}`);
      let data: Booking[] = (res.ok && res.headers.get('content-type')?.includes('application/json'))
        ? await res.json()
        : [];

      try {
        const headers = await getAuthHeaders();
        const resaleRes = await fetch(`/api/resale?sellerId=${user.uid}&status=ACTIVE`, { headers });
        if (resaleRes.ok && resaleRes.headers.get('content-type')?.includes('application/json')) {
          const listings: any[] = await resaleRes.json();
          const listingByTicketId = new Map(listings.filter((l) => l.ticketId).map((l) => [Number(l.ticketId), l]));
          const listingByOrderId = new Map(listings.map((l) => [l.orderId, l]));

          data = data.map((b: any) => {
            const updatedTickets = (b.tickets || []).map((t: any) => {
              const foundListing = listingByTicketId.get(t.id) || (b.quantity === 1 ? listingByOrderId.get(b.id) : null);
              if (foundListing) {
                return {
                  ...t,
                  listedForResale: true,
                  resalePrice: Number(foundListing.price),
                  resaleListingId: foundListing.id,
                };
              }
              return t;
            });

            const anyListed = updatedTickets.some((t: any) => t.listedForResale) || listingByOrderId.has(b.id);
            const activeResale = listings.find((l) => l.orderId === b.id);

            return {
              ...b,
              tickets: updatedTickets,
              isListed: anyListed,
              resalePrice: activeResale ? Number(activeResale.price) : b.resalePrice,
            };
          });
        }
      } catch {
        // resale fetch optional
      }

      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    const checkRoleAndFetch = async () => {
      try {
        const res = await fetch(`/api/users/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'organizer') {
            router.replace('/organizer/dashboard');
            return;
          }
          if (data.role === 'admin' || data.role === 'accountant') {
            router.replace('/admin');
            return;
          }
          if (data.role === 'operator') {
            router.replace('/operator/dashboard');
            return;
          }
        }
      } catch {
        // continue
      }
      fetchData();
    };
    checkRoleAndFetch();
  }, [user, authLoading, router, fetchData]);

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
                  onUpdate={fetchData}
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
                <BookingCard key={booking.id} booking={booking} status="pending" onUpdate={fetchData} />
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
  const [showResaleDialog, setShowResaleDialog] = useState(false);
  const [resalePrice, setResalePrice] = useState(booking.price);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const { toast } = useToast();

  // Derived helpers
  const tickets: TicketItem[] = booking.tickets || [];
  const unlistedTickets = tickets.filter((t) => !t.listedForResale && t.status === 'VALID');
  const listedTickets = tickets.filter((t) => t.listedForResale);
  const hasUnlisted = unlistedTickets.length > 0;

  const openResaleDialog = () => {
    setSelectedTicketIds(unlistedTickets.map((t) => t.id));
    setResalePrice(booking.price);
    setShowResaleDialog(true);
  };

  const toggleTicketSelection = (ticketId: number) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    );
  };

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
    if (selectedTicketIds.length === 0) {
      toast({ variant: 'destructive', title: 'No tickets selected', description: 'Please select at least one ticket to list.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/resale', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: booking.id, price: resalePrice, ticketIds: selectedTicketIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list ticket');

      const count = selectedTicketIds.length;
      toast({
        title: count > 1 ? `${count} Tickets Listed!` : 'Ticket Listed!',
        description: `${count > 1 ? `${count} tickets` : 'Your ticket'} for ${booking.eventTitle} ${count > 1 ? 'are' : 'is'} now on the marketplace for MWK ${resalePrice.toLocaleString()} each.`,
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

  const handleCancelResale = async (listingId: string) => {
    setCancellingId(listingId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/resale/${listingId}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel listing');
      toast({ title: 'Listing Cancelled', description: 'Your ticket has been removed from the marketplace and your QR code is restored.' });
      if (onUpdate) onUpdate();
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Could not cancel the listing.' });
    } finally {
      setCancellingId(null);
    }
  };

  const downloadTickets = async () => {
    const downloadable = tickets.length > 0
      ? tickets.filter((t) => !t.listedForResale && t.verificationToken)
      : [];

    if (downloadable.length === 0 && tickets.length > 0) {
      toast({ variant: 'destructive', title: 'No downloadable tickets', description: 'All your tickets are currently listed for resale.' });
      return;
    }

    if (downloadable.length === 0) {
      const tokens = (booking.ticketTokens || []).filter(Boolean) as string[];
      if (!tokens.length) {
        toast({ variant: 'destructive', title: 'Ticket download unavailable', description: 'This ticket was issued before secure QR verification was enabled.' });
        return;
      }
      await downloadTicketPdf(
        { title: booking.eventTitle, date: formatDate(booking.eventDate), time: booking.eventTime, venue: booking.eventVenue, location: booking.eventLocation },
        tokens.map((token, index) => ({ ticketNumber: booking.ticketNumbers?.[index] || `Ticket ${index + 1}`, token, ticketType: booking.tier || 'Standard', price: booking.price }))
      );
      return;
    }

    await downloadTicketPdf(
      { title: booking.eventTitle, date: formatDate(booking.eventDate), time: booking.eventTime, venue: booking.eventVenue, location: booking.eventLocation },
      downloadable.map((t) => ({ ticketNumber: t.ticketNumber, token: t.verificationToken || '', ticketType: booking.tier || 'Standard', price: booking.price }))
    );
  };

  const resaleDialogModal = (
    <Dialog open={showResaleDialog} onOpenChange={setShowResaleDialog}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Resell {unlistedTickets.length > 1 ? 'Ticket(s)' : 'Ticket'}</DialogTitle>
          <DialogDescription>
            {unlistedTickets.length > 1
              ? 'Select which ticket(s) to list. Each will appear separately on the Marketplace.'
              : 'Set a price and list your ticket on the Marketplace.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Ticket selector – only shown when 2+ unlisted tickets */}
          {unlistedTickets.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Select Ticket(s) to Sell</Label>
                <div className="flex gap-2">
                  <button type="button" className="text-xs text-orange-600 font-bold hover:underline cursor-pointer" onClick={() => setSelectedTicketIds(unlistedTickets.map((t) => t.id))}>All</button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button type="button" className="text-xs text-muted-foreground hover:underline cursor-pointer" onClick={() => setSelectedTicketIds([])}>Clear</button>
                </div>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                {unlistedTickets.map((ticket, idx) => (
                  <label
                    key={ticket.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedTicketIds.includes(ticket.id)
                      ? 'bg-orange-50 border-l-2 border-orange-500'
                      : 'hover:bg-muted/50'
                      } ${idx > 0 ? 'border-t border-border' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-orange-600 cursor-pointer"
                      checked={selectedTicketIds.includes(ticket.id)}
                      onChange={() => toggleTicketSelection(ticket.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{ticket.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground">Ticket {idx + 1} of {unlistedTickets.length}</p>
                    </div>
                    {selectedTicketIds.includes(ticket.id) && (
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Selected</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{selectedTicketIds.length} of {unlistedTickets.length} ticket(s) selected</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resale-price">Asking Price per Ticket (MWK)</Label>
            <Input
              id="resale-price"
              type="number"
              value={resalePrice}
              onChange={(e) => setResalePrice(Number(e.target.value))}
              className="col-span-3"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <InfoIcon className="w-3 h-3" />
              Original price: MWK {booking.price.toLocaleString()} per ticket
              {selectedTicketIds.length > 1 && (
                <span className="ml-1 font-bold">· Total: MWK {(resalePrice * selectedTicketIds.length).toLocaleString()}</span>
              )}
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg text-xs text-orange-800">
            <p className="font-bold mb-1">How it works:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Selected ticket(s) will be listed on the Marketplace.</li>
              <li>Their QR codes will be hidden until the listing is cancelled or sold.</li>
              <li>Once someone buys a ticket, you receive the funds and it transfers to the buyer.</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button className="cursor-pointer" variant="outline" onClick={() => setShowResaleDialog(false)}>Cancel</Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
            onClick={handleResaleListing}
            disabled={isSubmitting || selectedTicketIds.length === 0}
          >
            {isSubmitting
              ? 'Listing...'
              : selectedTicketIds.length === 0
                ? 'Select a Ticket'
                : `List ${selectedTicketIds.length > 1 ? `${selectedTicketIds.length} Tickets` : 'Ticket'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (booking.tier === 'VIP' || booking.tier?.toUpperCase() === 'VIP' || booking.tier === 'VVIP' || booking.tier?.toUpperCase() === 'VVIP') {
    return (
      <div className="relative group my-4">
        {/* VIP-VVIP Ticket Container */}
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
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${booking.status === 'confirmed' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-zinc-800 text-zinc-300'
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 text-black items-center gap-1.5 uppercase tracking-widest shadow-lg shadow-amber-500/20">
                        {booking.tier || 'Standard'} Ticket
                      </span>
                      {booking.isResalePurchase && (
                        <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-orange-600 to-amber-600 text-white items-center gap-1.5 uppercase tracking-widest shadow-md">
                          <TagIcon className="w-3 h-3" />
                          Verified Resale Purchase
                        </span>
                      )}
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
                    <p className="font-bold text-amber-400 uppercase tracking-wider">{booking.tier || 'Standard'}</p>
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
                    <Button onClick={downloadTickets} variant="outline" className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 hover:border-zinc-600 cursor-pointer">
                      <DownloadIcon className="w-4 h-4" />
                      Download Ticket
                    </Button>
                    {hasUnlisted && (
                      <Button
                        onClick={openResaleDialog}
                        className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border-none shadow-md shadow-orange-600/20 cursor-pointer"
                      >
                        <TagIcon className="w-4 h-4" />
                        Resell {unlistedTickets.length > 1 ? `(${unlistedTickets.length}) Tickets` : 'Ticket'}
                      </Button>
                    )}
                    {listedTickets.map((t) => (
                      <Button
                        key={t.resaleListingId}
                        variant="outline"
                        disabled={cancellingId === t.resaleListingId}
                        onClick={() => t.resaleListingId && handleCancelResale(t.resaleListingId)}
                        className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider border-orange-400 text-orange-600 hover:bg-orange-50 cursor-pointer"
                      >
                        {cancellingId === t.resaleListingId ? 'Cancelling...' : `Cancel Resale (${t.ticketNumber.split('-').pop()})`}
                      </Button>
                    ))}
                  </>
                )}
                {status === 'pending' && (
                  <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Awaiting payment
                  </div>
                )}
                {status === 'used' && (
                  <Button disabled variant="outline" className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider border-zinc-800 text-zinc-500 bg-transparent cursor-pointer">
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
              {booking.isResalePurchase ? (
                <div className="mb-3">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/40">
                    Verified Resale QR
                  </span>
                </div>
              ) : null}
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 mb-4">Admit VIP {booking.quantity}</p>

              <div className="flex flex-col gap-3 items-center">
                {(tickets.length > 0 ? tickets : (booking.ticketTokens || []).map((tok, i) => ({
                  id: i,
                  ticketNumber: booking.ticketNumbers?.[i] || `Ticket ${i + 1}`,
                  verificationToken: tok || '',
                  status: 'VALID',
                  listedForResale: false,
                  resaleListingId: null,
                } as TicketItem))).map((ticket: TicketItem, index: number) => (
                  <div key={ticket.id} className="w-full">
                    {ticket.listedForResale ? (
                      <div className="bg-orange-950/60 border border-orange-500/40 rounded-2xl p-4 flex flex-col items-center gap-2">
                        <TagIcon className="w-8 h-8 text-orange-400" />
                        <p className="text-[10px] font-black text-orange-300 uppercase tracking-widest text-center">Listed for Resale</p>
                        <p className="text-[9px] text-orange-400/70 text-center">QR hidden while listed</p>
                        <p className="text-[9px] font-mono text-amber-500 mt-1">{ticket.ticketNumber}</p>
                      </div>
                    ) : ticket.verificationToken ? (
                      <div className="bg-white p-3 rounded-2xl shadow-xl border border-amber-500/20 hover:shadow-2xl transition-all duration-300">
                        <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/tickets/verify/${ticket.verificationToken}`} size={100} bgColor="#ffffff" fgColor="#000000" level="Q" includeMargin className="mx-auto" />
                        <p className="mt-1 text-[9px] font-bold text-zinc-600 text-center">Ticket {index + 1} · {ticket.ticketNumber}</p>
                        {booking.isResalePurchase && (
                          <p className="text-[8px] font-bold text-orange-600 text-center uppercase tracking-widest mt-0.5">Resale Scan QR</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-500 mt-4 animate-pulse">
                To be scanned at VIP entrance
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
              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md ${booking.status === 'confirmed' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {booking.isResalePurchase && (
                      <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200 items-center gap-1.5 uppercase tracking-widest shadow-sm">
                        <TagIcon className="w-3 h-3" />
                        Verified Resale Purchase
                      </span>
                    )}
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
                  <p className="font-bold text-foreground capitalize">{booking.tier || 'Standard'}</p>
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
                  <Button onClick={downloadTickets} variant="outline" className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer">
                    <DownloadIcon className="w-4 h-4" />
                    Download Tickets
                  </Button>
                  {hasUnlisted && (
                    <Button
                      onClick={openResaleDialog}
                      variant="secondary"
                      className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white border-none shadow-md shadow-orange-600/20 cursor-pointer"
                    >
                      <TagIcon className="w-4 h-4" />
                      Resell {unlistedTickets.length > 1 ? `(${unlistedTickets.length})` : 'Ticket'}
                    </Button>
                  )}
                  {listedTickets.map((t) => (
                    <Button
                      key={t.resaleListingId}
                      variant="outline"
                      disabled={cancellingId === t.resaleListingId}
                      onClick={() => t.resaleListingId && handleCancelResale(t.resaleListingId)}
                      className="gap-2 h-10 rounded-xl font-bold text-xs uppercase tracking-wider border-orange-400 text-orange-600 hover:bg-orange-50 cursor-pointer"
                    >
                      {cancellingId === t.resaleListingId ? 'Cancelling...' : `Cancel Resale (${t.ticketNumber.split('-').pop()})`}
                    </Button>
                  ))}
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
            {booking.isResalePurchase ? (
              <div className="mb-3">
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                  Verified Resale QR
                </span>
              </div>
            ) : null}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Admit {booking.quantity}</p>

            <div className="flex flex-col gap-3 items-center">
              {(tickets.length > 0 ? tickets : (booking.ticketTokens || []).map((tok, i) => ({
                id: i,
                ticketNumber: booking.ticketNumbers?.[i] || `Ticket ${i + 1}`,
                verificationToken: tok || '',
                status: 'VALID',
                listedForResale: false,
                resaleListingId: null,
              } as TicketItem))).map((ticket: TicketItem, index: number) => (
                <div key={ticket.id} className="w-full">
                  {ticket.listedForResale ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col items-center gap-2">
                      <TagIcon className="w-7 h-7 text-orange-500" />
                      <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest text-center">Listed for Resale</p>
                      <p className="text-[9px] text-orange-500 text-center">QR hidden while listed</p>
                      <p className="text-[9px] font-mono text-muted-foreground mt-1">{ticket.ticketNumber}</p>
                    </div>
                  ) : ticket.verificationToken ? (
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                      <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/tickets/verify/${ticket.verificationToken}`} size={100} bgColor="#ffffff" fgColor="#000000" level="Q" includeMargin className="mx-auto" />
                      <p className="mt-1 text-[9px] font-bold text-muted-foreground text-center">Ticket {index + 1} · {ticket.ticketNumber}</p>
                      {booking.isResalePurchase && (
                        <p className="text-[8px] font-bold text-orange-600 text-center uppercase tracking-widest mt-0.5">Resale Scan QR</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-4">
              To be scanned at the entrance.
            </p>
          </div>
        </div>
      </div>

      {resaleDialogModal}
    </div>
  );
}

/* Disabled bus-ticket card retained below for reference while bus ticketing is disabled.
   BUS TICKET CARD  —  boarding-pass style
═══════════════════════════════════════════════════════ */

// import type { Booking as BusBooking } from '@/lib/bus/types';

// function BusTicketCard({
//   booking,
// }: {
//   booking: any;
// }) {
//   const [expanded, setExpanded] = useState(false);

//   const fmt = (d: Date) =>
//     new Date(d).toLocaleString('en-MW', {
//       weekday: 'short',
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     });

//   const fmtTime = (d: Date) =>
//     new Date(d).toLocaleTimeString('en-MW', { hour: '2-digit', minute: '2-digit' });

//   const fmtDate = (d: Date) =>
//     new Date(d).toLocaleDateString('en-MW', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

//   const statusColor =
//     booking.status === 'confirmed'
//       ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
//       : booking.status === 'cancelled'
//       ? 'bg-red-500/15 text-red-700 border-red-500/30'
//       : 'bg-amber-500/15 text-amber-700 border-amber-500/30';

//   return (
//     <div className="relative group my-4">
//       {/* ── Outer shell ── */}
//       <div className="flex flex-col md:flex-row rounded-[24px] overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">

//         {/* ════ LEFT PANEL ════ */}
//         <div className="flex-1 relative">
//           {/* Gradient header band */}
//           <div className="h-2 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />

//           <div className="p-6">
//             {/* Top row: operator + status */}
//             <div className="flex items-start justify-between mb-5">
//               <div className="flex items-center gap-2">
//                 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow">
//                   <BusIcon className="w-5 h-5 text-white" />
//                 </div>
//                 <div>
//                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bus Ticket</p>
//                   <p className="text-sm font-black text-foreground leading-none">
//                     {booking.busModel ?? 'Coach Service'}
//                   </p>
//                 </div>
//               </div>
//               <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColor}`}>
//                 {booking.status}
//               </span>
//             </div>

//             {/* ── Route: origin → destination ── */}
//             <div className="flex items-center gap-3 mb-6">
//               <div className="text-center min-w-[80px]">
//                 <p className="text-2xl font-black text-foreground leading-none">
//                   {booking.origin?.slice(0, 3).toUpperCase() ?? 'ORG'}
//                 </p>
//                 <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate max-w-[90px]">
//                   {booking.origin ?? '—'}
//                 </p>
//               </div>

//               <div className="flex-1 flex flex-col items-center gap-1">
//                 <div className="flex items-center gap-1 w-full">
//                   <div className="h-px flex-1 bg-border" />
//                   <div className="w-2 h-2 rounded-full bg-teal-500" />
//                   <div className="h-px flex-1 border-t border-dashed border-border" />
//                   <ArrowRightIcon className="w-4 h-4 text-teal-500 shrink-0" />
//                   <div className="h-px flex-1 border-t border-dashed border-border" />
//                   <div className="w-2 h-2 rounded-full bg-indigo-500" />
//                   <div className="h-px flex-1 bg-border" />
//                 </div>
//                 {booking.distanceKm && (
//                   <p className="text-[10px] text-muted-foreground font-medium">{booking.distanceKm} km</p>
//                 )}
//               </div>

//               <div className="text-center min-w-[80px]">
//                 <p className="text-2xl font-black text-foreground leading-none">
//                   {booking.destination?.slice(0, 3).toUpperCase() ?? 'DST'}
//                 </p>
//                 <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate max-w-[90px]">
//                   {booking.destination ?? '—'}
//                 </p>
//               </div>
//             </div>

//             {/* ── Times grid ── */}
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
//               <div>
//                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Departure</p>
//                 <div className="flex items-center gap-1 text-foreground font-bold text-sm">
//                   <ClockIcon className="w-3.5 h-3.5 text-teal-500 shrink-0" />
//                   {booking.departureTime ? fmtTime(new Date(booking.departureTime)) : '—'}
//                 </div>
//                 <p className="text-[10px] text-muted-foreground mt-0.5">
//                   {booking.departureTime ? fmtDate(new Date(booking.departureTime)) : ''}
//                 </p>
//               </div>

//               <div>
//                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Arrival</p>
//                 <div className="flex items-center gap-1 text-foreground font-bold text-sm">
//                   <ClockIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
//                   {booking.arrivalTime ? fmtTime(new Date(booking.arrivalTime)) : '—'}
//                 </div>
//                 <p className="text-[10px] text-muted-foreground mt-0.5">
//                   {booking.arrivalTime ? fmtDate(new Date(booking.arrivalTime)) : ''}
//                 </p>
//               </div>

//               <div>
//                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Seat(s)</p>
//                 <div className="flex items-center gap-1 text-foreground font-bold text-sm">
//                   <ArmchairIcon className="w-3.5 h-3.5 text-teal-500 shrink-0" />
//                   {booking.seatNumbers?.join(', ') ?? `${booking.seats} seats`}
//                 </div>
//               </div>

//               <div>
//                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Fare</p>
//                 <p className="text-foreground font-black text-sm text-teal-600">
//                   MWK {booking.totalPrice.toLocaleString()}
//                 </p>
//               </div>
//             </div>

//             {/* ── Info pills ── */}
//             <div className="flex flex-wrap gap-2">
//               {booking.licensePlate && (
//                 <span className="flex items-center gap-1.5 bg-muted/60 border border-border/50 rounded-lg px-3 py-1 text-xs font-semibold text-foreground">
//                   🚌 {booking.licensePlate}
//                 </span>
//               )}
//               {booking.amenities?.map((a: string) => (
//                 <span key={a} className="bg-teal-500/10 border border-teal-500/20 text-teal-700 rounded-lg px-2.5 py-1 text-xs font-semibold">
//                   {a}
//                 </span>
//               ))}
//               {booking.tripStatus && (
//                 <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 rounded-lg px-2.5 py-1 text-xs font-semibold">
//                   {booking.tripStatus}
//                 </span>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* ════ PERFORATED DIVIDER ════ */}
//         <div className="hidden md:flex flex-col items-center justify-center relative bg-card border-l-2 border-dashed border-border/50 w-0">
//           <div className="absolute top-0 -mt-3 w-6 h-6 bg-background rounded-full border-b-2 border-border/40" />
//           <div className="absolute bottom-0 -mb-3 w-6 h-6 bg-background rounded-full border-t-2 border-border/40" />
//         </div>
//         <div className="md:hidden h-0 relative border-t-2 border-dashed border-border/50">
//           <div className="absolute left-0 -ml-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-r-2 border-border/40" />
//           <div className="absolute right-0 -mr-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-l-2 border-border/40" />
//         </div>

//         {/* ════ RIGHT STUB ════ */}
//         <div className="md:w-56 bg-gradient-to-b from-teal-500/5 to-indigo-500/5 p-6 flex flex-col items-center justify-center gap-4">
//           {/* QR Code */}
//           <div className="bg-white p-3 rounded-2xl shadow-sm border border-border/50">
//             <QRCodeSVG
//               value={`https://zosavuta.com/verify-bus/${booking.id}`}
//               size={100}
//               bgColor="#ffffff"
//               fgColor="#0f172a"
//               level="Q"
//               includeMargin={false}
//             />
//           </div>

//           {/* Reference */}
//           <div className="text-center">
//             <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Booking Ref</p>
//             <p className="font-mono font-black text-sm text-foreground bg-muted px-3 py-1 rounded-lg border border-border/50">
//               {booking.bookingReference ?? booking.id.split('-').pop()?.toUpperCase()}
//             </p>
//           </div>

//           <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-teal-600 text-center">
//             Show at boarding
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// } 
