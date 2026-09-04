'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, FilterIcon, TagIcon, ShieldCheckIcon, TrendingDownIcon, ArrowRightIcon } from 'lucide-react';
interface ResaleListing {
  id: string;
  eventId: string | number;
  eventTitle: string;
  eventDate: string;
  eventImage?: string;
  orderPrice: number;
  price: number;
  sellerId: string;
}

export default function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [resales, setResales] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResales = async () => {
      try {
        const response = await fetch('/api/resale?status=ACTIVE');
        setResales(response.ok ? await response.json() : []);
      } catch {
        setResales([]);
      } finally {
        setLoading(false);
      }
    };
    loadResales();
  }, []);

  const filteredResales = resales.filter((resale) =>
    resale.eventTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-orange-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-6 px-4 py-1">
              Official Marketplace
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-none">
              BUY & SELL <br />
              <span className="text-orange-200 italic">SECURELY.</span>
            </h1>
            <p className="text-lg text-orange-100 font-medium mb-8 max-w-xl">
              Missed out on tickets? Or can't make it to an event? Buy and sell tickets safely with Zosavuta's verified marketplace.
            </p>

            <div className="relative group max-w-xl">
              <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-2">
                <div className="flex-1 flex items-center px-4 gap-3">
                  <SearchIcon className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search resales for events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full py-3 bg-transparent outline-none text-foreground font-bold placeholder:text-muted-foreground/60"
                  />
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 h-12 rounded-xl font-black uppercase tracking-widest text-xs">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <p className="text-orange-600 font-black uppercase tracking-[0.2em] text-[10px] mb-2 text-center md:text-left">Fan to Fan</p>
              <h2 className="text-4xl font-black tracking-tighter uppercase text-center md:text-left">Available <span className="text-orange-600">Resales</span></h2>
            </div>
            <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-full px-4">
              <TrendingDownIcon className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold uppercase tracking-widest italic">{filteredResales.length} Great {filteredResales.length === 1 ? 'deal' : 'deals'} found.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {!loading && filteredResales.length > 0 ? (
              filteredResales.map((resale) => (
                <ResaleCard key={resale.id} resale={resale} />
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-border/50">
                <div className="text-6xl mb-6">🏜️</div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">No resales found</h3>
                <p className="text-muted-foreground">Try searching for a different event or check back later.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-12">Why buy on the Marketplace?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto text-orange-600">
                <ShieldCheckIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg uppercase tracking-tight">Verified Tickets</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Every resale ticket is verified by Zosavuta. Once sold, the original is invalidated and a new one issued.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto text-orange-600">
                <TagIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg uppercase tracking-tight">Fair Pricing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">We flag listings with a "Fair Price" badge if they are sold at or below the original face value.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto text-orange-600">
                <ArrowRightIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg uppercase tracking-tight">Instant Transfer</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Receive your digital tickets immediately after a successful payment. No waiting, no hassle.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResaleCard({ resale }: { resale: any }) {
  return (
    <div className="relative group transition-all duration-500 hover:-translate-y-2">
      {/* Ticket Container */}
      <div className="max-w-sm mx-auto bg-card rounded-[24px] shadow-lg border border-border/50 overflow-hidden flex flex-col hover:shadow-2xl group-hover:border-orange-500/30 transition-all">

        {/* Top Section: Artwork & Details */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={resale.eventImage || '/zosavuta.png'}
            alt={resale.eventTitle}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute top-4 left-4">
            {resale.price <= resale.orderPrice && (
              <Badge className="bg-green-600 hover:bg-green-700 text-white border-none font-bold uppercase tracking-widest text-[10px] px-3 py-1 shadow-md">
                Fair Price
              </Badge>
            )}
          </div>
          <div className="absolute top-4 right-4">
            <div className="bg-orange-600 text-white rounded-full p-1.5 px-3 flex items-center gap-1.5 shadow-md">
              <TagIcon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Resale</span>
            </div>
          </div>

          {/* Event Title over image */}
          <div className="absolute bottom-4 left-5 right-5 z-10">
            <p className="text-orange-400 font-bold tracking-[0.2em] text-[8px] uppercase mb-1">
              {resale.eventDate}
            </p>
            <h3 className="text-xl font-black tracking-tight leading-tight uppercase text-white drop-shadow-md">
              {resale.eventTitle}
            </h3>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 bg-card relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Seller</p>
          <div className="flex items-center gap-2 font-bold text-foreground mb-4">
            <ShieldCheckIcon className="w-4 h-4 text-green-600" />
            {resale.sellerId}
          </div>

          <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Original Price</span>
              <span className="text-xs font-bold text-muted-foreground line-through decoration-orange-600 decoration-2 italic">MWK {resale.orderPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asking Price</span>
              <span className="text-2xl font-black text-orange-600 tracking-tighter italic">MWK {resale.price.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Perforated Divider */}
        <div className="flex items-center justify-center relative bg-card">
          <div className="absolute left-0 -ml-3 w-6 h-6 bg-background rounded-full border-r border-border/50" />
          <div className="absolute right-0 -mr-3 w-6 h-6 bg-background rounded-full border-l border-border/50" />
          <div className="w-full border-t-2 border-dashed border-border/60 mx-6" />
        </div>

        {/* Bottom Stub: Action */}
        <div className="p-6 bg-muted/30 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Ticket ID: {resale.id}
          </p>
          <Link href={`/checkout/${resale.eventId}?resale=${resale.id}`}>
            <Button className="w-full bg-foreground text-background hover:bg-orange-600 hover:text-white transition-all duration-300 h-12 rounded-xl font-black uppercase tracking-widest text-xs group/btn shadow-lg">
              Buy Now
              <ArrowRightIcon className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
