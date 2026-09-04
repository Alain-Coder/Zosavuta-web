'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketIcon, MapPinIcon, ShieldCheckIcon, PlusIcon, SearchIcon, FilterIcon, CalendarIcon, Sparkles } from 'lucide-react';
import EventCard from '@/components/event-card';
import CategoryChips from '@/components/category-chips';
import { Event } from '@/lib/db';

const DASHBOARD_URL = 'https://dashboard.zosavuta.com';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('upcoming');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/events');
        if (!res.ok) {
          console.error(`API /api/events returned HTTP status ${res.status}`);
          setEvents([]);
          setFilteredEvents([]);
          return;
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('API /api/events response is not JSON');
          setEvents([]);
          setFilteredEvents([]);
          return;
        }
        const data = await res.json();

        if (data.success && Array.isArray(data.events)) {
          setEvents(data.events);
          setFilteredEvents(data.events);
        } else {
          setEvents([]);
          setFilteredEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events from API:', error);
        setEvents([]);
        setFilteredEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter((event) =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((event) => event.category === categoryFilter);
    }

    if (sortBy === 'upcoming') {
      filtered = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === 'price-low') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, categoryFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const featuredEvents = filteredEvents.slice(0, 3);
  const remainingEvents = filteredEvents.slice(3);

  return (
    <>
      {/* 1. Explore Hero Section */}
      <section className="relative h-[500px] flex items-center overflow-hidden bg-foreground">
        {/* Background Pattern/Overlay */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/80 to-transparent" />
          {featuredEvents[0] && (
            <Image
              src={featuredEvents[0].image}
              alt="Hero Background"
              fill
              className="object-cover blur-sm scale-105"
              sizes="100vw"
              priority
            />
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-[0.9] tracking-tighter">
              DISCOVER <br />
              <span className="text-primary italic">MEMORIES.</span>
            </h1>
            <p className="text-lg text-white/70 font-medium mb-10 max-w-lg leading-relaxed">
              From the biggest festivals to the most intimate workshops. Find your next experience on Zosavuta.
            </p>

            {/* Prominent Search Bar */}
            <div className="relative group max-w-xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-foreground rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center bg-white rounded-xl shadow-2xl p-2">
                <div className="flex-1 flex items-center px-4 gap-3 border-r border-border">
                  <SearchIcon className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search events, venues, or cities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full py-3 bg-transparent outline-none text-foreground font-bold placeholder:text-muted-foreground/60 placeholder:font-medium"
                  />
                </div>
                <Button className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 rounded-lg font-black uppercase tracking-widest text-xs ml-2">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Navigation */}
      <section id="explore" className="sticky top-[72px] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CategoryChips
              selectedCategory={categoryFilter}
              onSelectCategory={setCategoryFilter}
            />

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
                <FilterIcon className="w-4 h-4 text-primary" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="border-none bg-transparent h-auto p-0 focus:ring-0 w-[140px] text-xs font-bold uppercase tracking-wider">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Events Grid */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Curating Events...</p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-24 text-center bg-card rounded-3xl border-2 border-dashed border-border/50">
              <div className="text-6xl mb-6">🎫</div>
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">No events matching your vibe</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">Try adjusting your filters or search terms to discover more.</p>
              <Button
                variant="outline"
                onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                className="mt-8 rounded-full px-8 border-primary text-primary font-bold hover:bg-primary/5"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="space-y-20">
              {/* Featured Section */}
              {categoryFilter === 'all' && !searchTerm && featuredEvents.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-2">Editor's Choice</p>
                      <h2 className="text-4xl font-black tracking-tighter uppercase">Featured <span className="text-primary">Events</span></h2>
                    </div>
                    <div className="hidden md:flex gap-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Top picks for you</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {featuredEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <EventCard event={event} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* All Events Section */}
              <div className="space-y-8">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                      {categoryFilter === 'all' ? 'Discover More' : `${categoryFilter} Events`}
                    </p>
                    <h2 className="text-4xl font-black tracking-tighter uppercase">
                      {categoryFilter === 'all' ? 'Upcoming ' : ''}
                      <span className="text-primary">{categoryFilter === 'all' ? 'All' : categoryFilter}</span> Events
                    </h2>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:block">
                    {filteredEvents.length} events found
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {remainingEvents.length > 0 ? (
                    remainingEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <EventCard event={event} />
                      </Link>
                    ))
                  ) : (
                    // If no remaining events but featured exists, and we are not in featured mode
                    (categoryFilter !== 'all' || searchTerm) && filteredEvents.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <EventCard event={event} />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Dual Hero / Onboarding Paths */}
      <section className="relative overflow-hidden bg-background py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight text-balance">
              Experience Events <span className="text-primary italic">Simplified.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Whether you're looking for the next big music festival or planning your own summit, we've got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* Attendee Path */}
            <Card className="group relative overflow-hidden p-8 border-2 border-primary/10 hover:border-primary/40 transition-all duration-300 bg-gradient-to-br from-card to-primary/5">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <TicketIcon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-4">I want to attend</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Browse thousands of events, secure your tickets, and even book your transport all in one place.
                </p>
                <Link href="#explore">
                  <Button size="lg" className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Discover Events
                  </Button>
                </Link>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            </Card>

            {/* Organizer Path */}
            <Card className="group relative overflow-hidden p-8 border-2 border-secondary/10 hover:border-secondary/40 transition-all duration-300 bg-gradient-to-br from-card to-secondary/5">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <PlusIcon className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-3xl font-bold mb-4">I want to organize</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Reach a wider audience, manage ticket sales, and track analytics with our powerful dashboard.
                </p>
                <Link href="/organizer">
                  <Button size="lg" variant="secondary" className="w-full text-lg h-14 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    Create Event
                  </Button>
                </Link>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-colors" />
            </Card>
          </div>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-secondary/5 rounded-full blur-[100px]" />
      </section>

      {/* 5. Features Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance">
            Why Choose Zosavuta?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<TicketIcon className="w-8 h-8" />}
              title="Easy Ticketing"
              description="Browse and book tickets for your favorite events in seconds"
            />
            <FeatureCard
              icon={<MapPinIcon className="w-8 h-8" />}
              title="Find Events Nearby"
              description="Discover events happening in your area with our location-based search"
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-8 h-8" />}
              title="Secure Payments"
              description="Your transactions are protected with our secure payment gateway"
            />
          </div>
        </div>
      </section>

      {/* 6. Newsletter / CTA Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden bg-primary rounded-[2rem] border border-white/10 shadow-2xl p-8 md:p-16 group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-5 w-10 h-10 rounded-full bg-background shadow-lg" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-5 w-10 h-10 rounded-full bg-background shadow-lg" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-r border-dashed border-white/20" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-md text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight tracking-tighter uppercase">Don't miss the <span className="text-foreground italic">Moment.</span></h2>
                <p className="text-primary-foreground/80 font-medium mb-6">Get the best events in Malawi delivered straight to your inbox, or sign up today to create your own events.</p>
                <Link href="/auth">
                  <Button variant="secondary" className="h-12 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-black uppercase tracking-widest text-xs">
                    Join Zosavuta Free
                  </Button>
                </Link>
              </div>
              <div className="flex w-full md:w-auto items-center gap-3">
                <div className="flex-1 md:w-80">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full h-14 bg-white/10 border border-white/20 rounded-2xl px-6 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <Button className="h-14 px-8 bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-xs">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow bg-card">
      <div className="text-accent mb-4">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
