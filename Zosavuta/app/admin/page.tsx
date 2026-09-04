'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  UsersIcon, CalendarIcon, TrendingUpIcon, TicketIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Analytics {
  stats: {
    totalRevenue: number;
    totalUsers: number;
    activeEvents: number;
    ticketsSold: number;
    pendingSubmissions: number;
  };
  revenueByWeek: { date: string; revenue: number }[];
  eventsByCategory: { name: string; value: number; color: string }[];
  ticketSalesByCategory: { category: string; sold: number; available: number }[];
  topEvents: { name: string; ticketsSold: number; revenue: number }[];
}

interface Submission {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  price: number;
  ticketsTotal: number;
  image?: string;
  organizerName: string;
  organizerEmail: string;
  ticketDetailsSubmitted: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get('section') || 'approvals';
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: number; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/admin');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError('');

    try {
      const roleRes = await fetch(`/api/users/${user.uid}`);
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        if (roleData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
      } else {
        router.push('/dashboard');
        return;
      }

      const headers = await getAuthHeaders();
      const [analyticsRes, submissionsRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers }),
        fetch('/api/event-submissions?status=pending&readyForReview=true', { headers }),
      ]);

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }

      if (submissionsRes.ok) {
        setSubmissions(await submissionsRes.json());
      }
    } catch (err) {
      console.error('Admin dashboard fetch error:', err);
      const message = 'Failed to load admin data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Approval failed');
      }
      await fetchData();
      toast.success('Event approved and published');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionLoading(rejectDialog.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/submissions/${rejectDialog.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rejectionReason: rejectReason || 'Rejected by admin' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Rejection failed');
      }
      setRejectDialog(null);
      setRejectReason('');
      await fetchData();
      toast.success('Event submission rejected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = analytics?.stats;

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold tracking-tight capitalize">{section}</h1>
        <p className="text-muted-foreground mt-1">Platform analytics and event approval</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <Card className="p-4 bg-red-50 border-red-200 mb-8 flex gap-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<TrendingUpIcon className="w-6 h-6" />}
            label="Total Revenue"
            value={`MWK ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          />
          <StatCard
            icon={<UsersIcon className="w-6 h-6" />}
            label="Total Users"
            value={(stats?.totalUsers ?? 0).toLocaleString()}
          />
          <StatCard
            icon={<CalendarIcon className="w-6 h-6" />}
            label="Active Events"
            value={(stats?.activeEvents ?? 0).toLocaleString()}
          />
          <StatCard
            icon={<TicketIcon className="w-6 h-6" />}
            label="Tickets Sold"
            value={(stats?.ticketsSold ?? 0).toLocaleString()}
          />
        </div>

        {(section === 'overview' || section === 'approvals') && (stats?.pendingSubmissions ?? 0) > 0 && section !== 'approvals' && (
          <Card className="p-4 bg-amber-50 border-amber-200 mb-8 flex gap-4">
            <ClockIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">
                {stats?.pendingSubmissions} event submission{stats!.pendingSubmissions > 1 ? 's' : ''} awaiting review
              </p>
            </div>
          </Card>
        )}

        {section === 'approvals' && (
          <div className="space-y-6">
            {submissions.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending event submissions</p>
              </Card>
            ) : (
              submissions.map((sub) => (
                <Card key={sub.id} className="p-6 overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {sub.image && (
                      <div className="w-full lg:w-48 h-32 rounded-lg overflow-hidden shrink-0 bg-muted">
                        <img src={sub.image} alt={sub.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{sub.title}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 capitalize">
                          {sub.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{sub.description}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Date / Time</p>
                          <p className="font-medium">{sub.date} at {sub.time}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Venue</p>
                          <p className="font-medium">{sub.venue}, {sub.location}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tickets</p>
                          <p className="font-medium">{sub.ticketsTotal}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price (MWK)</p>
                          <p className="font-medium">{Number(sub.price).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted by {sub.organizerName} ({sub.organizerEmail}) on{' '}
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={actionLoading === sub.id}
                        onClick={() => setRejectDialog({ id: sub.id, title: sub.title })}
                      >
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        disabled={actionLoading === sub.id}
                        onClick={() => handleApprove(sub.id)}
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        {actionLoading === sub.id ? 'Processing...' : 'Approve & Publish'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {section === 'revenue' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold mb-4">Revenue Trend (Last 6 Weeks)</h3>
              {mounted && analytics?.revenueByWeek.length ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={analytics.revenueByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `MWK ${v.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No revenue data yet
                </div>
              )}
            </Card>
          </div>
        )}

        {section === 'events' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold mb-4">Events by Category</h3>
                {mounted && analytics?.eventsByCategory.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.eventsByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {analytics.eventsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No events data yet
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="font-bold mb-4">Top Events by Revenue</h3>
                <div className="space-y-3">
                  {analytics?.topEvents.length ? (
                    analytics.topEvents.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.ticketsSold} tickets sold</p>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          MWK {item.revenue.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">No events with sales yet</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {section === 'tickets' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold mb-4">Ticket Sales by Category</h3>
              {mounted && analytics?.ticketSalesByCategory.length ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.ticketSalesByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sold" fill="var(--color-primary)" name="Sold" />
                    <Bar dataKey="available" fill="var(--color-muted)" name="Available" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No ticket sales data yet
                </div>
              )}
            </Card>
          </div>
        )}

        {section === 'overview' && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Select a section from the sidebar to view detailed analytics.</p>
          </Card>
        )}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event Submission</DialogTitle>
            <DialogDescription>
              Reject &quot;{rejectDialog?.title}&quot;? The organizer will be notified of the reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading !== null}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
