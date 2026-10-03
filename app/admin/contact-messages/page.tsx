'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MailIcon,
  MessageSquareIcon,
  CheckCircle2Icon,
  ClockIcon,
  SearchIcon,
  RefreshCwIcon,
  Trash2Icon,
  ExternalLinkIcon,
  CheckIcon,
  RotateCcwIcon,
  UserIcon,
  CalendarIcon,
  AlertCircleIcon,
  XIcon,
  InboxIcon,
  SendIcon,
  CopyIcon,
  EyeIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { toast } from 'sonner';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt?: string;
}

interface MessageStats {
  total: number;
  unread: number;
  read: number;
  resolved: number;
}

export default function AdminContactMessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<MessageStats>({ total: 0, unread: 0, read: 0, resolved: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'resolved'>('all');

  // Dialog states
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Authentication protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/admin/contact-messages');
    }
  }, [user, authLoading, router]);

  // Fetch messages
  const fetchMessages = useCallback(async (showRefreshIndicator = false) => {
    if (!user) return;
    if (showRefreshIndicator) setRefreshing(true);
    setError(null);

    try {
      const headers = { 'x-admin-id': user.uid, ...(await getAuthHeaders()) };
      const params = new URLSearchParams();
      params.set('adminId', user.uid);
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/contact-messages?${params.toString()}`, { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load contact messages');
      }

      setMessages(data.messages || []);
      setTotal(data.total || 0);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching contact messages:', err);
      const msg = err.message || 'Could not load contact messages';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, page, limit, statusFilter, searchQuery]);

  useEffect(() => {
    if (user) {
      void fetchMessages();
    }
  }, [fetchMessages, user]);

  // Handle status update
  const handleUpdateStatus = async (id: number, newStatus: 'unread' | 'read' | 'resolved') => {
    if (!user) return;
    setActionLoading(id);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/contact-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ id, status: newStatus, adminId: user.uid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update message status');

      toast.success(`Message marked as ${newStatus}`);

      // Update local state immediately
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );

      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      // Refresh aggregate statistics
      void fetchMessages();
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (!deleteTarget || !user) return;
    const id = deleteTarget.id;
    setActionLoading(id);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/contact-messages?id=${id}&adminId=${user.uid}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete message');

      toast.success('Contact message deleted');
      setDeleteTarget(null);

      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }

      void fetchMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete contact message');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Communications & Support
            </span>
            {stats.unread > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {stats.unread} Unread
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Contact Messages
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            View, reply to, and track incoming customer inquiries submitted from the support desk.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMessages(true)}
            disabled={refreshing || loading}
            className="rounded-xl border-border/60 hover:bg-muted font-bold text-xs"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Counter Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 rounded-2xl border-border/60 shadow-sm bg-card hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Messages
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquareIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground font-medium mt-1">All logged inquiries</p>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60 shadow-sm bg-card hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Unread
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <MailIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
            {stats.unread}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium mt-1">Awaiting response</p>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60 shadow-sm bg-card hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              In Review / Read
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
            {stats.read}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium mt-1">Under investigation</p>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60 shadow-sm bg-card hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Resolved
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2Icon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.resolved}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium mt-1">Closed inquiries</p>
        </Card>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/30 text-destructive flex items-center gap-3 rounded-2xl">
          <AlertCircleIcon className="w-5 h-5 shrink-0" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      )}

      {/* ── Toolbar: Search & Filter Pills ── */}
      <Card className="p-4 rounded-2xl border-border/60 shadow-sm bg-card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search sender, email, subject, or message..."
              className="pl-9 pr-9 h-10 rounded-xl bg-background text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'all', label: 'All', count: stats.total },
                { id: 'unread', label: 'Unread', count: stats.unread },
                { id: 'read', label: 'Read', count: stats.read },
                { id: 'resolved', label: 'Resolved', count: stats.resolved },
              ] as const
            ).map((filter) => {
              const active = statusFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => {
                    setStatusFilter(filter.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      active
                        ? 'bg-white/20 text-primary-foreground'
                        : 'bg-background/80 text-foreground/80'
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Messages Table / Content ── */}
      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading contact messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-4 border border-border/60">
              <InboxIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No contact messages found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No messages match your selected search or filter criteria.'
                : 'There are currently no customer inquiries submitted.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="mt-4 rounded-xl text-xs font-bold"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4 min-w-[180px]">Sender</th>
                  <th className="py-3 px-4 min-w-[220px]">Subject & Preview</th>
                  <th className="py-3 px-4 min-w-[140px]">Date Received</th>
                  <th className="py-3 px-4 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {messages.map((msg) => {
                  const isUnread = msg.status === 'unread';
                  return (
                    <tr
                      key={msg.id}
                      className={`hover:bg-muted/40 transition-colors group ${
                        isUnread ? 'bg-amber-500/[0.03] font-medium' : ''
                      }`}
                    >
                      {/* Status Column */}
                      <td className="py-3 px-4 text-center">
                        {msg.status === 'unread' && (
                          <span
                            title="Unread"
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30"
                          >
                            Unread
                          </span>
                        )}
                        {msg.status === 'read' && (
                          <span
                            title="Read"
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30"
                          >
                            Read
                          </span>
                        )}
                        {msg.status === 'resolved' && (
                          <span
                            title="Resolved"
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                          >
                            Resolved
                          </span>
                        )}
                      </td>

                      {/* Sender Info */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-xs leading-tight">
                            {msg.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                            {msg.email}
                          </span>
                        </div>
                      </td>

                      {/* Subject & Preview */}
                      <td className="py-3 px-4 cursor-pointer" onClick={() => setSelectedMessage(msg)}>
                        <div className="flex flex-col max-w-md">
                          <span className="font-bold text-foreground text-xs hover:text-primary transition-colors">
                            {msg.subject}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate mt-0.5 font-normal">
                            {msg.message}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3 h-3 opacity-60" />
                          <span>{formatDate(msg.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMessage(msg)}
                            title="View Message Details"
                            className="h-8 px-2 rounded-lg text-primary hover:text-primary hover:bg-primary/10 font-bold"
                          >
                            <EyeIcon className="w-3.5 h-3.5 mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>

                          {msg.status === 'unread' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === msg.id}
                              onClick={() => handleUpdateStatus(msg.id, 'read')}
                              title="Mark as Read"
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                            </Button>
                          ) : msg.status === 'read' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === msg.id}
                              onClick={() => handleUpdateStatus(msg.id, 'resolved')}
                              title="Mark as Resolved"
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2Icon className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === msg.id}
                              onClick={() => handleUpdateStatus(msg.id, 'unread')}
                              title="Re-open (Mark as Unread)"
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                            >
                              <RotateCcwIcon className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading === msg.id}
                            onClick={() => setDeleteTarget(msg)}
                            title="Delete Message"
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2Icon className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Showing <span className="font-bold text-foreground">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-foreground">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-bold text-foreground">{total}</span> messages
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg text-xs font-bold"
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-bold text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 rounded-lg text-xs font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Message Detail Modal ── */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
      >
        {selectedMessage && (
          <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Inquiry Details #{selectedMessage.id}
                </span>

                <div className="flex items-center gap-2">
                  {selectedMessage.status === 'unread' && (
                    <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                      Unread
                    </Badge>
                  )}
                  {selectedMessage.status === 'read' && (
                    <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[10px] font-bold">
                      Read
                    </Badge>
                  )}
                  {selectedMessage.status === 'resolved' && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold">
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>

              <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                {selectedMessage.subject}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submitted on {formatDate(selectedMessage.createdAt)}
              </DialogDescription>
            </DialogHeader>

            {/* Sender Meta Box */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-bold text-xs text-foreground">{selectedMessage.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <MailIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{selectedMessage.email}</span>
                  <button
                    onClick={() => handleCopyEmail(selectedMessage.email)}
                    title="Copy Email"
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    {copiedEmail ? (
                      <CheckIcon className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <CopyIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Direct Reply Email Action */}
              <a
                href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                  `Re: ${selectedMessage.subject} - Zosavuta Support`
                )}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 transition-colors shrink-0"
              >
                <SendIcon className="w-3.5 h-3.5" />
                <span>Reply via Email</span>
              </a>
            </div>

            {/* Message Body Content */}
            <div className="my-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Message Content
              </span>
              <div className="p-4 rounded-2xl bg-background border border-border/60 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans max-h-72 overflow-y-auto selection:bg-primary/20">
                {selectedMessage.message}
              </div>
            </div>

            {/* Status Switcher & Modal Footer */}
            <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                  Status:
                </span>
                <Button
                  variant={selectedMessage.status === 'unread' ? 'default' : 'outline'}
                  size="sm"
                  disabled={actionLoading === selectedMessage.id}
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'unread')}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  Unread
                </Button>
                <Button
                  variant={selectedMessage.status === 'read' ? 'default' : 'outline'}
                  size="sm"
                  disabled={actionLoading === selectedMessage.id}
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'read')}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  Read
                </Button>
                <Button
                  variant={selectedMessage.status === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  disabled={actionLoading === selectedMessage.id}
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'resolved')}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  Resolved
                </Button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(selectedMessage);
                  }}
                  className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <Trash2Icon className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        {deleteTarget && (
          <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
            <DialogHeader className="space-y-2 text-left">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
                <Trash2Icon className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                Delete Contact Message?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete the message from{' '}
                <span className="font-bold text-foreground">{deleteTarget.name}</span> (
                {deleteTarget.subject})? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex items-center justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading === deleteTarget.id}
                onClick={handleDeleteMessage}
                className="rounded-xl text-xs font-bold"
              >
                {actionLoading === deleteTarget.id ? 'Deleting…' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
