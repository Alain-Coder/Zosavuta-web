'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  PlusIcon,
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  ClockIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  SearchIcon,
  EyeIcon,
  UserIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { canOrganize, isAdmin } from '@/lib/roles';
import { toast } from 'sonner';

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  image: string;
  price: number;
  ticketsTotal: number;
  ticketsAvailable: number;
  status: 'active' | 'draft' | 'sold_out' | 'cancelled';
}

interface SubmissionItem {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  category: string;
  price: number | null;
  ticketsTotal: number | null;
  status: 'pending' | 'approved' | 'rejected';
  ticketDetailsSubmitted: number;
  rejectionReason?: string;
  createdAt: string;
}

interface EventOrder {
  id: string;
  eventId: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  totalPrice: number;
  status: string;
  ticketNumbers: string[];
  createdAt: string;
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

  // Selected Event Dialog State
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [eventOrders, setEventOrders] = useState<EventOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/organizer/events');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const roleRes = await fetch(`/api/users/${user.uid}`);
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          if (isAdmin(roleData.role)) {
            router.push('/admin');
            return;
          }
          if (!canOrganize(roleData.role)) {
            router.push('/dashboard');
            return;
          }
        }

        const headers = await getAuthHeaders();
        const [eventsRes, submissionsRes] = await Promise.all([
          fetch(`/api/events?organizerId=${user.uid}&status=all`),
          fetch('/api/event-submissions', { headers }),
        ]);

        const rawEvents = eventsRes.ok ? await eventsRes.json() : [];
        const eventsData: EventItem[] = Array.isArray(rawEvents)
          ? rawEvents
          : rawEvents?.events || rawEvents?.data || [];

        const rawSubmissions = submissionsRes.ok ? await submissionsRes.json() : [];
        const submissionsData: SubmissionItem[] = Array.isArray(rawSubmissions)
          ? rawSubmissions
          : rawSubmissions?.submissions || rawSubmissions?.data || [];

        setEvents(eventsData);
        setSubmissions(submissionsData);
      } catch (err) {
        console.error('Error fetching organizer events:', err);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  // Fetch ticket details & orders for an event when clicked
  const handleOpenEventDetails = async (event: EventItem) => {
    setSelectedEvent(event);
    setOrdersLoading(true);
    setSearchQuery('');
    try {
      const res = await fetch(`/api/orders?eventId=${event.id}`);
      if (res.ok) {
        const data = await res.json();
        setEventOrders(Array.isArray(data) ? data : []);
      } else {
        setEventOrders([]);
      }
    } catch {
      setEventOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading your events...</p>
        </div>
      </div>
    );
  }

  const activeEventsCount = events.filter((e) => e.status === 'active').length;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'pending').length;

  const filteredOrders = eventOrders.filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(q) ||
      order.customerEmail?.toLowerCase().includes(q) ||
      order.ticketNumbers?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">My Events</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your published events, monitor ticket inventory, and view detailed ticket breakdown per event.
          </p>
        </div>
        <Link href="/organizer">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11 rounded-xl cursor-pointer">
            <PlusIcon className="w-5 h-5" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Created Events</p>
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-black text-foreground mt-2">{events.length}</p>
        </Card>

        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Published Events</p>
            <CheckCircle2Icon className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-600 mt-2">{activeEventsCount}</p>
        </Card>

        <Card className="p-5 border border-border bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
            <ClockIcon className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500 mt-2">{pendingSubmissionsCount}</p>
        </Card>
      </div>

      {/* Events & Submissions Tabs */}
      <Tabs defaultValue="published" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="published" className="rounded-lg font-bold text-xs uppercase tracking-wider">
            Published Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-lg font-bold text-xs uppercase tracking-wider">
            Submissions & Approvals ({submissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Published Events Tab */}
        <TabsContent value="published" className="space-y-4">
          {events.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground">No Published Events Yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 mb-6">
                Create an event to start selling tickets and reaching attendees.
              </p>
              <Link href="/organizer">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl">
                  Create First Event
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event) => {
                const sold = event.ticketsTotal - event.ticketsAvailable;
                const percentSold = event.ticketsTotal > 0 ? Math.round((sold / event.ticketsTotal) * 100) : 0;
                const eventImgUrl = event.image && event.image.trim() !== '' ? event.image : '/images/hero-bg.jpg';

                return (
                  <Card
                    key={event.id}
                    className="overflow-hidden border border-border bg-card flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleOpenEventDetails(event)}
                  >
                    <div>
                      {/* Event Cover Photo Display */}
                      <div className="relative h-48 w-full bg-muted overflow-hidden">
                        <img
                          src={eventImgUrl}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/hero-bg.jpg';
                          }}
                        />
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <Badge className={
                            event.status === 'active' ? 'bg-green-600 text-white font-bold' :
                              event.status === 'sold_out' ? 'bg-amber-600 text-white font-bold' : 'bg-muted text-muted-foreground font-bold'
                          }>
                            {event.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30">
                            {event.category || 'Event'}
                          </Badge>
                        </div>

                        <h3 className="text-xl font-black text-foreground leading-snug group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            {event.date} at {event.time}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <MapPinIcon className="w-4 h-4 text-primary" />
                            {event.venue}, {event.location}
                          </span>
                        </div>

                        {/* Tickets Sales Progress Bar */}
                        <div className="pt-2 space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <TicketIcon className="w-3.5 h-3.5 text-primary" /> Ticket Sales
                            </span>
                            <span className="text-foreground">{sold} / {event.ticketsTotal} ({percentSold}%)</span>
                          </div>
                          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${percentSold}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center justify-between border-t border-border/40 mt-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ticket Price</span>
                        <span className="text-lg font-black text-primary">MWK {Number(event.price).toLocaleString()}</span>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl font-bold text-xs uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground gap-1.5 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEventDetails(event);
                        }}
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Ticket Details →
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          {submissions.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <ClockIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground">No Event Submissions Found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 mb-6">
                When you create an event, your submission and approval status will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card key={sub.id} className="p-5 border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-foreground">{sub.title}</h4>
                      <Badge className={
                        sub.status === 'approved' ? 'bg-green-600 text-white font-bold' :
                          sub.status === 'rejected' ? 'bg-red-600 text-white font-bold' : 'bg-amber-500 text-white font-bold'
                      }>
                        {sub.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted on {new Date(sub.createdAt).toLocaleDateString()} • {sub.category} • {sub.venue}, {sub.location}
                    </p>
                    {sub.rejectionReason && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Reason: {sub.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {sub.status === 'pending' && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                        <ClockIcon className="w-4 h-4" />
                        Under Admin Review
                      </span>
                    )}
                    {sub.status === 'approved' && (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 flex items-center gap-1.5">
                        <CheckCircle2Icon className="w-4 h-4" />
                        Approved & Live
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* EVENT & TICKET DETAILS MODAL */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-border bg-card">
            {/* Modal Cover Image & Header */}
            <div className="relative h-56 w-full bg-muted">
              <img
                src={selectedEvent.image && selectedEvent.image.trim() !== '' ? selectedEvent.image : '/images/hero-bg.jpg'}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/hero-bg.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-primary text-primary-foreground font-bold text-xs uppercase mb-2">
                      {selectedEvent.category || 'Event'}
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">{selectedEvent.title}</h2>
                    <p className="text-xs text-white/80 mt-1 flex items-center gap-3">
                      <span>📅 {selectedEvent.date} at {selectedEvent.time}</span>
                      <span>📍 {selectedEvent.venue}, {selectedEvent.location}</span>
                    </p>
                  </div>
                  <Link href={`/events/${selectedEvent.id}`} target="_blank">
                    <Button size="sm" variant="secondary" className="rounded-xl font-bold text-xs gap-1.5">
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                      Event Page
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Performance Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-muted/40 border border-border">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Ticket Price</span>
                  <span className="text-xl font-black text-primary mt-1 block">
                    MWK {Number(selectedEvent.price).toLocaleString()}
                  </span>
                </Card>
                <Card className="p-4 bg-muted/40 border border-border">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Total Inventory</span>
                  <span className="text-xl font-black text-foreground mt-1 block">
                    {selectedEvent.ticketsTotal} Tickets
                  </span>
                </Card>
                <Card className="p-4 bg-muted/40 border border-border">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Tickets Sold</span>
                  <span className="text-xl font-black text-green-600 mt-1 block">
                    {selectedEvent.ticketsTotal - selectedEvent.ticketsAvailable} Sold
                  </span>
                </Card>
                <Card className="p-4 bg-muted/40 border border-border">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Gross Revenue</span>
                  <span className="text-xl font-black text-primary mt-1 block">
                    MWK {((selectedEvent.ticketsTotal - selectedEvent.ticketsAvailable) * selectedEvent.price).toLocaleString()}
                  </span>
                </Card>
              </div>

              {/* Event Purchased Tickets Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Purchased Tickets & Attendees</h3>
                    <p className="text-xs text-muted-foreground">
                      List of all ticket purchases for {selectedEvent.title}
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search buyer or ticket #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {ordersLoading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    Loading event ticket sales...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <TicketIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-bold text-foreground">No Tickets Sold Yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When attendees purchase tickets for this event, their ticket details will appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="border border-border rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-muted-foreground uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Attendee</th>
                          <th className="px-4 py-3">Ticket Number(s)</th>
                          <th className="px-4 py-3">Quantity</th>
                          <th className="px-4 py-3">Total Paid</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-foreground">{order.customerName || 'Attendee'}</p>
                              <p className="text-[11px] text-muted-foreground">{order.customerEmail}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {order.ticketNumbers && order.ticketNumbers.length > 0 ? (
                                  order.ticketNumbers.map((tn) => (
                                    <span key={tn} className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                                      {tn}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">#TKT-{order.id.slice(0, 8)}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">{order.quantity || 1}</td>
                            <td className="px-4 py-3 font-bold text-primary">MWK {Number(order.totalPrice || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={order.status === 'completed' ? 'bg-green-600 text-white font-bold' : 'bg-amber-500 text-white font-bold'}>
                                {order.status ? order.status.toUpperCase() : 'COMPLETED'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
