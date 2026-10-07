'use client';

import { useEffect, useState, useCallback, Suspense, useMemo, useRef } from 'react';
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
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SearchIcon,
  XIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  Building2Icon,
  UserIcon,
  EyeIcon,
  FileTextIcon,
  StarIcon,
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
    totalEvents?: number;
    ticketsSold: number;
    pendingSubmissions: number;
  };
  revenueByWeek: { date: string; revenue: number }[];
  eventsByCategory: { name: string; value: number; color: string }[];
  ticketSalesByCategory: { category: string; sold: number; available: number }[];
  topEvents: { name: string; ticketsSold: number; revenue: number; organizerName?: string }[];
  organizers: { uid: string; name: string; email?: string; eventCount?: number }[];
  events?: {
    id: number;
    title: string;
    description?: string;
    category: string;
    date: string;
    time: string;
    location: string;
    venue: string;
    image?: string | null;
    price: number;
    ticketsTotal: number;
    ticketsAvailable: number;
    status: string;
    organizerId: string;
    organizerName: string;
    organizerEmail?: string;
    ticketsSold: number;
    revenue: number;
    busTransport: boolean;
    seatingChart: boolean;
    createdAt: string;
  }[];
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
  payoutDetails?: {
    method?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  } | null;
  feeAmount?: number;
  netAmount?: number;
  verificationStatus?: string;
}

interface FinancialReport {
  summary: {
    grossPrimarySales: number;
    onlineSales: number;
    physicalSales: number;
    primaryOrderCount: number;
    physicalSoldCount: number;
    grossResaleSales: number;
    resaleCount: number;
    totalPlatformCommission: number;
    totalPendingHold: number;
    totalAvailableBalance: number;
    totalPaidOut: number;
    totalRefunds: number;
    refundCount: number;
  };
  organizerBreakdown: { organizerName: string; eventCount: number; ticketsSold: number; totalRevenue: number }[];
  ledgerIntegrityVerified: boolean;
}

interface AuditLog {
  id: number;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  newValues?: any;
  createdAt: string;
}

interface AdminVerification {
  id: number;
  userId: string;
  businessType: 'unregistered' | 'registered';
  status: 'NOT_STARTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  legalName?: string | null;
  dob?: string | null;
  idDocumentUrl?: string | null;
  idDocumentType?: string | null;
  phone?: string | null;
  residentialAddress?: string | null;
  individualPayoutDetails?: any;
  registrationType?: string | null;
  businessName?: string | null;
  certificateUrl?: string | null;
  businessAddress?: string | null;
  stateDistrict?: string | null;
  postalCode?: string | null;
  applicantOwnershipPercentage?: number | null;
  shareholders?: Array<{ fullName: string; email: string; phone: string; ownershipPercentage: number }>;
  businessPayoutDetails?: any;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

/* ────────────────────────────────── Organizer Dropdown ── */

function OrganizerDropdown({
  value,
  onChange,
  organizers,
}: {
  value: string;
  onChange: (val: string) => void;
  organizers: { uid: string; name: string; email?: string; eventCount?: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 6;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return organizers;
    const q = search.toLowerCase();
    return organizers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.email && o.email.toLowerCase().includes(q))
    );
  }, [organizers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const selectedOrganizer = organizers.find((o) => o.name === value || o.uid === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 rounded-md border border-input bg-background px-2.5 text-xs w-full flex items-center justify-between gap-1.5 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="truncate flex items-center gap-1.5 font-medium">
          <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {value ? (selectedOrganizer?.name || value) : 'All organizers'}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {value ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="hover:text-foreground p-0.5"
              title="Clear selection"
            >
              <XIcon className="w-3 h-3" />
            </span>
          ) : (
            <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-full font-semibold">
              {organizers.length}
            </span>
          )}
          <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 sm:w-80 rounded-xl border border-border bg-popover p-2 shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Search box */}
          <div className="relative mb-2">
            <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search organizer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 pr-7 text-xs bg-muted/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick select: All Organizers */}
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors mb-1 ${!value ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
              }`}
          >
            <span>All organizers</span>
            {!value && <CheckIcon className="w-3.5 h-3.5" />}
          </button>

          {/* List of organizers */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {paged.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">No organizers found</p>
            ) : (
              paged.map((o) => {
                const isSelected = value === o.name || value === o.uid;
                return (
                  <button
                    key={o.uid}
                    type="button"
                    onClick={() => {
                      onChange(o.name);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                      }`}
                  >
                    <div className="truncate flex-1 min-w-0">
                      <p className="truncate font-semibold">{o.name}</p>
                      {o.email && <p className="text-[10px] text-muted-foreground truncate">{o.email}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {typeof o.eventCount === 'number' && o.eventCount > 0 && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold">
                          {o.eventCount} evt{o.eventCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isSelected && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/60 text-[11px] text-muted-foreground px-1">
              <span>
                Page {page} of {totalPages} ({filtered.length})
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRightIcon className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsSearch, setAuditLogsSearch] = useState('');
  const AUDIT_LOGS_PER_PAGE = 15;
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);
  const [newsletterStats, setNewsletterStats] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [newsletterFilter, setNewsletterFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [newsletterSearch, setNewsletterSearch] = useState('');
  const [error, setError] = useState('');

  // ── Overview Events Table Filter & Pagination ──
  const [overviewEventsSearch, setOverviewEventsSearch] = useState('');
  const [overviewEventsStatusFilter, setOverviewEventsStatusFilter] = useState<'all' | 'active' | 'sold_out' | 'draft' | 'cancelled' | 'expired'>('all');
  const [overviewEventsPage, setOverviewEventsPage] = useState(1);
  const OVERVIEW_EVENTS_PER_PAGE = 8;

  // ── Featured Events State ──
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [featuredSearch, setFeaturedSearch] = useState('');

  // ── Organizer KYC Verification State ──
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [verificationCounts, setVerificationCounts] = useState({ total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, suspended: 0 });
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<'all' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'>('all');
  const [verificationSearch, setVerificationSearch] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<AdminVerification | null>(null);
  const [selectedVerificationHistory, setSelectedVerificationHistory] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // ── Filters (Overview + Reports) ──
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [organizerFilter, setOrganizerFilter] = useState('');

  // ── Approvals filters + pagination ──
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const APPROVALS_PER_PAGE = 8;
  const [approvalsPage, setApprovalsPage] = useState(1);

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

  const buildFilterQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    if (organizerFilter) p.set('organizer', organizerFilter);
    return p.toString();
  }, [dateFrom, dateTo, organizerFilter]);

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'week') {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(first.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else {
      setDateFrom('');
      setDateTo('');
      setOrganizerFilter('');
    }
  };

  const activePreset = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    if (!dateFrom && !dateTo) return 'all';
    if (dateFrom === todayStr && dateTo === todayStr) return 'today';
    if (dateFrom === weekAgoStr && dateTo === todayStr) return 'week';
    if (dateFrom === monthFirst && dateTo === todayStr) return 'month';
    return 'custom';
  }, [dateFrom, dateTo]);

  const fetchAuditLogs = useCallback(async (page: number, search: string) => {
    if (!user) return;
    try {
      const headers = { 'x-admin-id': user.uid, ...(await getAuthHeaders()) };
      const q = new URLSearchParams({
        adminId: user.uid,
        page: String(page),
        limit: String(AUDIT_LOGS_PER_PAGE),
      });
      if (search.trim()) q.set('search', search.trim());
      const res = await fetch(`/api/admin/audit-logs?${q.toString()}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.logs || []);
        setAuditLogsTotal(d.total ?? (d.logs || []).length);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  }, [user]);

  useEffect(() => {
    if (user && section === 'audit' && mounted) {
      void fetchAuditLogs(auditLogsPage, auditLogsSearch);
    }
  }, [user, section, auditLogsPage, auditLogsSearch, fetchAuditLogs, mounted]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      const headers = { 'x-admin-id': user.uid, ...(await getAuthHeaders()) };
      const filterQ = buildFilterQuery();
      const analyticsUrl = filterQ ? `/api/admin/analytics?${filterQ}` : '/api/admin/analytics';
      const reportsUrl = `/api/admin/financial-reports?adminId=${user.uid}${filterQ ? `&${filterQ}` : ''}`;
      const auditUrl = `/api/admin/audit-logs?adminId=${user.uid}&page=${auditLogsPage}&limit=${AUDIT_LOGS_PER_PAGE}${auditLogsSearch ? `&search=${encodeURIComponent(auditLogsSearch)}` : ''
        }`;

      const [analyticsRes, submissionsRes, payoutsRes, reportRes, logsRes, newsletterRes, verifRes, featuredRes] = await Promise.all([
        fetch(analyticsUrl, { headers }),
        fetch(`/api/admin/ticket-approvals?adminId=${user.uid}`, { headers }),
        fetch(`/api/admin/financial-verifications?adminId=${user.uid}`, { headers }),
        fetch(reportsUrl, { headers }),
        fetch(auditUrl, { headers }),
        fetch(`/api/newsletter?adminId=${user.uid}&status=all&limit=200`, { headers }),
        fetch('/api/admin/organizer-verifications', { headers }),
        fetch('/api/admin/featured-events', { headers }),
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
        setAuditLogsTotal(d.total ?? (d.logs || []).length);
      }
      if (newsletterRes.ok) {
        const nd = await newsletterRes.json();
        setNewsletterSubscribers(nd.subscribers || []);
        setNewsletterStats(nd.stats || { total: 0, active: 0, unsubscribed: 0 });
      }
      if (verifRes.ok) {
        const vd = await verifRes.json();
        setVerifications(vd.verifications || []);
        setVerificationCounts(vd.counts || { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, suspended: 0 });
      }
      if (featuredRes.ok) {
        const fd = await featuredRes.json();
        setFeaturedEvents(fd.events || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user, buildFilterQuery]);

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

  /* ── KYC Verification Review Handlers ── */
  const openVerificationReview = async (v: AdminVerification) => {
    setSelectedVerification(v);
    setReviewNotes(v.adminNotes || '');
    setRejectionReasonInput(v.rejectionReason || '');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/organizer-verifications/${v.id}/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSelectedVerificationHistory(data.history || []);
      } else {
        setSelectedVerificationHistory([]);
      }
    } catch {
      setSelectedVerificationHistory([]);
    }
  };

  const handleReviewAction = async (action: 'approve' | 'reject' | 'under_review' | 'suspend') => {
    if (!selectedVerification) return;
    if (action === 'reject' && !rejectionReasonInput.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setReviewActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/organizer-verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          verificationId: selectedVerification.id,
          action,
          notes: reviewNotes,
          rejectionReason: rejectionReasonInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review action failed');
      toast.success(data.message || 'Action executed successfully');
      setSelectedVerification(null);
      setReviewNotes('');
      setRejectionReasonInput('');
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setReviewActionLoading(false);
    }
  };

  const filteredVerifications = useMemo(() => {
    return verifications
      .filter((v) => verificationStatusFilter === 'all' || v.status === verificationStatusFilter)
      .filter((v) => {
        if (!verificationSearch) return true;
        const q = verificationSearch.toLowerCase();
        return (
          (v.userName || '').toLowerCase().includes(q) ||
          (v.userEmail || '').toLowerCase().includes(q) ||
          (v.legalName || '').toLowerCase().includes(q) ||
          (v.businessName || '').toLowerCase().includes(q)
        );
      });
  }, [verifications, verificationStatusFilter, verificationSearch]);

  /* ── Toggle Featured Event ── */
  const handleToggleFeatured = async (eventId: string, currentFeatured: boolean) => {
    setFeaturedLoading(eventId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/featured-events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ eventId, isFeatured: !currentFeatured }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update featured status');
      setFeaturedEvents((prev) =>
        prev.map((e) => e.id === eventId ? { ...e, isFeatured: !currentFeatured } : e)
      );
      toast.success(!currentFeatured ? 'Event marked as featured ⭐' : 'Event removed from featured');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update featured status');
    } finally {
      setFeaturedLoading(null);
    }
  };

  // ── Filtered approvals (Hooks must be called BEFORE any early returns) ──
  const filteredApprovals = useMemo(() => {
    return submissions
      .filter((s) => approvalStatusFilter === 'all' || s.status === approvalStatusFilter)
      .filter((s) => {
        if (!approvalSearch) return true;
        const q = approvalSearch.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.organizerName || '').toLowerCase().includes(q) ||
          (s.organizerEmail || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q)
        );
      });
  }, [submissions, approvalSearch, approvalStatusFilter]);

  const pendingApprovals = filteredApprovals.filter((s) => s.status === 'pending');
  const reviewedApprovals = filteredApprovals.filter((s) => s.status !== 'pending');
  const totalApprovalsPages = Math.max(1, Math.ceil(filteredApprovals.length / APPROVALS_PER_PAGE));
  const pagedApprovals = filteredApprovals.slice((approvalsPage - 1) * APPROVALS_PER_PAGE, approvalsPage * APPROVALS_PER_PAGE);
  const pagedPending = pagedApprovals.filter((s) => s.status === 'pending');
  const pagedReviewed = pagedApprovals.filter((s) => s.status !== 'pending');

  // ── Overview events filtering and pagination (Hooks must be called BEFORE any early returns) ──
  const filteredOverviewEvents = useMemo(() => {
    const list = analytics?.events || [];
    return list.filter((e) => {
      const matchesStatus = overviewEventsStatusFilter === 'all' || e.status === overviewEventsStatusFilter;
      const q = overviewEventsSearch.toLowerCase();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.organizerName.toLowerCase().includes(q) ||
        (e.organizerEmail && e.organizerEmail.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [analytics?.events, overviewEventsStatusFilter, overviewEventsSearch]);

  const totalOverviewEventsPages = Math.max(1, Math.ceil(filteredOverviewEvents.length / OVERVIEW_EVENTS_PER_PAGE));
  const pagedOverviewEvents = useMemo(() => {
    const start = (overviewEventsPage - 1) * OVERVIEW_EVENTS_PER_PAGE;
    return filteredOverviewEvents.slice(start, start + OVERVIEW_EVENTS_PER_PAGE);
  }, [filteredOverviewEvents, overviewEventsPage]);

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
  const pendingPayouts = payouts.filter((p) => p.status === 'REQUESTED' || p.status === 'ACCOUNTANT_REVIEW');

  // ── Filter bar helpers ──
  const hasActiveFilters = !!(dateFrom || dateTo || organizerFilter);
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setOrganizerFilter(''); };

  // ── Audit logs pagination helper ──
  const totalAuditPages = Math.max(1, Math.ceil(auditLogsTotal / AUDIT_LOGS_PER_PAGE));

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

          {/* ── Global Filter Bar ── */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <FilterIcon className="w-3.5 h-3.5 text-primary" /> Quick Range:
                </span>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => applyPreset('today')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('week')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('month')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'all' && !organizerFilter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    All Time
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-border/50">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</label>
                <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</label>
                <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organizer</label>
                <OrganizerDropdown
                  value={organizerFilter}
                  onChange={setOrganizerFilter}
                  organizers={analytics?.organizers || []}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={() => void fetchData()} disabled={loading}>
                  {loading ? <Loader2Icon className="w-3 h-3 animate-spin" /> : 'Apply Filters'}
                </Button>
                {hasActiveFilters && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { clearFilters(); }}>
                    <XIcon className="w-3 h-3" /> Clear
                  </Button>
                )}
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dateFrom && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">From: {dateFrom}</span>}
                {dateTo && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">To: {dateTo}</span>}
                {organizerFilter && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Organizer: {organizerFilter}</span>}
              </div>
            )}
          </Card>

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
              value={`${(stats?.activeEvents ?? 0).toLocaleString()}${stats?.totalEvents ? ` (${stats.totalEvents} total)` : ''}`}
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

          {/* Organizer Events Table from Events Table */}
          {mounted && analytics && (
            <Card className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Organizer Events ({analytics.events?.length || 0})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All organizer events fetched directly from the events table.
                  </p>
                </div>

                {/* Search & Status Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search title, organizer, venue..."
                      value={overviewEventsSearch}
                      onChange={(e) => {
                        setOverviewEventsSearch(e.target.value);
                        setOverviewEventsPage(1);
                      }}
                      className="h-8 pl-8 pr-7 text-xs"
                    />
                    {overviewEventsSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewEventsSearch('');
                          setOverviewEventsPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <select
                    value={overviewEventsStatusFilter}
                    onChange={(e) => {
                      setOverviewEventsStatusFilter(e.target.value as any);
                      setOverviewEventsPage(1);
                    }}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="sold_out">Sold Out</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              {filteredOverviewEvents.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl border-border">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-foreground">No events found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {overviewEventsSearch || overviewEventsStatusFilter !== 'all'
                      ? 'Try adjusting your search or status filter.'
                      : 'No organizer events found in the events table.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Event</th>
                        <th className="py-2.5 px-3 font-semibold">Organizer</th>
                        <th className="py-2.5 px-3 font-semibold">Date & Venue</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Tickets (Sold / Total)</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {pagedOverviewEvents.map((evt) => {
                        const sold = evt.ticketsSold || 0;
                        const total = evt.ticketsTotal || 0;
                        const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                        return (
                          <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                {evt.title}
                              </div>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                                {evt.category}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-foreground">{evt.organizerName}</p>
                              {evt.organizerEmail && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{evt.organizerEmail}</p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-medium text-foreground">{evt.date}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                {evt.venue ? `${evt.venue}, ` : ''}{evt.location}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${evt.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : evt.status === 'sold_out'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : evt.status === 'cancelled'
                                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                              >
                                {evt.status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <p className="font-semibold text-foreground">
                                  {sold.toLocaleString()} / {total.toLocaleString()}
                                  <span className="text-muted-foreground text-[10px] font-normal ml-1">({pct}%)</span>
                                </p>
                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-foreground">
                              MWK {(evt.revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalOverviewEventsPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border text-xs text-muted-foreground">
                  <p>
                    Showing {(overviewEventsPage - 1) * OVERVIEW_EVENTS_PER_PAGE + 1} to{' '}
                    {Math.min(overviewEventsPage * OVERVIEW_EVENTS_PER_PAGE, filteredOverviewEvents.length)} of{' '}
                    {filteredOverviewEvents.length} events
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={overviewEventsPage <= 1}
                      onClick={() => setOverviewEventsPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeftIcon className="w-3.5 h-3.5" /> Previous
                    </Button>
                    <span className="text-xs px-2 font-semibold text-foreground">
                      Page {overviewEventsPage} of {totalOverviewEventsPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={overviewEventsPage >= totalOverviewEventsPages}
                      onClick={() => setOverviewEventsPage((p) => Math.min(totalOverviewEventsPages, p + 1))}
                    >
                      Next <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ────────────────────────── TICKET APPROVALS ────────────────────────── */}
      {section === 'approvals' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Review Queue</p>
              <h1 className="text-2xl font-black tracking-tight">Event Ticket Approvals</h1>
              <p className="text-muted-foreground text-sm mt-1">Review event submissions before they go live to ticket buyers.</p>
            </div>
            {submissions.filter((s) => s.status === 'pending').length > 0 && (
              <Badge className="bg-amber-500 text-white font-bold text-sm px-3 py-1.5 rounded-full w-fit">
                {submissions.filter((s) => s.status === 'pending').length} Pending Review
              </Badge>
            )}
          </div>

          {/* Search and Status Filters */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border overflow-x-auto">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
                  const count = status === 'all'
                    ? submissions.length
                    : submissions.filter((s) => s.status === status).length;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setApprovalStatusFilter(status);
                        setApprovalsPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors flex items-center gap-1.5 whitespace-nowrap ${approvalStatusFilter === status
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {status}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${approvalStatusFilter === status ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search title, organizer, email..."
                  value={approvalSearch}
                  onChange={(e) => {
                    setApprovalSearch(e.target.value);
                    setApprovalsPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
                {approvalSearch && (
                  <button
                    type="button"
                    onClick={() => { setApprovalSearch(''); setApprovalsPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Submissions List */}
          {filteredApprovals.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <CheckCircle2Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">No Submissions Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {approvalSearch || approvalStatusFilter !== 'all'
                  ? 'No submissions match your current search or status filter.'
                  : 'No event submissions are currently in the queue.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pagedApprovals.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  isPending={sub.status === 'pending'}
                  actionLoading={actionLoading}
                  onApprove={handleApprove}
                  onReject={(id, title) => setRejectDialog({ id, title })}
                  onPreviewImage={setPreviewImage}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalApprovalsPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{(approvalsPage - 1) * APPROVALS_PER_PAGE + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(approvalsPage * APPROVALS_PER_PAGE, filteredApprovals.length)}</span> of{' '}
                <span className="font-semibold text-foreground">{filteredApprovals.length}</span> submissions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  disabled={approvalsPage <= 1}
                  onClick={() => setApprovalsPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalApprovalsPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setApprovalsPage(p)}
                      className={`w-7 h-7 text-xs rounded-md font-semibold transition-colors ${approvalsPage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  disabled={approvalsPage >= totalApprovalsPages}
                  onClick={() => setApprovalsPage((p) => Math.min(totalApprovalsPages, p + 1))}
                >
                  Next <ChevronRightIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────── ORGANIZER KYC VERIFICATIONS ────────────────────────── */}
      {section === 'verifications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Compliance & Identity</p>
              <h1 className="text-2xl font-black tracking-tight">Organizer KYC Verifications</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Review submitted identification and business credentials before organizers can publish events, sell tickets, or request payouts.
              </p>
            </div>
            {verificationCounts.pending > 0 && (
              <Badge className="bg-amber-500 text-white font-bold text-sm px-3 py-1.5 rounded-full w-fit">
                {verificationCounts.pending} Pending Review
              </Badge>
            )}
          </div>

          {/* Search and Status Filters */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'All', count: verificationCounts.total },
                    { id: 'SUBMITTED', label: 'Submitted', count: verificationCounts.pending },
                    { id: 'UNDER_REVIEW', label: 'Under Review', count: verificationCounts.underReview },
                    { id: 'APPROVED', label: 'Approved', count: verificationCounts.approved },
                    { id: 'REJECTED', label: 'Rejected', count: verificationCounts.rejected },
                    { id: 'SUSPENDED', label: 'Suspended', count: verificationCounts.suspended },
                  ] as const
                ).map(({ id, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVerificationStatusFilter(id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${verificationStatusFilter === id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {label}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${verificationStatusFilter === id
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, company..."
                  value={verificationSearch}
                  onChange={(e) => setVerificationSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
                {verificationSearch && (
                  <button
                    type="button"
                    onClick={() => setVerificationSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Verifications List */}
          {filteredVerifications.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <ShieldCheckIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">No KYC Applications Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {verificationSearch || verificationStatusFilter !== 'all'
                  ? 'No applications match your search or status filter.'
                  : 'No organizer verification applications have been submitted yet.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredVerifications.map((v) => (
                <Card key={v.id} className="p-5 hover:border-primary/40 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-foreground">
                          {v.businessType === 'registered' ? v.businessName || 'Unnamed Business' : v.legalName || v.userName || 'Unnamed Organizer'}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold flex items-center gap-1">
                          {v.businessType === 'registered' ? (
                            <>
                              <Building2Icon className="w-3 h-3 text-primary" /> Registered Business
                            </>
                          ) : (
                            <>
                              <UserIcon className="w-3 h-3 text-blue-500" /> Individual Organizer
                            </>
                          )}
                        </Badge>
                        <VerificationStatusBadge status={v.status} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <p>
                          User Account: <span className="font-semibold text-foreground">{v.userName || 'Unknown'}</span> ({v.userEmail})
                        </p>
                        {v.businessType === 'registered' ? (
                          <>
                            <p>
                              Type: <span className="font-semibold text-foreground capitalize">{v.registrationType || 'N/A'}</span>
                            </p>
                            <p>
                              Region: <span className="font-semibold text-foreground">{v.stateDistrict || 'N/A'}</span>
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              DOB: <span className="font-semibold text-foreground">{v.dob || 'N/A'}</span>
                            </p>
                            <p>
                              Phone: <span className="font-semibold text-foreground">{v.phone || 'N/A'}</span>
                            </p>
                          </>
                        )}
                        <p>
                          Submitted: <span className="font-semibold text-foreground">{v.submittedAt ? new Date(v.submittedAt).toLocaleDateString() : 'Draft'}</span>
                        </p>
                        {v.rejectionReason && (
                          <p className="col-span-full text-red-600 font-semibold">
                            Rejection Reason: {v.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => void openVerificationReview(v)}
                        className="gap-1.5 font-bold"
                      >
                        <EyeIcon className="w-3.5 h-3.5" /> Review Application
                      </Button>
                    </div>
                  </div>
                </Card>
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
                {payouts.map((payout) => {
                  const numAmount = Number(payout.amount);
                  const fee = Number(payout.feeAmount) > 0 ? Number(payout.feeAmount) : Math.round((numAmount * 0.017 + 700) * 100) / 100;
                  const net = Number(payout.netAmount) > 0 ? Number(payout.netAmount) : Math.max(0, numAmount - fee);
                  const bank = payout.payoutDetails;

                  return (
                    <div key={payout.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold">{payout.id}</p>
                          <PayoutStatusBadge status={payout.status} />
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            Bank Transfer Only
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Seller: <span className="font-semibold text-foreground">{payout.sellerName || payout.sellerId}</span>
                          {payout.sellerEmail && ` · ${payout.sellerEmail}`}
                        </p>
                        {bank?.bankName ? (
                          <p className="text-xs text-foreground font-medium">
                            Destination: <span className="font-bold">{bank.bankName}</span> · Acc: <span className="font-mono">{bank.accountNumber}</span> ({bank.accountName || payout.sellerName})
                          </p>
                        ) : (
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            Bank details pending from organizer profile
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                          <span className="font-bold text-foreground">
                            Gross: MWK {numAmount.toLocaleString()}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400">
                            Bank Fee (1.7% + 700): -MWK {fee.toLocaleString()}
                          </span>
                          <span className="font-bold text-primary">
                            Net Transfer: MWK {net.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {payout.status !== 'COMPLETED' && payout.status !== 'FAILED' && payout.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          onClick={() => void handleApprovePayout(payout.id)}
                          className="shrink-0"
                          disabled={!bank?.bankName || !bank?.accountNumber}
                        >
                          <SendIcon className="w-3 h-3 mr-1.5" />
                          Verify & Dispatch Bank Transfer
                        </Button>
                      )}
                    </div>
                  );
                })}
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

          {/* ── Filter Bar in Reports ── */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <FilterIcon className="w-3.5 h-3.5 text-primary" /> Quick Range:
                </span>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => applyPreset('today')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('week')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('month')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${activePreset === 'all' && !organizerFilter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    All Time
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-border/50">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</label>
                <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</label>
                <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organizer</label>
                <OrganizerDropdown
                  value={organizerFilter}
                  onChange={setOrganizerFilter}
                  organizers={analytics?.organizers || []}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={() => void fetchData()} disabled={loading}>
                  {loading ? <Loader2Icon className="w-3 h-3 animate-spin" /> : 'Apply Filters'}
                </Button>
                {hasActiveFilters && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { clearFilters(); }}>
                    <XIcon className="w-3 h-3" /> Clear
                  </Button>
                )}
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dateFrom && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">From: {dateFrom}</span>}
                {dateTo && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">To: {dateTo}</span>}
                {organizerFilter && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Organizer: {organizerFilter}</span>}
              </div>
            )}
          </Card>

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

      {/* ──────────────────────────── NEWSLETTER ──────────────────────────── */}
      {section === 'newsletter' && (() => {
        const filtered = newsletterSubscribers
          .filter((s) => newsletterFilter === 'all' || s.status === newsletterFilter)
          .filter((s) =>
            newsletterSearch === '' ||
            s.email.toLowerCase().includes(newsletterSearch.toLowerCase())
          );

        const handleExportCSV = () => {
          const rows = [['Email', 'Status', 'Source', 'Subscribed At'], ...filtered.map((s) => [
            s.email, s.status, s.source, new Date(s.subscribedAt).toLocaleDateString(),
          ])];
          const csv = rows.map((r) => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'newsletter_subscribers.csv'; a.click();
          URL.revokeObjectURL(url);
        };

        const handleUnsubscribe = async (email: string) => {
          try {
            const headers = await import('@/lib/auth-client').then(m => m.getAuthHeaders());
            const res = await fetch('/api/newsletter', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ email }),
            });
            if (res.ok) {
              toast.success(`${email} unsubscribed.`);
              await fetchData();
            } else {
              toast.error('Failed to unsubscribe.');
            }
          } catch { toast.error('Error.'); }
        };

        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Marketing</p>
              <h1 className="text-2xl font-black tracking-tight">Newsletter Subscribers</h1>
              <p className="text-muted-foreground text-sm mt-1">People who opted in to receive event updates and offers.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard icon={<UsersIcon className="w-5 h-5" />} label="Total Subscribers" value={String(newsletterStats.total)} accent="text-primary" />
              <KpiCard icon={<CheckCircle2Icon className="w-5 h-5" />} label="Active" value={String(newsletterStats.active)} accent="text-emerald-600" />
              <KpiCard icon={<XCircleIcon className="w-5 h-5" />} label="Unsubscribed" value={String(newsletterStats.unsubscribed)} accent="text-rose-500" />
            </div>

            {/* Toolbar */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'active', 'unsubscribed'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNewsletterFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${newsletterFilter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search email…"
                    value={newsletterSearch}
                    onChange={(e) => setNewsletterSearch(e.target.value)}
                    className="h-9 text-sm w-full sm:w-64"
                  />
                  <Button size="sm" variant="outline" onClick={handleExportCSV} className="shrink-0 font-bold gap-1.5">
                    ↓ CSV
                  </Button>
                </div>
              </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground text-sm">No subscribers found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">#</th>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Subscribed</th>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((sub: any, i: number) => (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{sub.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              }`}>{sub.status}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{sub.source}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(sub.subscribedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {sub.status === 'active' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-7 px-2"
                                onClick={() => void handleUnsubscribe(sub.email)}
                              >
                                Unsubscribe
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        );
      })()}

      {/* ────────────────────────── FEATURED EVENTS ────────────────────────── */}
      {section === 'featured' && (() => {
        const filtered = featuredEvents.filter((e) => {
          if (!featuredSearch) return true;
          const q = featuredSearch.toLowerCase();
          return (
            e.title.toLowerCase().includes(q) ||
            (e.location || '').toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q) ||
            (e.organizer || '').toLowerCase().includes(q)
          );
        });
        const featuredCount = featuredEvents.filter((e) => e.isFeatured).length;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Homepage Curation</p>
                <h1 className="text-2xl font-black tracking-tight">Featured Events</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Control which active events appear in the &ldquo;Featured Events&rdquo; section on the homepage. Admin-selected events take priority over the default first-3 ordering.
                </p>
              </div>
              {featuredCount > 0 && (
                <Badge className="bg-primary text-primary-foreground font-bold text-sm px-3 py-1.5 rounded-full w-fit gap-1 flex items-center">
                  <StarIcon className="w-3.5 h-3.5" />
                  {featuredCount} Featured
                </Badge>
              )}
            </div>

            {/* Search bar */}
            <Card className="p-4">
              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search active events by title, location, category, organizer..."
                  value={featuredSearch}
                  onChange={(e) => setFeaturedSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
                {featuredSearch && (
                  <button
                    type="button"
                    onClick={() => setFeaturedSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>

            {/* Event List */}
            {filtered.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2">
                <StarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground">No Active Events Found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {featuredSearch ? 'No events match your search.' : 'No published active events are currently available.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((event) => (
                  <Card
                    key={event.id}
                    className={`p-4 transition-all ${event.isFeatured ? 'border-primary/50 bg-primary/5 shadow-sm' : 'hover:border-border/80'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex gap-4 items-start">
                        {/* Thumbnail */}
                        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                          {event.image && event.image !== '/images/hero-bg.jpg' ? (
                            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm truncate max-w-[280px]">{event.title}</span>
                            {event.isFeatured && (
                              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1 shrink-0">
                                <StarIcon className="w-2.5 h-2.5" /> Featured
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold capitalize">
                              {event.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> {event.date} · {event.time}
                            <span className="mx-1">·</span>
                            <MapPinIcon className="w-3 h-3" /> {event.location}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            By <span className="font-semibold text-foreground">{event.organizer || 'Unknown'}</span>
                            {' · '}<span className="font-semibold text-foreground">{event.ticketsAvailable?.toLocaleString() ?? '—'}</span> tickets left
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={event.isFeatured ? 'destructive' : 'default'}
                        className={`shrink-0 gap-1.5 font-bold ${event.isFeatured ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400' : 'bg-primary hover:bg-primary/90'}`}
                        disabled={featuredLoading === event.id}
                        onClick={() => void handleToggleFeatured(event.id, event.isFeatured)}
                      >
                        {featuredLoading === event.id ? (
                          <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <StarIcon className="w-3.5 h-3.5" />
                        )}
                        {event.isFeatured ? 'Remove from Featured' : 'Set as Featured'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Info note */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                <span className="font-bold">How it works:</span> Events marked as featured appear in the &ldquo;Featured Events&rdquo; section at the top of the homepage. If no events are featured, the first 3 upcoming events are shown automatically as a fallback.
              </p>
            </Card>
          </div>
        );
      })()}

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

      {/* ── Review KYC Dialog ── */}
      <Dialog open={!!selectedVerification} onOpenChange={(open) => !open && setSelectedVerification(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedVerification && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4 mr-6">
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-primary" />
                      Review KYC: {selectedVerification.businessType === 'registered' ? selectedVerification.businessName : selectedVerification.legalName || selectedVerification.userName}
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-1">
                      User Account: {selectedVerification.userName} ({selectedVerification.userEmail}) · ID: {selectedVerification.userId}
                    </DialogDescription>
                  </div>
                  <VerificationStatusBadge status={selectedVerification.status} />
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Entity Details */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    {selectedVerification.businessType === 'registered' ? (
                      <>
                        <Building2Icon className="w-4 h-4 text-primary" /> Registered Business Credentials
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-4 h-4 text-blue-500" /> Individual Organizer Identity
                      </>
                    )}
                  </h3>

                  {selectedVerification.businessType === 'unregistered' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Legal Name</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.legalName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Date of Birth</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.dob || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Phone Number</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Document Type</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.idDocumentType || 'National ID'}</span>
                      </div>
                      <div className="col-span-full">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Residential Address</span>
                        <span className="font-semibold text-foreground">{selectedVerification.residentialAddress || 'N/A'}</span>
                      </div>
                      {/* Document file link */}
                      <div className="col-span-full pt-2">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase mb-1.5">Uploaded ID Document</span>
                        {selectedVerification.idDocumentUrl ? (
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                            <div className="flex items-center gap-2">
                              <FileTextIcon className="w-4 h-4 text-primary" />
                              <span className="text-xs font-semibold">National ID / Passport File</span>
                            </div>
                            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                              <a href={selectedVerification.idDocumentUrl} target="_blank" rel="noreferrer">
                                <EyeIcon className="w-3.5 h-3.5" /> View / Download Document
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 font-semibold">No document uploaded.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Organization Name</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.businessName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Registration Type</span>
                        <span className="font-semibold text-foreground text-sm capitalize">{selectedVerification.registrationType || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">State / District</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.stateDistrict || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Postal Code</span>
                        <span className="font-semibold text-foreground text-sm">{selectedVerification.postalCode || 'N/A'}</span>
                      </div>
                      <div className="col-span-full">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Business Address</span>
                        <span className="font-semibold text-foreground">{selectedVerification.businessAddress || 'N/A'}</span>
                      </div>
                      {/* Certificate link */}
                      <div className="col-span-full pt-2">
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase mb-1.5">Business Registration Certificate</span>
                        {selectedVerification.certificateUrl ? (
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                            <div className="flex items-center gap-2">
                              <FileTextIcon className="w-4 h-4 text-primary" />
                              <span className="text-xs font-semibold">Registration Certificate File</span>
                            </div>
                            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                              <a href={selectedVerification.certificateUrl} target="_blank" rel="noreferrer">
                                <EyeIcon className="w-3.5 h-3.5" /> View / Download Certificate
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 font-semibold">No certificate uploaded.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shareholders Breakdown (if registered) */}
                {selectedVerification.businessType === 'registered' && (
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Ownership Structure & Shareholders
                      </h3>
                      <Badge variant="outline" className="text-xs font-bold">
                        Applicant: {selectedVerification.applicantOwnershipPercentage ?? 100}%
                      </Badge>
                    </div>

                    {selectedVerification.shareholders && selectedVerification.shareholders.length > 0 ? (
                      <div className="border border-border rounded-lg overflow-hidden bg-background">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted text-muted-foreground font-bold">
                            <tr>
                              <th className="p-2.5">Name</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5">Phone</th>
                              <th className="p-2.5 text-right">Ownership</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedVerification.shareholders.map((sh, idx) => (
                              <tr key={idx}>
                                <td className="p-2.5 font-semibold">{sh.fullName}</td>
                                <td className="p-2.5 text-muted-foreground">{sh.email}</td>
                                <td className="p-2.5 text-muted-foreground">{sh.phone}</td>
                                <td className="p-2.5 text-right font-bold text-primary">{sh.ownershipPercentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">100% sole owner. No additional shareholders listed.</p>
                    )}
                  </div>
                )}

                {/* Payout Details */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Bank / Settlement Payout Details
                  </h3>
                  {(() => {
                    const p = selectedVerification.businessType === 'registered'
                      ? selectedVerification.businessPayoutDetails
                      : selectedVerification.individualPayoutDetails;
                    if (!p) return <p className="text-xs text-muted-foreground">No payout details provided.</p>;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-background p-3 rounded-lg border border-border">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block">Method</span>
                          <span className="font-semibold capitalize">{p.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}</span>
                        </div>
                        {p.method === 'bank' ? (
                          <>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Bank</span>
                              <span className="font-semibold">{p.bankName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Account #</span>
                              <span className="font-semibold font-mono">{p.accountNumber || 'N/A'}</span>
                            </div>
                            <div className="col-span-full">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Account Name</span>
                              <span className="font-semibold">{p.accountName || 'N/A'}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Provider</span>
                              <span className="font-semibold">{p.mobileProvider || 'Airtel/TNM'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Phone</span>
                              <span className="font-semibold font-mono">{p.mobileNumber || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Review History */}
                {selectedVerificationHistory.length > 0 && (
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Application History
                    </h3>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {selectedVerificationHistory.map((h) => (
                        <div key={h.id} className="text-[11px] p-2 rounded border border-border/50 bg-background flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-primary">{h.action}</span>: {h.notes || 'Status updated'}
                            <p className="text-[10px] text-muted-foreground mt-0.5">By {h.actorId} ({h.actorRole})</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(h.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decision inputs */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider">Compliance Review Notes</Label>
                    <Textarea
                      placeholder="Add internal verification notes, document validity comments, or requests..."
                      rows={2}
                      className="mt-1 text-xs"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-red-600">Rejection Reason (Required if Rejecting)</Label>
                    <Input
                      placeholder="Specify why documents are rejected (e.g. blurry corners, name mismatch, expired ID)..."
                      className="mt-1 text-xs border-red-200"
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedVerification(null)} disabled={reviewActionLoading}>
                  Close
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs"
                    onClick={() => void handleReviewAction('under_review')}
                    disabled={reviewActionLoading}
                  >
                    Mark Under Review
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => void handleReviewAction('reject')}
                    disabled={reviewActionLoading}
                  >
                    Reject
                  </Button>
                  {selectedVerification.status === 'APPROVED' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="bg-purple-600 hover:bg-purple-700 text-xs"
                      onClick={() => void handleReviewAction('suspend')}
                      disabled={reviewActionLoading}
                    >
                      Suspend
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                    onClick={() => void handleReviewAction('approve')}
                    disabled={reviewActionLoading}
                  >
                    {reviewActionLoading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2Icon className="w-3.5 h-3.5" />}
                    Approve Verification
                  </Button>
                </div>
              </DialogFooter>
            </>
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

function VerificationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
          Approved
        </Badge>
      );
    case 'SUBMITTED':
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
          Pending Review
        </Badge>
      );
    case 'UNDER_REVIEW':
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold">
          Under Review
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-bold">
          Rejected
        </Badge>
      );
    case 'SUSPENDED':
      return (
        <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-bold">
          Suspended
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground text-[10px] font-bold">
          {status}
        </Badge>
      );
  }
}
