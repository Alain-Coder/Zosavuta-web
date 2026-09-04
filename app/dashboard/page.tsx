'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  TicketIcon,
  CalendarIcon,
  MapPinIcon,
  QrCodeIcon,
  ChevronRightIcon,
  StarIcon,
  ClockIcon,
  BellIcon,
  TrophyIcon,
  StoreIcon,
  TagIcon,
} from 'lucide-react';
// import { getBookingsByUser as getBusBookingsByUser } from '@/lib/bus/api';
import { useAuth } from '@/hooks/use-auth';
import { calculateTotalPoints } from '@/lib/legacy-points';
import { canOrganize, isAdmin, UserRole } from '@/lib/roles';
import { toast } from 'sonner';
import SellerFinancePanel from '@/components/seller-finance-panel';

interface Booking {
  id: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventVenue?: string;
  eventImage: string;
  status: string;
  quantity: number;
  totalAmount: number;
  tier?: string;
  busTransport?: boolean;
  createdAt?: Date;
}

interface FeaturedEvent {
  id: number;
  title: string;
  date: string;
  location: string;
  image: string;
  price: number;
  ticketsAvailable: number;
  category: string;
}

interface NotificationItem {
  id: string;
  icon: 'ticket' | 'bus' | 'points';
  title: string;
  time: string;
}

export default function AttendeeDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Member');
  const [userRole, setUserRole] = useState<UserRole | 'operator' | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState({
    totalTickets: 0,
    upcomingEvents: 0,
    legacyPoints: 0,
  });

  const formatShortDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[monthIndex]} ${day}`;
    }
    return dateString;
  };

  const relativeTime = (date?: Date | string) => {
    if (!date) return 'Recently';
    const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setUserName(user.displayName?.split(' ')[0] || 'Member');

        const [ordersRes, eventsRes, pointsRes] = await Promise.all([
          fetch(`/api/orders?userId=${user.uid}`),
          fetch('/api/events'),
          fetch(`/api/points?userId=${user.uid}`),
        ]);

        const rawOrders = ordersRes.ok ? await ordersRes.json() : [];
        const bookingsData: Booking[] = Array.isArray(rawOrders)
          ? rawOrders
          : rawOrders?.orders || rawOrders?.data || [];

        const rawEvents = eventsRes.ok ? await eventsRes.json() : [];
        const eventsData: FeaturedEvent[] = Array.isArray(rawEvents)
          ? rawEvents
          : rawEvents?.events || rawEvents?.data || [];

        const pointsData = pointsRes.ok ? await pointsRes.json() : { totalPoints: 0 };

        //         interface BusBooking {
        //   id: string;
        //   tripId?: string;
        //   destination?: string;
        //   status?: string;
        //   seats?: number;
        //   totalPrice?: number;
        //   createdAt?: Date;
        // }

        // let busBookings: BusBooking[] = [];
        // try {
        //   busBookings = await getBusBookingsByUser(user.uid) as BusBooking[];
        // } catch {
        //   // non-critical
        // }

        //         const normalizedBusBookings: Booking[] = busBookings.map((b) => ({
        //           id: String(b.id),
        //           eventTitle: `Bus: ${b.tripId ?? 'Trip'}`,
        //           eventDate: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        //           eventTime: '',
        //           eventLocation: String(b.destination ?? ''),
        //           eventImage: '/zosavuta.png',
        //           status: String(b.status ?? 'confirmed'),
        //           quantity: Number(b.seats ?? 1),
        //           totalAmount: Number(b.totalPrice ?? 0),
        //           busTransport: true,
        //           createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
        //         }));

        //         const combined = [...bookingsData, ...normalizedBusBookings];
        const combined = bookingsData;
        const confirmed = combined.filter((b) => b.status === 'confirmed');

        setUpcomingBookings(confirmed.slice(0, 3));
        setFeaturedEvents(eventsData.filter((e) => e.ticketsAvailable > 0).slice(0, 3));

        const notifs: NotificationItem[] = [];
        for (const b of bookingsData.filter((x) => x.status === 'confirmed').slice(0, 3)) {
          notifs.push({
            id: `ticket-${b.id}`,
            icon: 'ticket',
            title: `Your ticket for ${b.eventTitle} is confirmed.`,
            time: relativeTime(b.createdAt),
          });
        }
        // for (const b of normalizedBusBookings.slice(0, 2)) {
        //   notifs.push({
        //     id: `bus-${b.id}`,
        //     icon: 'bus',
        //     title: `Bus booking ${b.id.slice(-6).toUpperCase()} is confirmed.`,
        //     time: relativeTime(b.createdAt),
        //   });
        // }
        const pts = calculateTotalPoints(
          bookingsData.map((b, i) => ({
            totalAmount: b.totalAmount ?? 0,
            tier: b.tier,
            busTransport: b.busTransport,
            isFirstBooking: i === 0,
          }))
        );
        if (pts > 0) {
          notifs.push({
            id: 'points',
            icon: 'points',
            title: `You have ${pts.toLocaleString()} Legacy Points available.`,
            time: 'Updated today',
          });
        }
        setNotifications(notifs.slice(0, 5));

        const totalTicketsCount = combined.reduce((acc, cur) => acc + (cur.quantity ?? 1), 0);
        setStats({
          totalTickets: totalTicketsCount,
          upcomingEvents: confirmed.length,
          legacyPoints: pointsData.totalPoints ?? pts,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserRole = async () => {
      try {
        const res = await fetch(`/api/users/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          const role = data.role ?? 'customer';
          if (isAdmin(role)) {
            router.replace('/admin');
            return;
          }
          setUserRole(role);
        } else {
          setUserRole('customer');
        }
      } catch {
        setUserRole('customer');
      }
    };

    fetchDashboardData();
    fetchUserRole();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Muli bwanji, {userName}!</h1>
          <p className="text-muted-foreground text-lg">
            {stats.upcomingEvents > 0
              ? `You have ${stats.upcomingEvents} upcoming ticket${stats.upcomingEvents > 1 ? 's' : ''}.`
              : 'Discover events and book your next experience.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canOrganize(userRole) && (
            <>
              <Link href="/organizer/dashboard">
                <Button variant="outline" className="h-12 px-6">Organizer Dashboard</Button>
              </Link>
              <Link href="/organizer">
                <Button variant="outline" className="h-12 px-6">Create Event</Button>
              </Link>
            </>
          )}
          {/* Operator Dashboard Link */}
          {userRole === 'operator' && (
            <Link href="/operator/dashboard">
              <Button variant="default" className="h-12 px-6 ml-2 bg-teal-600 hover:bg-teal-700">
                Operator Dashboard
              </Button>
            </Link>
          )}
          <Link href="/events">
            <Button className="bg-primary hover:bg-primary/90 gap-2 h-12 px-6">
              <TicketIcon className="w-5 h-5" />
              Browse Events
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Card className="bg-primary/5 border-none shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Upcoming</p>
              <h3 className="text-2xl font-bold">{stats.upcomingEvents}</h3>
            </div>
          </CardContent>
        </Card>

        <Link href="/legacy-points" className="block">
          <Card className="bg-secondary/5 border-none shadow-none hover:shadow-md transition-shadow cursor-pointer group h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <TrophyIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground font-medium">Legacy Points</p>
                <h3 className="text-2xl font-bold">{stats.legacyPoints.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-accent/5 border-none shadow-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent-foreground">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Tickets</p>
              <h3 className="text-2xl font-bold">{stats.totalTickets}</h3>
            </div>
          </CardContent>
        </Card>

        <Link href="/marketplace" className="block">
          <Card className="bg-orange-500/5 border-none shadow-none hover:shadow-md transition-shadow cursor-pointer group h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <StoreIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Marketplace</p>
                <h3 className="text-sm font-bold text-orange-600">Resale tickets →</h3>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mb-12"><SellerFinancePanel /></div>

      {featuredEvents.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Featured Events</h2>
            <Link href="/events" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              View all <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {featuredEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="overflow-hidden hover:border-primary/30 hover:shadow-md transition-all h-full">
                  <div className="h-32 bg-muted overflow-hidden">
                    <img src={event.image || '/zosavuta.png'} alt={event.title} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <p className="font-bold line-clamp-1">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatShortDate(event.date)} · {event.location}</p>
                    <p className="text-sm font-bold text-primary mt-2">MWK {Number(event.price).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold tracking-tight">Your Upcoming Tickets</h2>
            <Link href="/my-bookings" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              View All <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed">
              <TicketIcon className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No tickets yet</h3>
              <p className="text-muted-foreground mb-6">Browse events and book your first ticket.</p>
              <Link href="/events">
                <Button>Browse Events</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="group transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex flex-col sm:flex-row bg-card rounded-[20px] shadow-sm border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all">
                    <div className="flex-1 flex flex-row p-4 gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                        <img src={booking.eventImage || '/zosavuta.png'} alt={booking.eventTitle} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-center overflow-hidden min-w-0">
                        <h3 className="font-bold text-lg leading-tight mb-1 truncate">{booking.eventTitle}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 shrink-0">
                            <CalendarIcon className="w-3 h-3 text-primary" />
                            {formatShortDate(booking.eventDate)}
                          </span>
                          {booking.eventLocation && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPinIcon className="w-3 h-3 text-primary" />
                              {booking.eventLocation.split(',')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="sm:w-28 bg-muted/30 p-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-dashed border-border/60">
                      <Link href="/my-bookings">
                        <Button size="icon" className="rounded-xl w-10 h-10 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground">
                          <QrCodeIcon className="w-5 h-5" />
                        </Button>
                      </Link>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-2">View Ticket</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Activity</h2>
            <Card className="border-none shadow-sm">
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No recent activity</p>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      className={`p-4 flex gap-4 ${i < notifications.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.icon === 'ticket' ? 'bg-primary/10 text-primary' :
                        n.icon === 'bus' ? 'bg-blue-100 text-blue-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                        {n.icon === 'points' ? <StarIcon className="w-5 h-5" /> :
                          n.icon === 'bus' ? <TagIcon className="w-5 h-5" /> :
                            <BellIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Link href="/my-bookings">
            <Card className="border border-orange-200 bg-orange-50/50 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <StoreIcon className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="font-bold">Resell a ticket?</p>
                    <p className="text-sm text-muted-foreground">List on the marketplace from My Tickets.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Promotions — disabled for now
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Promotions</h2>
            <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground border-none shadow-lg overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">Early Bird Special!</h3>
                  <p className="text-sm text-secondary-foreground/80 mb-4">Get 20% off all tech events this month with code TECH20.</p>
                  <Link href="/events?category=conference">
                    <Button className="bg-white text-secondary hover:bg-white/90 font-bold w-full">Claim Discount</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          */}
        </div>
      </div>
    </main>
  );
}
