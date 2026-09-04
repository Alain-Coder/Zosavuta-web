'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  UsersIcon,
  CalendarIcon,
  TicketIcon,
  DollarSignIcon,
  FileCheck2Icon,
  BarChart3Icon,
  RotateCcwIcon,
  HistoryIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  SendIcon,
  ImageIcon,
  MapPinIcon,
  BusIcon,
  SofaIcon,
  ZoomInIcon,
  CheckIcon,
  Loader2Icon,
  LayoutDashboardIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { toast } from 'sonner';

/* ─────────────────────────────────────────── Types ── */

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
  fullDescription?: string;
  category: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  price: number | null;
  ticketsTotal: number | null;
  image?: string;
  organizerName: string;
  organizerEmail: string;
  ticketDetailsSubmitted: number;
  busTransport?: number;
  seatingChart?: number;
  status: string;
  createdAt: string;
}

interface Payout {
  id: string;
  sellerId: string;
  sellerName?: string;
  sellerEmail?: string;
  amount: number;
  status: string;
  pendingBalance?: number;
  availableBalance?: number;
  paidOutBalance?: number;
}

interface FinancialReport {
  summary: {
    grossPrimarySales: number;
    primaryOrderCount: number;
    grossResaleSales: number;
    resaleCount: number;
    totalPlatformCommission: number;
    totalPendingHold: number;
    totalAvailableBalance: number;
    totalPaidOut: number;
    totalRefunds: number;
    refundCount: number;
  };
  ledgerIntegrityVerified: boolean;
}

interface AuditLog {
  id: number;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  newValues?: any;
  createdAt: string;
}

/* ─────────────────────────────────────────── Entry ── */

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Loading admin dashboard…</p>
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

/* ─────────────────────────────────────────── Main ── */

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams?.get('section') || 'overview';
  const { user, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: number; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Refund form state
  const [refundAction, setRefundAction] = useState<'refund_ticket' | 'cancel_event' | 'chargeback'>('refund_ticket');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/admin');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      const headers = { 'x-admin-id': user.uid, ...(await getAuthHeaders()) };

      const [analyticsRes, submissionsRes, payoutsRes, reportRes, logsRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers }),
        fetch(`/api/admin/ticket-approvals?adminId=${user.uid}`, { headers }),
        fetch(`/api/admin/financial-verifications?adminId=${user.uid}`, { headers }),
        fetch(`/api/admin/financial-reports?adminId=${user.uid}`, { headers }),
        fetch(`/api/admin/audit-logs?adminId=${user.uid}&limit=50`, { headers }),
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (submissionsRes.ok) {
        const d = await submissionsRes.json();
        setSubmissions(d.submissions || []);
      }
      if (payoutsRes.ok) {
        const d = await payoutsRes.json();
        setPayouts(d.payouts || []);
      }
      if (reportRes.ok) setFinancialReport(await reportRes.json());
      if (logsRes.ok) {
        const d = await logsRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  /* ── Ticket approval actions ── */
  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/ticket-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ submissionId: id, action: 'approve', adminId: user!.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      toast.success('Event approved and published 🎉');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionLoading(rejectDialog.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/ticket-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          submissionId: rejectDialog.id,
          action: 'reject',
          rejectionReason: rejectReason || 'Rejected by admin',
          adminId: user!.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');
      setRejectDialog(null);
      setRejectReason('');
      toast.success('Submission rejected');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Payout actions ── */
  const handleApprovePayout = async (payoutId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/financial-verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ payoutId, action: 'approve', adminId: user!.uid }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.dualApprovalPending) {
          toast.info(`Dual Approval Pending: ${data.reason}`);
          await fetchData();
          return;
        }
        throw new Error(data.error);
      }
      toast.success('Payout dispatched to payment provider');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Payout dispatch failed');
    }
  };

  /* ── Refund form submit ── */
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdInput) return;
    setProcessingRefund(true);
    try {
      const headers = await getAuthHeaders();
      const payload: any = { action: refundAction, adminId: user!.uid, reason: refundReason || 'Admin action' };
      if (refundAction === 'refund_ticket') payload.ticketId = targetIdInput;
      if (refundAction === 'cancel_event') payload.eventId = targetIdInput;
      if (refundAction === 'chargeback') payload.paymentId = targetIdInput;
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.dualApprovalPending) { toast.info(`Dual Approval Required: ${data.reason}`); return; }
        throw new Error(data.error);
      }
      toast.success(`Action '${refundAction}' executed successfully`);
      setTargetIdInput('');
      setRefundReason('');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Refund action failed');
    } finally {
      setProcessingRefund(false);
    }
  };

  /* ── Loading / auth guard ── */
  if (authLoading || loading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  const stats = analytics?.stats;
  const summary = financialReport?.summary;
  const pendingApprovals = submissions.filter((s) => s.status === 'pending');
  const reviewedApprovals = submissions.filter((s) => s.status !== 'pending');
  const pendingPayouts = payouts.filter((p) => p.status === 'REQUESTED' || p.status === 'ACCOUNTANT_REVIEW');

  return (
    <>
      {/* ── Error Banner ── */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 mb-6 flex gap-3">
          <AlertCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* ──────────────────────────── OVERVIEW ──────────────────────────── */}
      {section === 'overview' && (
        <div className="space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Control Center</p>
            <h1 className="text-2xl font-black tracking-tight">Platform Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time summary of platform activity and health.</p>
          </div>

          {/* Ledger badge */}
          {financialReport?.ledgerIntegrityVerified && (
            <div className="flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Double-Entry Ledger Verified
              </span>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUpIcon className="w-5 h-5" />}
              label="Total Revenue"
              value={`MWK ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
              accent="text-primary"
            />
            <KpiCard
              icon={<UsersIcon className="w-5 h-5" />}
              label="Total Users"
              value={(stats?.totalUsers ?? 0).toLocaleString()}
              accent="text-blue-600"
            />
            <KpiCard
              icon={<CalendarIcon className="w-5 h-5" />}
              label="Active Events"
              value={(stats?.activeEvents ?? 0).toLocaleString()}
              accent="text-purple-600"
            />
            <KpiCard
              icon={<TicketIcon className="w-5 h-5" />}
              label="Tickets Sold"
              value={(stats?.ticketsSold ?? 0).toLocaleString()}
              accent="text-amber-600"
            />
          </div>

          {/* Alerts */}
          {(stats?.pendingSubmissions ?? 0) > 0 && (
            <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 flex gap-3">
              <ClockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
                  {stats?.pendingSubmissions} event submission{(stats?.pendingSubmissions ?? 0) > 1 ? 's' : ''} awaiting review
                </p>
                <a href="/admin?section=approvals" className="text-xs text-amber-700 dark:text-amber-400 underline">
                  Review now →
                </a>
              </div>
            </Card>
          )}

          {pendingPayouts.length > 0 && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 flex gap-3">
              <DollarSignIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                  {pendingPayouts.length} payout request{pendingPayouts.length > 1 ? 's' : ''} pending verification
                </p>
                <a href="/admin?section=payouts" className="text-xs text-blue-700 dark:text-blue-400 underline">
                  Verify & dispatch →
                </a>
              </div>
            </Card>
          )}

          {/* Revenue Chart */}
          {mounted && analytics?.revenueByWeek?.length ? (
            <Card className="p-6">
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Revenue Trend (Last 6 Weeks)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={analytics.revenueByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `MWK ${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          ) : null}

          {/* Events by Category + Top Events */}
          {mounted && analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analytics.eventsByCategory?.length ? (
                <Card className="p-6">
                  <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Events by Category</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={analytics.eventsByCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {analytics.eventsByCategory.map((entry, i) => (
                          <Cell key={i} fill={entry.color || `hsl(${i * 60}, 70%, 55%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              ) : null}

              {analytics.topEvents?.length ? (
                <Card className="p-6">
                  <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Top Events by Tickets Sold</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analytics.topEvents} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="ticketsSold" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────── TICKET APPROVALS ────────────────────────── */}
      {section === 'approvals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Review Queue</p>
              <h1 className="text-2xl font-black tracking-tight">Event Ticket Approvals</h1>
              <p className="text-muted-foreground text-sm mt-1">Review event submissions before they go live to ticket buyers.</p>
            </div>
            {pendingApprovals.length > 0 && (
              <Badge className="bg-amber-500 text-white font-bold text-sm px-3 py-1.5 rounded-full">
                {pendingApprovals.length} Pending
              </Badge>
            )}
          </div>

          {/* Pending submissions */}
          {pendingApprovals.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <CheckCircle2Icon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">All Clear!</h3>
              <p className="text-muted-foreground text-sm mt-1">No pending event submissions to review.</p>
            </Card>
          ) : (
            <div className="space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Pending Review ({pendingApprovals.length})</h2>
              {pendingApprovals.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  isPending={true}
                  actionLoading={actionLoading}
                  onApprove={handleApprove}
                  onReject={(id, title) => setRejectDialog({ id, title })}
                  onPreviewImage={setPreviewImage}
                />
              ))}
            </div>
          )}

          {/* Previously reviewed */}
          {reviewedApprovals.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Previously Reviewed ({reviewedApprovals.length})</h2>
              {reviewedApprovals.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  isPending={false}
                  actionLoading={null}
                  onApprove={handleApprove}
                  onReject={(id, title) => setRejectDialog({ id, title })}
                  onPreviewImage={setPreviewImage}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────── PAYOUTS ────────────────────────── */}
      {section === 'payouts' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Settlement Queue</p>
            <h1 className="text-2xl font-black tracking-tight">Financial Payouts</h1>
            <p className="text-muted-foreground text-sm mt-1">Verify and dispatch seller settlement payouts via PayChangu.</p>
          </div>

          {/* Financial summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard icon={<TrendingUpIcon className="w-5 h-5" />} label="Gross Primary Sales" value={`MWK ${Number(summary.grossPrimarySales).toLocaleString()}`} accent="text-primary" />
              <KpiCard icon={<FileCheck2Icon className="w-5 h-5" />} label="Platform Commission" value={`MWK ${Number(summary.totalPlatformCommission).toLocaleString()}`} accent="text-emerald-600" />
              <KpiCard icon={<CheckCircle2Icon className="w-5 h-5" />} label="Available to Pay" value={`MWK ${Number(summary.totalAvailableBalance).toLocaleString()}`} accent="text-blue-600" />
            </div>
          )}

          <Card className="p-6">
            <h2 className="font-bold mb-5 flex items-center gap-2">
              <SendIcon className="w-4 h-4 text-primary" />
              Payout Requests
            </h2>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No seller payout requests.</p>
            ) : (
              <div className="space-y-4">
                {payouts.map((payout) => (
                  <div key={payout.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-bold">{payout.id}</p>
                        <PayoutStatusBadge status={payout.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Seller: <span className="font-semibold text-foreground">{payout.sellerName || payout.sellerId}</span>
                        {payout.sellerEmail && ` · ${payout.sellerEmail}`}
                      </p>
                      <p className="text-sm font-bold">
                        MWK {Number(payout.amount).toLocaleString()}
                      </p>
                      {Number(payout.amount) >= 50000 && (
                        <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                          <AlertTriangleIcon className="h-3 w-3" />
                          High-Value ≥ MWK 50,000 — Dual sign-off enforced
                        </p>
                      )}
                    </div>
                    {payout.status !== 'COMPLETED' && payout.status !== 'FAILED' && payout.status !== 'CANCELLED' && (
                      <Button size="sm" onClick={() => void handleApprovePayout(payout.id)} className="shrink-0">
                        <SendIcon className="w-3 h-3 mr-1.5" />
                        Verify & Dispatch
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────── REPORTS ────────────────────────── */}
      {section === 'reports' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Ledger Overview</p>
            <h1 className="text-2xl font-black tracking-tight">Financial Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Platform revenue breakdown and settlement ledger.</p>
          </div>

          {financialReport?.ledgerIntegrityVerified && (
            <div className="flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">Double-Entry Ledger Verified</span>
            </div>
          )}

          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ReportMetric label="Primary Sales" value={`MWK ${Number(summary.grossPrimarySales).toLocaleString()}`} sub={`${summary.primaryOrderCount} orders`} color="text-foreground" />
              <ReportMetric label="Secondary Resales" value={`MWK ${Number(summary.grossResaleSales).toLocaleString()}`} sub={`${summary.resaleCount} resales`} color="text-orange-600" />
              <ReportMetric label="Platform Commission" value={`MWK ${Number(summary.totalPlatformCommission).toLocaleString()}`} sub="7% primary · 10% resale" color="text-emerald-600" />
              <ReportMetric label="Pending Holds (T+2)" value={`MWK ${Number(summary.totalPendingHold).toLocaleString()}`} sub="Cooling-off period" color="text-amber-600" />
              <ReportMetric label="Available for Payout" value={`MWK ${Number(summary.totalAvailableBalance).toLocaleString()}`} sub="Ready for sellers" color="text-blue-600" />
              <ReportMetric label="Dispatched Payouts" value={`MWK ${Number(summary.totalPaidOut).toLocaleString()}`} sub="Settled via PayChangu" color="text-purple-600" />
              {summary.totalRefunds > 0 && (
                <ReportMetric label="Total Refunds" value={`MWK ${Number(summary.totalRefunds).toLocaleString()}`} sub={`${summary.refundCount} refunds`} color="text-red-600" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────── REFUNDS ────────────────────────── */}
      {section === 'refunds' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Financial Reversals</p>
            <h1 className="text-2xl font-black tracking-tight">Refunds & Reversals</h1>
            <p className="text-muted-foreground text-sm mt-1">Issue ticket refunds, cancel events, or process chargebacks.</p>
          </div>

          <Card className="p-6 max-w-2xl">
            <h2 className="font-bold mb-5 flex items-center gap-2">
              <RotateCcwIcon className="w-4 h-4 text-primary" />
              Execute Refund / Reversal Action
            </h2>
            <form onSubmit={handleRefundSubmit} className="space-y-5">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Action Type</Label>
                <select
                  value={refundAction}
                  onChange={(e: any) => setRefundAction(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="refund_ticket">Single Ticket Refund</option>
                  <option value="cancel_event">Full Event Cancellation & Mass Refund</option>
                  <option value="chargeback">Bank Dispute / Chargeback Debit</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">
                  {refundAction === 'refund_ticket' ? 'Ticket ID' : refundAction === 'cancel_event' ? 'Event ID' : 'Payment ID'}
                </Label>
                <Input
                  required
                  className="mt-1.5 rounded-xl"
                  placeholder={refundAction === 'refund_ticket' ? 'e.g. 104' : refundAction === 'cancel_event' ? 'e.g. 12' : 'e.g. ORD-12345'}
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">Administrative Justification</Label>
                <Textarea
                  required
                  className="mt-1.5 rounded-xl"
                  placeholder="e.g. Customer refund request / Event cancelled due to weather"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={processingRefund} variant="destructive" className="rounded-xl font-bold">
                {processingRefund ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <RotateCcwIcon className="h-4 w-4 mr-2" />}
                Execute Financial Reversal
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ────────────────────────── AUDIT TRAIL ────────────────────────── */}
      {section === 'audit' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Compliance</p>
            <h1 className="text-2xl font-black tracking-tight">Audit Trail</h1>
            <p className="text-muted-foreground text-sm mt-1">Immutable log of all administrative actions performed on the platform.</p>
          </div>

          <Card className="p-6">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No audit logs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-b border-border/40 last:border-0 pb-3 last:pb-0 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-primary">{log.action}</span>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Actor: <span className="font-semibold text-foreground">{log.actorId}</span> ({log.actorRole}) ·{' '}
                      Target: {log.entityType} #{log.entityId}
                    </p>
                    {log.newValues && (
                      <pre className="bg-muted p-2 rounded-lg text-[10px] overflow-x-auto">
                        {JSON.stringify(log.newValues, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Reject Reason Dialog ── */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{rejectDialog?.title}</strong>. This will be sent to the organizer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Missing ticket pricing, incomplete venue details…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="rounded-xl min-h-[100px]"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={actionLoading === rejectDialog?.id}
              onClick={() => void handleReject()}
            >
              {actionLoading === rejectDialog?.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Reject Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image Preview Lightbox ── */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Event Cover Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Event cover"
              className="w-full h-auto max-h-[80vh] object-contain bg-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────────────────── Submission Card ── */

function SubmissionCard({
  sub,
  isPending,
  actionLoading,
  onApprove,
  onReject,
  onPreviewImage,
}: {
  sub: Submission;
  isPending: boolean;
  actionLoading: number | null;
  onApprove: (id: number) => void;
  onReject: (id: number, title: string) => void;
  onPreviewImage: (url: string) => void;
}) {
  const imgUrl = sub.image && sub.image.trim() !== '' ? sub.image : null;

  return (
    <Card className="overflow-hidden border border-border bg-card hover:shadow-md transition-shadow">
      {/* Cover Image — full-width banner */}
      {imgUrl ? (
        <div className="relative w-full h-52 bg-muted group cursor-pointer overflow-hidden" onClick={() => onPreviewImage(imgUrl)}>
          <img
            src={imgUrl}
            alt={sub.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Zoom icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 backdrop-blur-sm text-white rounded-full p-3">
              <ZoomInIcon className="w-5 h-5" />
            </div>
          </div>
          {/* Status badge on cover */}
          <div className="absolute top-3 left-3 flex gap-2">
            <StatusBadge status={sub.status} />
            {sub.category && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                {sub.category}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* No-image placeholder */
        <div className="w-full h-40 bg-muted/50 flex flex-col items-center justify-center gap-2 relative">
          <div className="absolute top-3 left-3 flex gap-2">
            <StatusBadge status={sub.status} />
            {sub.category && (
              <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                {sub.category}
              </span>
            )}
          </div>
          <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No cover image uploaded</p>
        </div>
      )}

      {/* Card Body */}
      <div className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex-1 space-y-3">
            <h3 className="text-xl font-black tracking-tight leading-tight">{sub.title}</h3>

            {sub.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground font-medium">Date & Time</p>
                <p className="font-bold text-foreground mt-0.5">{sub.date} · {sub.time}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Venue</p>
                <p className="font-bold text-foreground mt-0.5">{sub.venue}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Location</p>
                <p className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  {sub.location}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Tickets</p>
                <p className="font-bold text-foreground mt-0.5">
                  {sub.ticketsTotal ? sub.ticketsTotal.toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Price (MWK)</p>
                <p className="font-bold text-foreground mt-0.5">
                  {sub.price != null ? Number(sub.price).toLocaleString() : '—'}
                </p>
              </div>
              {sub.ticketDetailsSubmitted ? (
                <div className="col-span-2 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Ticket details submitted</span>
                </div>
              ) : (
                <div className="col-span-2 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-700 font-semibold">Awaiting ticket details</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Submitted by <span className="font-semibold text-foreground">{sub.organizerName}</span>
              {sub.organizerEmail && ` (${sub.organizerEmail})`} · {new Date(sub.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action Buttons */}
          {isPending && (
            <div className="flex gap-2 shrink-0 flex-col sm:flex-row lg:flex-col">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                disabled={actionLoading === sub.id}
                onClick={() => onApprove(sub.id)}
              >
                {actionLoading === sub.id ? (
                  <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckIcon className="w-4 h-4 mr-2" />
                )}
                Approve & Publish
              </Button>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-semibold rounded-xl transition-all duration-200 ease-in- cursor-pointer"
                disabled={actionLoading === sub.id}
                onClick={() => onReject(sub.id, sub.title)}
              >
                <XCircleIcon className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                Reject
              </Button>
              {imgUrl && (
                <Button
                  variant="ghost"
                  className="text-muted-foreground rounded-xl text-xs cursor-pointer"
                  onClick={() => onPreviewImage(imgUrl)}
                >
                  <ZoomInIcon className="w-3.5 h-3.5 mr-1.5" />
                  Preview Cover
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ──────────────────────────── Utility Components ── */

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <Card className="p-5">
      <div className={`mb-3 ${accent}`}>{icon}</div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-black mt-1">{value}</p>
    </Card>
  );
}

function ReportMetric({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="p-5 bg-muted/30">
      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/90 text-white',
    approved: 'bg-emerald-500/90 text-white',
    rejected: 'bg-red-500/90 text-white',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    REQUESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    ACCOUNTANT_REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
