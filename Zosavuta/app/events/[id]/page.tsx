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
import { MapPinIcon, CalendarIcon, BusIcon, ShieldCheckIcon, UsersIcon, ChevronLeftIcon, TagIcon, ArrowRightIcon, TrendingDownIcon } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface Event {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  image: string;
  category: string;
  ticketsAvailable: number;
  price: number;
  organizer: string;
  busTransport: boolean;
  seatingChart: boolean;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [tier, setTier] = useState<'Regular' | 'VIP'>('Regular');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data as Event);
        } else {
          setEvent(null);
        }
      } catch (error: any) {
        console.error('Failed to fetch event:', eventId);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleBooking = () => {
    const queryParams = `?qty=${quantity}&tier=${tier}&transport=${selectedBus}`;
    if (!auth.currentUser) {
      router.push(`/auth?redirect=${encodeURIComponent(`/checkout/${eventId}${queryParams}`)}`);
    } else {
      router.push(`/checkout/${eventId}${queryParams}`);
    }
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

  const unitPrice = tier === 'VIP' ? event.price * 2 : event.price;
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
            {/* Event Image */}
            <div className="mb-8 rounded-lg overflow-hidden h-96 bg-muted">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
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
                      {event.busTransport && (
                        <li className="flex items-center gap-2">
                          <BusIcon className="w-4 h-4 text-primary" />
                          <span>Bus transport available</span>
                        </li>
                      )}
                    </ul>
                  </Card>
                </TabsContent>

                <TabsContent value="terms" className="mt-6">
                  <Card className="p-6">
                    <h3 className="font-bold mb-4">Cancellation Policy</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      All ticket sales are final and non-refundable. If you can no longer attend, please contact support for assistance.
                    </p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div>
            <Card className="sticky top-20 p-6">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Price per ticket</p>
                <div className="text-4xl font-bold text-primary">
                  MWK {unitPrice.toLocaleString()}
                </div>
              </div>

              {/* Ticket Tier Selection */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-2 block">Ticket Tier</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTier('Regular')}
                    className={`p-3 rounded-xl border text-left transition ${tier === 'Regular' ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-border hover:bg-muted text-muted-foreground'}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">Regular</div>
                    <div className="text-sm font-extrabold">MWK {event.price.toLocaleString()}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier('VIP')}
                    className={`p-3 rounded-xl border text-left transition ${tier === 'VIP' ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-600 shadow-md shadow-amber-500/10' : 'border-border hover:bg-muted text-muted-foreground'}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">👑 VIP Pass</div>
                    <div className="text-sm font-extrabold">MWK {(event.price * 2).toLocaleString()}</div>
                  </button>
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

              {/* Bus Transport Selection */}
              {event.busTransport && (
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Transport</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted transition">
                      <input
                        type="radio"
                        name="transport"
                        value="none"
                        checked={selectedBus === '' || selectedBus === 'none'}
                        onChange={(e) => setSelectedBus(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No transport</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted transition">
                      <input
                        type="radio"
                        name="transport"
                        value="round-trip"
                        onChange={(e) => setSelectedBus(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-muted-foreground">Round trip (+MWK 1,500)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              <div className="bg-muted p-4 rounded-lg mb-6">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">Subtotal ({quantity} ticket{quantity !== 1 ? 's' : ''})</span>
                  <span className="font-semibold">MWK {totalPrice.toLocaleString()}</span>
                </div>
                {selectedBus === 'round-trip' && (
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Transport</span>
                    <span className="font-semibold">MWK {(1500 * quantity).toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary text-lg">
                    MWK {(totalPrice + (selectedBus === 'round-trip' ? 1500 * quantity : 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleBooking}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base h-12 font-semibold"
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
              </div>
              
              <div className="space-y-3">
                <Card className="p-4 border-none shadow-sm bg-orange-50/50 hover:bg-orange-50 transition-colors group cursor-pointer border border-orange-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">Fan Listing</p>
                      <p className="text-sm font-bold group-hover:text-orange-600 transition-colors italic">MWK {(event.price * 0.85).toLocaleString()}</p>
                    </div>
                    <Badge className="bg-orange-600 text-white border-none text-[8px] px-2">Great Deal</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[10px] text-muted-foreground">Seller: Kondwani M.</p>
                    <Link href={`/checkout/${eventId}?resale=RS-MOCK`}>
                      <Button size="sm" variant="ghost" className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest group-hover:bg-orange-600 group-hover:text-white">
                        Buy Resale
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
