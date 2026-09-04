'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  MapPinIcon,
  SearchIcon,
  TicketIcon,
  UsersIcon,
} from 'lucide-react';

interface Event {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  image: string;
  price: number;
  ticketsAvailable: number;
  ticketsTotal: number;
  status: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Events' },
  { value: 'music', label: 'Music' },
  { value: 'sports', label: 'Sports' },
  { value: 'conference', label: 'Conference' },
  { value: 'festival', label: 'Festival' },
  { value: 'workshop', label: 'Workshop' },
];

function EventsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== 'all') params.set('category', category);
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/events?${params.toString()}`);
        const data = res.ok ? await res.json() : [];
        setEvents(data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchEvents, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [category, search]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MW', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Discover Events</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Browse live events from organizers across Malawi
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events, cities, venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-background"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium min-w-[160px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <Card className="p-16 text-center border-2 border-dashed">
            <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No events found</h3>
            <p className="text-muted-foreground">
              {search ? 'Try a different search term.' : 'Check back soon for new events.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="group">
                <Card className="overflow-hidden h-full border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                  <div className="relative h-44 bg-muted overflow-hidden">
                    <img
                      src={event.image || '/zosavuta.png'}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-background/90 text-foreground capitalize">
                      {event.category}
                    </span>
                    {event.ticketsAvailable <= 0 && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-destructive text-destructive-foreground">
                        Sold Out
                      </span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{formatDate(event.date)} · {event.time?.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{event.venue}, {event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{event.ticketsAvailable} tickets left</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="font-black text-primary">
                        MWK {Number(event.price).toLocaleString()}
                      </span>
                      <Button size="sm" className="rounded-lg" variant={event.ticketsAvailable > 0 ? 'default' : 'outline'}>
                        {event.ticketsAvailable > 0 ? 'Get Tickets' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
