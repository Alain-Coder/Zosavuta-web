'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPinIcon, CalendarIcon, ShieldCheckIcon, UsersIcon, ChevronLeftIcon, TagIcon, ArrowRightIcon, TrendingDownIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from 'lucide-react';
import type { Event } from '@/types/event';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [tier, setTier] = useState('Standard');
  const [resale, setResale] = useState<{ id: string; price: number; sellerId: string } | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const zoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.75));
  const resetZoom = () => setZoomScale(1);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          setEvent(null);
          return;
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setEvent(null);
          return;
        }
        const data = await res.json();
        if (data.success && data.event) {
          setEvent(data.event);
          const resaleResponse = await fetch(`/api/resale?eventId=${eventId}&status=available`);
          const resaleListings = (resaleResponse.ok && resaleResponse.headers.get('content-type')?.includes('application/json'))
            ? await resaleResponse.json()
            : [];
          setResale(resaleListings[0] ?? null);
        } else {
          setEvent(null);
        }
      } catch (error) {
        console.error('Error fetching event from API:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const handleBooking = () => {
    const queryParams = `?qty=${quantity}&tier=${tier}`;
    router.push(`/checkout/${eventId}${queryParams}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-center text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${months[monthIndex]} ${day}, ${year}`;
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Only show organizer-configured ticket types — no auto-calculation for missing tiers
  const ticketTypes = event.ticketTypes?.length
    ? event.ticketTypes
    : [{ name: 'Standard', price: Number(event.price || 0) || 3500 }];

  const selectedTicketType =
    ticketTypes.find((item) => item.name.toLowerCase() === tier.toLowerCase()) || ticketTypes[0];
  const unitPrice = Number(selectedTicketType.price);
  const totalPrice = unitPrice * quantity;

  return (
    <>

      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link href="/events" className="flex items-center gap-2 text-primary hover:text-primary/80 font-bold uppercase tracking-widest text-xs w-fit">
          <ChevronLeftIcon className="w-5 h-5" />
          Back to Events
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Image with Zoom Preview */}
            <div
              className="mb-8 rounded-2xl overflow-hidden h-96 bg-muted relative group cursor-pointer shadow-md border border-border/50"
              onClick={() => {
                setZoomScale(1);
                setIsLightboxOpen(true);
              }}
              title="Click to enlarge image"
            >
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-md text-white rounded-full p-3.5 shadow-2xl border border-white/20 transform scale-90 group-hover:scale-100 transition-all flex items-center gap-2 px-4">
                  <ZoomInIcon className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Click to Zoom</span>
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">{event.title}</h1>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-lg">{formatDate(event.date)} at {event.time}</span>
                </div>

                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-lg">{event.venue}</p>
                    <p className="text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {event.fullDescription || event.description}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-6">
                  <Card className="p-6">
                    <h3 className="font-bold mb-4">Event Details</h3>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-primary" />
                        <span>{event.ticketsAvailable} tickets available</span>
                      </li>
                      {event.seatingChart && (
                        <li className="flex items-center gap-2">
                          <ShieldCheckIcon className="w-4 h-4 text-primary" />
                          <span>Assigned seating available</span>
                        </li>
                      )}
                    </ul>
                  </Card>
                </TabsContent>

                <TabsContent value="terms" className="mt-6">
                  <Card className="p-6">
                    <h3 className="font-bold mb-4">Cancellation Policy</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All ticket sales are final and non-refundable. If you can no longer attend, you can safely resell your ticket to another fan through our <Link href="/marketplace" className="text-orange-600 font-bold hover:underline">Official Marketplace</Link>.
                    </p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div>
            <Card className="sticky top-20 p-6">
              {/* <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Price per ticket</p>
                <div className="text-4xl font-bold text-primary">
                  MWK {unitPrice.toLocaleString()}
                </div>
              </div> */}

              {/* Ticket Tier Selection */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-2 block">Ticket Tier</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ticketTypes.map((type) => (
                    <button
                      key={type.name}
                      type="button"
                      onClick={() => setTier(type.name)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${tier.toLowerCase() === type.name.toLowerCase()
                          ? 'border-primary bg-primary/10 font-bold text-primary ring-2 ring-primary/20 shadow-sm'
                          : 'border-border hover:bg-muted text-muted-foreground'
                        }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider">{type.name}</div>
                      <div className="text-sm font-extrabold">MWK {Number(type.price).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="mb-6">
                <Label htmlFor="quantity" className="text-sm font-medium mb-2 block">
                  Number of Tickets
                </Label>
                <div className="flex items-center gap-3 bg-muted rounded-lg p-2 w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 text-lg font-bold hover:bg-background rounded transition"
                  >
                    −
                  </button>
                  <span className="px-4 py-1 min-w-12 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="px-3 py-1 text-lg font-bold hover:bg-background rounded transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-muted p-4 rounded-lg mb-6">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">Subtotal ({quantity} ticket{quantity !== 1 ? 's' : ''})</span>
                  <span className="font-semibold">MWK {totalPrice.toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary text-lg">
                    MWK {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleBooking}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base h-12 font-semibold cursor-pointer"
              >
                Proceed to Checkout
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Secure payment powered by PayChangu
              </p>
            </Card>

            {/* Resale Section in Sidebar */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black uppercase tracking-tight text-sm">Verified Resales</h3>
                <Link href="/marketplace" className="text-[10px] font-bold text-orange-600 hover:underline uppercase tracking-widest">View All</Link>
              </div>

              <div className="space-y-3">
                {resale && (
                  <Card className="p-4 border-none shadow-sm bg-orange-50/50 hover:bg-orange-50 transition-colors group cursor-pointer border border-orange-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">Fan Listing</p>
                        <p className="text-sm font-bold group-hover:text-orange-600 transition-colors italic">MWK {resale.price.toLocaleString()}</p>
                      </div>
                      <Badge className="bg-orange-600 text-white border-none text-[8px] px-2">Great Deal</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-[10px] text-muted-foreground">Seller: {resale.sellerId}</p>
                      <Link href={`/checkout/${eventId}?resale=${resale.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest group-hover:bg-orange-600 group-hover:text-white">
                          Buy Resale
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )}

                <div className="bg-muted/50 rounded-2xl p-4 flex gap-3 border border-border/50">
                  <TrendingDownIcon className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Check the <Link href="/marketplace" className="text-orange-600 font-bold hover:underline">Marketplace</Link> for more fan-to-fan deals on this event.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Image Zoom Lightbox Modal */}
      <Dialog
        open={isLightboxOpen}
        onOpenChange={(open) => {
          setIsLightboxOpen(open);
          if (!open) setZoomScale(1);
        }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl bg-zinc-950 border-zinc-800 text-white shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{event.title} - Cover Preview</DialogTitle>
          </DialogHeader>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider truncate max-w-[200px] sm:max-w-xs">
                {event.title}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                ({Math.round(zoomScale * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={zoomOut}
                disabled={zoomScale <= 0.75}
                className="h-8 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOutIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetZoom}
                disabled={zoomScale === 1}
                className="h-8 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer text-xs font-semibold"
                title="Reset Zoom"
              >
                <RotateCcwIcon className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={zoomIn}
                disabled={zoomScale >= 3}
                className="h-8 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                title="Zoom In"
              >
                <ZoomInIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative overflow-auto max-h-[75vh] min-h-[300px] flex items-center justify-center p-4 bg-black select-none">
            <img
              src={event.image}
              alt={event.title}
              style={{
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.2s ease-out',
                transformOrigin: 'center center',
              }}
              className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}