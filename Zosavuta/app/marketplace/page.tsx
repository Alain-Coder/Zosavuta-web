'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  MapPinIcon,
  SearchIcon,
  TagIcon,
  TicketIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { toast } from 'sonner';

interface ResaleListing {
  id: string;
  orderId: string;
  eventId: number;
  sellerId: string;
  price: number;
  originalPrice: number;
  status: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventVenue: string;
  eventImage: string;
  quantity: number;
  tier: string;
  createdAt: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resale?status=available');
      const data = res.ok ? await res.json() : [];
      setListings(data);
    } catch {
      setListings([]);
      toast.error('Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const filtered = listings.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.eventTitle?.toLowerCase().includes(q) ||
      l.eventLocation?.toLowerCase().includes(q) ||
      l.eventVenue?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MW', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleBuy = async (listing: ResaleListing) => {
    if (!user) {
      router.push(`/auth?redirect=/marketplace`);
      return;
    }
    if (listing.sellerId === user.uid) {
      toast.error('You cannot buy your own listing');
      return;
    }

    setBuyingId(listing.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/resale/${listing.id}`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purchase failed');

      toast.success('Ticket purchased! Check My Tickets for your QR code.');
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBuyingId(null);
    }
  };

  const savings = (listing: ResaleListing) => {
    const diff = Number(listing.originalPrice) - Number(listing.price);
    return diff > 0 ? diff : 0;
  };

  return (
    <>
      <div className="bg-gradient-to-br from-orange-500/5 via-background to-primary/5 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest mb-2">
                <TagIcon className="w-4 h-4" />
                Resale Marketplace
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Buy Resale Tickets</h1>
              <p className="text-muted-foreground mt-2">
                Secure peer-to-peer ticket resales from verified Zosavuta bookings
              </p>
            </div>
            {user && (
              <Link href="/my-bookings">
                <Button variant="outline" className="rounded-xl">
                  List Your Ticket
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resale listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-background"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading || authLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center border-2 border-dashed">
            <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No resale tickets available</h3>
            <p className="text-muted-foreground mb-6">
              When users list tickets for resale, they will appear here.
            </p>
            <Link href="/events">
              <Button>Browse Live Events</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing) => (
              <Card key={listing.id} className="overflow-hidden border-border/60 hover:shadow-lg transition-shadow">
                <div className="relative h-40 bg-muted">
                  <img
                    src={listing.eventImage || '/zosavuta.png'}
                    alt={listing.eventTitle}
                    className="w-full h-full object-cover"
                  />
                  {savings(listing) > 0 && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-600 text-white">
                      <TrendingDownIcon className="w-3 h-3" />
                      Save MWK {savings(listing).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2">{listing.eventTitle}</h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      {formatDate(listing.eventDate)} · {listing.eventTime?.slice(0, 5)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate">{listing.eventVenue}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{listing.tier || 'Regular'} · Qty {listing.quantity}</span>
                    <span className="text-xs text-muted-foreground line-through">
                      MWK {Number(listing.originalPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="font-black text-lg text-orange-600">
                      MWK {Number(listing.price).toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      className="rounded-lg bg-orange-600 hover:bg-orange-700"
                      disabled={buyingId === listing.id || listing.sellerId === user?.uid}
                      onClick={() => handleBuy(listing)}
                    >
                      {buyingId === listing.id ? 'Processing...' : listing.sellerId === user?.uid ? 'Your Listing' : 'Buy Ticket'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
