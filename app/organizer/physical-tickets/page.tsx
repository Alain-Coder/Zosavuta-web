'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarIcon, CheckCircle2Icon, PrinterIcon, ScanLineIcon, TicketIcon, Undo2Icon, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { canOrganize } from '@/lib/roles';
import { toast } from 'sonner';
import { downloadTicketPdf } from '@/lib/ticket-pdf';
import { QrScanner } from '@/components/QrScanner';

type EventItem = { id: string; title: string; date: string; time: string; venue: string; ticketsTotal: number };
type Ticket = { id: string; ticketNumber: string; ticketType: string; price: number; status: string; secureToken: string; allocatedAt: string; sellingPointId?: string };
type SellingPoint = { id: string; name: string; location?: string };
type Inventory = { total: number; available: number; allocated: number; sold: number; used: number; returned: number };

const statusStyles: Record<string, string> = {
  ALLOCATED: 'bg-amber-100 text-amber-800', SOLD: 'bg-blue-100 text-blue-800', USED: 'bg-emerald-100 text-emerald-800', AVAILABLE: 'bg-slate-100 text-slate-700',
};

export default function PhysicalTicketsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState('');
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sellingPoints, setSellingPoints] = useState<SellingPoint[]>([]);
  const [newPointName, setNewPointName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [ticketSearch, setTicketSearch] = useState('');
  const [scanToken, setScanToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState<{ result: string; message: string; ticket?: Ticket } | null>(null);
  const [scannerActive, setScannerActive] = useState(false);

  const [selectedTicketNumbers, setSelectedTicketNumbers] = useState<Set<string>>(new Set());
  const [bulkSellingPointId, setBulkSellingPointId] = useState('');

  const loadInventory = async (id: string) => {
    if (!id) return;
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/organizer/physical-tickets?eventId=${id}`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load inventory');
    setInventory(data.inventory);
    setTickets(data.tickets || []);
    setSelectedTicketNumbers(new Set());
    const pointsResponse = await fetch(`/api/organizer/selling-points?eventId=${id}`, { headers });
    setSellingPoints(pointsResponse.ok ? await pointsResponse.json() : []);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth?redirect=/organizer/physical-tickets'); return; }
    const loadEvents = async () => {
      try {
        const roleResponse = await fetch(`/api/users/${user.uid}`);
        const role = roleResponse.ok ? await roleResponse.json() : null;
        if (!role || !canOrganize(role.role)) { router.push('/dashboard'); return; }
        const headers = await getAuthHeaders();
        const response = await fetch('/api/organizer/events', { headers });
        const data = response.ok ? await response.json() : {};
        const nextEvents = Array.isArray(data) ? data : data.events || [];
        setEvents(nextEvents);
        const requestedEventId = new URLSearchParams(window.location.search).get('eventId');
        if (requestedEventId && nextEvents.some((event: EventItem) => String(event.id) === requestedEventId)) setEventId(requestedEventId);
        else if (nextEvents[0]) setEventId(String(nextEvents[0].id));
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load events'); }
    };
    loadEvents();
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!eventId || !user) return;
    loadInventory(eventId).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load inventory'));
  }, [eventId, user]);

  const generate = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/organizer/physical-tickets', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ eventId, quantity: Number(quantity) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to generate tickets');
      toast.success(`${data.tickets.length} physical tickets allocated`);
      await loadInventory(eventId);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to generate tickets'); }
    finally { setBusy(false); }
  };

  const changeTicket = async (action: 'sell' | 'return', ticket: string) => {
    try {
      const response = await fetch(`/api/organizer/physical-tickets/${action}`, { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ eventId, ticket }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Unable to ${action} ticket`);
      toast.success(action === 'sell' ? 'Ticket activated as sold' : 'Ticket destroyed and returned to available inventory');
      setSelectedTicketNumbers((prev) => {
        const next = new Set(prev);
        next.delete(ticket);
        return next;
      });
      await loadInventory(eventId);
    } catch (error) { toast.error(error instanceof Error ? error.message : `Unable to ${action} ticket`); }
  };

  const bulkSell = async (sellAllAllocated = false) => {
    setBusy(true);
    try {
      const targets = sellAllAllocated ? undefined : Array.from(selectedTicketNumbers);
      const response = await fetch('/api/organizer/physical-tickets/sell', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          eventId,
          sellAll: sellAllAllocated,
          tickets: targets,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sell tickets');
      toast.success(`${data.count || 0} ticket(s) activated as sold`);
      setSelectedTicketNumbers(new Set());
      await loadInventory(eventId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sell tickets');
    } finally {
      setBusy(false);
    }
  };

  const bulkAssignPoint = async (sellAllAllocated = false) => {
    if (!bulkSellingPointId) { toast.error('Please select a selling point first'); return; }
    setBusy(true);
    try {
      const targets = sellAllAllocated
        ? tickets.filter((t) => t.status === 'ALLOCATED').map((t) => t.ticketNumber)
        : Array.from(selectedTicketNumbers);
      if (targets.length === 0) { toast.error('No allocated tickets selected'); return; }
      const response = await fetch('/api/organizer/selling-points/assign', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ eventId, tickets: targets, sellingPointId: bulkSellingPointId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to assign tickets');
      toast.success(`${data.count || targets.length} ticket(s) assigned to selling point`);
      setBulkSellingPointId('');
      await loadInventory(eventId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to assign tickets');
    } finally {
      setBusy(false);
    }
  };

  const scan = async (rawToken?: string) => {
    const token = (rawToken ?? scanToken).trim();
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch('/api/organizer/tickets/scan', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ eventId, token }),
      });
      const data = await response.json();
      setScanResult(data);
      setScanToken('');
      await loadInventory(eventId);

      if (data.result === 'VALID_ENTRY' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(120);
      }
    } catch {
      setScanResult({ result: 'INVALID', message: 'Unable to verify ticket' });
    } finally {
      setBusy(false);
    }
  };

  const createSellingPoint = async () => {
    if (!newPointName.trim()) return;
    const response = await fetch('/api/organizer/selling-points', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ eventId, name: newPointName }) });
    const data = await response.json();
    if (!response.ok) { toast.error(data.error || 'Unable to create selling point'); return; }
    setSellingPoints((current) => [...current, data]);
    setNewPointName('');
    toast.success('Selling point created');
  };

  const assignSellingPoint = async (ticket: string, sellingPointId: string) => {
    if (!sellingPointId) return;
    const response = await fetch('/api/organizer/selling-points/assign', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ eventId, ticket, sellingPointId }) });
    const data = await response.json();
    if (!response.ok) { toast.error(data.error || 'Unable to assign ticket'); return; }
    toast.success('Ticket assigned to selling point');
    await loadInventory(eventId);
  };

  const printTickets = async () => {
    if (!selectedEvent) return;
    try {
      await downloadTicketPdf(
        { title: selectedEvent.title, date: selectedEvent.date, time: selectedEvent.time, venue: selectedEvent.venue },
        visibleTickets.filter((ticket) => ticket.status === 'ALLOCATED').map((ticket) => ({ ticketNumber: ticket.ticketNumber, token: ticket.secureToken, ticketType: ticket.ticketType, price: ticket.price }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create ticket PDF');
    }
  };

  const selectedEvent = events.find((event) => String(event.id) === eventId);
  const visibleTickets = tickets.filter((ticket) => ticket.ticketNumber.toLowerCase().includes(ticketSearch.toLowerCase()) || ticket.status.toLowerCase().includes(ticketSearch.toLowerCase()));
  const allocatedTickets = visibleTickets.filter((t) => t.status === 'ALLOCATED');
  const isAllSelected = allocatedTickets.length > 0 && allocatedTickets.every((t) => selectedTicketNumbers.has(t.ticketNumber));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTicketNumbers(new Set());
    } else {
      setSelectedTicketNumbers(new Set(allocatedTickets.map((t) => t.ticketNumber)));
    }
  };

  const handleToggleSelect = (ticketNumber: string) => {
    setSelectedTicketNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(ticketNumber)) next.delete(ticketNumber);
      else next.add(ticketNumber);
      return next;
    });
  };

  if (authLoading || !user) return <div className="p-8 text-muted-foreground">Loading ticket management...</div>;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Physical inventory</p><h1 className="mt-2 text-3xl font-black">Ticket control room</h1><p className="mt-1 text-sm text-muted-foreground">Allocate bearer tickets, activate sales, and admit guests securely.</p></div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
              });
            } catch (err) {
              console.error('Camera access denied:', err);
            }
          }}
        >
          <ScanLineIcon /> Open scanner
        </Button>
      </header>

      <Card className="p-4"><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Event</label><select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select an event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select>{selectedEvent && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarIcon className="size-4" /> {selectedEvent.date} at {selectedEvent.time} · {selectedEvent.venue}</p>}</Card>

      {inventory && <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">{[['Total', inventory.total], ['Available', inventory.available], ['Allocated', inventory.allocated], ['Sold', inventory.sold], ['Used', inventory.used], ['Returned', inventory.returned]].map(([label, value]) => <Card key={String(label)} className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Card>)}</div>}

      {eventId && <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">Generate and print</h2><p className="text-sm text-muted-foreground">Printed tickets remain invalid until a selling point marks them sold.</p></div><Button variant="outline" onClick={printTickets} disabled={!tickets.length}><PrinterIcon /> Print / Save PDF</Button></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Input type="number" min="1" max={inventory?.available || 1} value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantity to generate" /><Button onClick={generate} disabled={busy || !inventory || Number(quantity) > inventory.available || Number(quantity) < 1}><TicketIcon /> {busy ? 'Generating...' : 'Generate tickets'}</Button></div>{inventory && Number(quantity) > inventory.available && <p className="mt-2 text-sm font-semibold text-destructive">Only {inventory.available} tickets are currently available.</p>}
          <div className="mt-6 space-y-3 print:grid print:grid-cols-2">{visibleTickets.map((ticket) => <article key={ticket.id} className="ticket-print flex items-center justify-between gap-3 rounded-lg border p-3 print:break-inside-avoid"><div><p className="font-mono text-sm font-bold">{ticket.ticketNumber}</p><p className="text-xs text-muted-foreground">{ticket.ticketType} · MWK {Number(ticket.price).toLocaleString()}</p><Badge className={`mt-2 ${statusStyles[ticket.status] || ''}`}>{ticket.status}</Badge></div><QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/tickets/verify/${ticket.secureToken}`} size={72} includeMargin /></article>)}</div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Selling points</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create distribution points and assign allocated stock.</p>
            <div className="mt-4 flex gap-2"><Input placeholder="Point name" value={newPointName} onChange={(event) => setNewPointName(event.target.value)} /><Button size="icon" onClick={createSellingPoint} title="Create selling point">+</Button></div>
            <div className="mt-4 space-y-2">{sellingPoints.map((point) => <div key={point.id} className="rounded-md border p-2 text-sm font-semibold">{point.name}</div>)}</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Activate or return</h2>
                <p className="mt-1 text-xs text-muted-foreground">Search, sell in bulk, or return & destroy tickets.</p>
              </div>
            </div>

            <Input className="mt-4" placeholder="EVT-... ticket number search" value={ticketSearch} onChange={(event) => setTicketSearch(event.target.value)} />

            {/* Bulk Actions Header with Select All */}
            {allocatedTickets.length > 0 && (
              <div className="mt-3 space-y-2">
                {/* Select All + Sell controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
                  <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    Select All ({allocatedTickets.length})
                  </label>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => bulkSell(false)}
                      disabled={busy || selectedTicketNumbers.size === 0}
                    >
                      <CheckCircle2Icon className="size-3.5" />
                      Sell Selected ({selectedTicketNumbers.size})
                    </Button>
                    {/* <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => bulkSell(true)}
                      disabled={busy}
                    >
                      <CheckCircle2Icon className="size-3.5" />
                      Sell All Allocated
                    </Button> */}
                  </div>
                </div>

                {/* Bulk Assign Selling Point */}
                {sellingPoints.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Assign point:</span>
                    <select
                      className="h-7 flex-1 min-w-[120px] rounded-md border bg-background px-2 text-xs"
                      value={bulkSellingPointId}
                      onChange={(e) => setBulkSellingPointId(e.target.value)}
                    >
                      <option value="">Select selling point...</option>
                      {sellingPoints.map((point) => (
                        <option key={point.id} value={point.id}>{point.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1"
                      onClick={() => bulkAssignPoint(false)}
                      disabled={busy || selectedTicketNumbers.size === 0 || !bulkSellingPointId}
                    >
                      Assign Selected ({selectedTicketNumbers.size})
                    </Button>
                    {/* <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 gap-1"
                      onClick={() => bulkAssignPoint(true)}
                      disabled={busy || !bulkSellingPointId}
                    >
                      Assign All
                    </Button> */}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 max-h-80 space-y-2 overflow-auto">
              {visibleTickets.map((ticket) => {
                const isSelected = selectedTicketNumbers.has(ticket.ticketNumber);
                return (
                  <div key={ticket.id} className={`space-y-2 rounded-md border p-2 transition ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        {ticket.status === 'ALLOCATED' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(ticket.ticketNumber)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 shrink-0"
                          />
                        )}
                        <span className="truncate font-mono text-xs font-semibold">{ticket.ticketNumber}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusStyles[ticket.status] || ''}`}>{ticket.status}</Badge>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {ticket.status === 'ALLOCATED' && (
                          <>
                            <Button size="icon-sm" onClick={() => changeTicket('sell', ticket.ticketNumber)} title="Mark ticket sold" className="bg-emerald-600 text-white hover:bg-emerald-700">
                              <CheckCircle2Icon />
                            </Button>
                            <Button size="icon-sm" variant="outline" onClick={() => changeTicket('return', ticket.ticketNumber)} title="Destroy & Return ticket" className="text-red-600 hover:bg-red-50 border-red-200">
                              <Undo2Icon />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {ticket.status === 'ALLOCATED' && sellingPoints.length > 0 && (
                      <select className="h-8 w-full rounded-md border bg-background px-2 text-xs" value={ticket.sellingPointId || ''} onChange={(event) => assignSellingPoint(ticket.ticketNumber, event.target.value)}>
                        <option value="">Assign selling point...</option>
                        {sellingPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold">Entry scan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Point the camera at a ticket QR code, or paste a token manually.
            </p>

            <QrScanner
              paused={busy}
              onDecoded={(value) => {
                // The QR encodes a full URL like https://app/tickets/verify/<token>
                // Extract the trailing token if it's a URL.
                let token = value.trim();
                try {
                  const url = new URL(token);
                  const parts = url.pathname.split('/').filter(Boolean);
                  token = parts[parts.length - 1] || token;
                } catch {
                  /* not a URL, use raw value */
                }
                void scan(token);
              }}
              onError={(message) => toast.error(message)}
            />

            <Input
              className="mt-4"
              value={scanToken}
              onChange={(event) => setScanToken(event.target.value)}
              placeholder="Secure token or verification URL"
              onKeyDown={(event) => {
                if (event.key === 'Enter') scan();
              }}
            />
            <Button
              className="mt-3 w-full"
              onClick={() => scan()}
              disabled={!scanToken.trim() || busy}
            >
              <ScanLineIcon /> {busy ? 'Verifying…' : 'Verify and admit'}
            </Button>

            {scanResult && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm font-bold ${scanResult.result === 'VALID_ENTRY'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-red-300 bg-red-50 text-red-800'
                  }`}
              >
                <p className="flex items-center gap-2">
                  {scanResult.result === 'VALID_ENTRY' ? <CheckCircle2Icon /> : <XCircleIcon />}
                  {scanResult.message}
                </p>
                {scanResult.ticket && (
                  <p className="mt-2 font-mono text-xs">{scanResult.ticket.ticketNumber}</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </section>}
      <style jsx global>{`@media print { body * { visibility: hidden; } .ticket-print, .ticket-print * { visibility: visible; } .ticket-print { position: relative; } }`}</style>
    </main>
  );
}