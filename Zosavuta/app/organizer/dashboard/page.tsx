'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlusIcon, TrendingUpIcon, TicketIcon, UserIcon, DollarSignIcon, ClockIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { canOrganize, isAdmin } from '@/lib/roles';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  date: string;
  ticketsTotal: number;
  ticketsAvailable: number;
  price: number;
  status: string;
}

interface Submission {
  id: number;
  title: string;
  date: string;
  time: string;
  category: string;
  price: number | null;
  ticketsTotal: number | null;
  status: 'pending' | 'approved' | 'rejected';
  ticketDetailsSubmitted: number;
  rejectionReason?: string;
  createdAt: string;
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    activeEvents: 0,
    pendingSubmissions: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/organizer/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const roleRes = await fetch(`/api/users/${user.uid}`);
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          setUserRole(roleData.role);
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

        const eventsData: Event[] = eventsRes.ok ? await eventsRes.json() : [];
        const submissionsData: Submission[] = submissionsRes.ok ? await submissionsRes.json() : [];

        let totalRevenue = 0;
        let totalTickets = 0;

        for (const event of eventsData) {
          const ticketsSold = event.ticketsTotal - event.ticketsAvailable;
          totalRevenue += ticketsSold * Number(event.price);
          totalTickets += ticketsSold;
        }

        setEvents(eventsData);
        setSubmissions(submissionsData);
        setStats({
          totalEvents: eventsData.length,
          totalRevenue,
          totalTicketsSold: totalTickets,
          activeEvents: eventsData.filter((e) => e.status === 'active').length,
          pendingSubmissions: submissionsData.filter((s) => s.status === 'pending').length,
        });
      } catch (error) {
        console.error('Error fetching organizer data:', error);
        toast.error('Failed to load organizer data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Muli bwanji, {user?.displayName?.split(' ')[0] || 'Organizer'}!
            </h1>
            <p className="text-muted-foreground mt-1">Manage your events and track sales in MWK</p>
          </div>
          <Link href="/organizer">
            <Button className="bg-primary hover:bg-primary/90 h-11 px-6 gap-2">
              <PlusIcon className="w-5 h-5" />
              Submit Event
            </Button>
          </Link>
        </div>
        {stats.pendingSubmissions > 0 && (
          <Card className="p-4 bg-amber-50 border-amber-200 mb-8 flex gap-4">
            <ClockIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">
                {stats.pendingSubmissions} event{stats.pendingSubmissions > 1 ? 's' : ''} awaiting admin approval
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Your submissions will appear in the events list once approved by a system admin.
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<TrendingUpIcon className="w-6 h-6" />} label="Total Revenue" value={`MWK ${stats.totalRevenue.toLocaleString()}`} />
          <StatCard icon={<TicketIcon className="w-6 h-6" />} label="Tickets Sold" value={stats.totalTicketsSold.toString()} />
          <StatCard icon={<UserIcon className="w-6 h-6" />} label="Total Events" value={stats.totalEvents.toString()} />
          <StatCard icon={<DollarSignIcon className="w-6 h-6" />} label="Active Events" value={stats.activeEvents.toString()} />
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList>
            <TabsTrigger value="events">Published Events ({events.length})</TabsTrigger>
            <TabsTrigger value="submissions">
              Submissions ({submissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <EventsTable events={events} />
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <SubmissionsTable submissions={submissions} />
          </TabsContent>
        </Tabs>
        {/* Charts Section */}
        <ChartsSection events={events} />
      </div>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
        <div className="text-accent opacity-50">{icon}</div>
      </div>
    </Card>
  );
}

function EventsTable({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-4">No published events yet</p>
        <Link href="/organizer">
          <Button className="bg-primary hover:bg-primary/90">Submit Your First Event</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Event Name</th>
              <th className="px-6 py-3 text-left font-semibold">Date</th>
              <th className="px-6 py-3 text-left font-semibold">Tickets</th>
              <th className="px-6 py-3 text-left font-semibold">Revenue</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => {
              const ticketsSold = event.ticketsTotal - event.ticketsAvailable;
              const revenue = ticketsSold * Number(event.price);
              return (
                <tr key={event.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-medium">{event.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{event.date}</td>
                  <td className="px-6 py-4">{ticketsSold}/{event.ticketsTotal}</td>
                  <td className="px-6 py-4 font-semibold">MWK {revenue.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/events/${event.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SubmissionsTable({ submissions }: { submissions: Submission[] }) {
  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-4">No submissions yet</p>
        <Link href="/organizer">
          <Button className="bg-primary hover:bg-primary/90">Submit an Event</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Event</th>
              <th className="px-6 py-3 text-left font-semibold">Date / Time</th>
              <th className="px-6 py-3 text-left font-semibold">Category</th>
              <th className="px-6 py-3 text-left font-semibold">Tickets</th>
              <th className="px-6 py-3 text-left font-semibold">Price (MWK)</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-muted/50 transition">
                <td className="px-6 py-4 font-medium">{sub.title}</td>
                <td className="px-6 py-4 text-muted-foreground">{sub.date} {sub.time}</td>
                <td className="px-6 py-4 capitalize">{sub.category}</td>
                <td className="px-6 py-4">
                  {sub.ticketDetailsSubmitted ? sub.ticketsTotal : '—'}
                </td>
                <td className="px-6 py-4">
                  {sub.ticketDetailsSubmitted && sub.price != null
                    ? Number(sub.price).toLocaleString()
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={sub.status} />
                  {sub.status === 'pending' && !sub.ticketDetailsSubmitted && (
                    <p className="text-xs text-amber-600 mt-1">Awaiting ticket details</p>
                  )}
                  {sub.status === 'rejected' && sub.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">{sub.rejectionReason}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  {sub.status === 'pending' && !sub.ticketDetailsSubmitted && (
                    <Link href={`/organizer/tickets/${sub.id}`}>
                      <Button size="sm" variant="outline">Add Tickets</Button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ChartsSection({ events }: { events: Event[] }) {
  const chartData = events.map((e) => {
    const ticketsSold = e.ticketsTotal - e.ticketsAvailable;
    const revenue = ticketsSold * Number(e.price);
    return { name: e.title, revenue };
  });
  return (
    <Card className="p-4 mt-8 bg-white/30 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Revenue by Event</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#6366F1" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}


function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    sold_out: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
