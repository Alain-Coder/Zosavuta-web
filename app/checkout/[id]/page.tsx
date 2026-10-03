'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, ShieldCheck, TagIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';

interface EventDetails {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  ticketsAvailable: number;
  ticketTypes?: Array<{ name: string; price: number }>;
}

function CheckoutContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [details, setDetails] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const resaleListingId = searchParams.get('resale');
  const paymentReturn = searchParams.has('payment') || searchParams.has('paymentStatus');
  const paymentStatus = searchParams.get('status') || searchParams.get('paymentStatus') || searchParams.get('payment') || 'pending';
  const quantity = resaleListingId ? 1 : Math.max(1, Number(searchParams.get('qty') || 1));
  const tier = resaleListingId ? 'Resale' : (searchParams.get('tier') || 'Standard');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/auth?redirect=${encodeURIComponent(`/checkout/${id}${resaleListingId ? `?resale=${resaleListingId}` : ''}`)}`);
    }
  }, [authLoading, id, resaleListingId, router, user]);

  useEffect(() => {
    if (paymentReturn) {
      setLoadingEvent(false);
      return;
    }
    const loadEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();
        setEvent(response.ok ? data.event || data : null);
      } catch {
        setEvent(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    if (id) void loadEvent();
  }, [id, paymentReturn]);

  const startPayment = async (eventSubmit: FormEvent<HTMLFormElement>) => {
    eventSubmit.preventDefault();
    if (!user || !event) return;
    setSubmitting(true);
    setError('');

    try {
      const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) };

      if (resaleListingId) {
        // ─── SECONDARY RESALE CHECKOUT FLOW ───
        const resaleResponse = await fetch('/api/resale/initialize-payment', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            listingId: resaleListingId,
            buyerId: user.uid,
            email: details.email || user.email || '',
            firstName: details.firstName || 'Buyer',
            lastName: details.lastName || 'Buyer',
          }),
        });

        const resaleData = await resaleResponse.json();
        if (!resaleResponse.ok) throw new Error(resaleData.error || 'Resale purchase failed');

        setPendingOrderId(resaleData.orderId);
        window.location.assign(resaleData.checkoutUrl);
      } else {
        // ─── PRIMARY TICKET CHECKOUT FLOW ───
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({ eventId: event.id, quantity, tier, ...details }),
        });
        const order = await orderResponse.json();
        if (!orderResponse.ok) throw new Error(order.error || 'Unable to create order');
        setPendingOrderId(order.id);

        const paymentResponse = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers,
          body: JSON.stringify({ orderId: order.id }),
        });
        const payment = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(payment.error || 'Unable to initialize payment');
        window.location.assign(payment.checkoutUrl);
      }
    } catch (paymentError) {
      setPendingOrderId('');
      setError(paymentError instanceof Error ? paymentError.message : 'Payment could not be started');
      setSubmitting(false);
    }
  };

  if (authLoading || loadingEvent || !user) {
    return <CheckoutLoading />;
  }
  if (paymentReturn) {
    const paymentSucceeded = ['success', 'successful', 'paid', 'completed'].includes(paymentStatus.toLowerCase());
    return (
      <main className="mx-auto max-w-xl px-4 py-20">
        <Card className="p-8 text-center">
          <CheckCircle2 className={`mx-auto mb-4 h-14 w-14 ${paymentSucceeded ? 'text-emerald-600' : 'text-amber-600'}`} />
          <h1 className="text-3xl font-black">{paymentSucceeded ? 'Payment successful' : 'Payment received for verification'}</h1>
          <p className="mt-3 text-muted-foreground">{paymentSucceeded ? 'Your payment was received. Your digital tickets will appear after server-side PayChangu confirmation.' : 'Your payment is being verified by PayChangu. Your tickets will appear once confirmation is complete.'}</p>
          {searchParams.get('tx_ref') && <p className="mt-4 font-mono text-xs text-muted-foreground">Reference: {searchParams.get('tx_ref')}</p>}
          <Link href="/my-bookings"><Button className="mt-7 w-full">Go to My Tickets</Button></Link>
        </Card>
      </main>
    );
  }
  if (!event) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center">Event not found.</div>;
  }
  if (pendingOrderId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20">
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-amber-600" />
          <h1 className="text-2xl font-bold">Payment started</h1>
          <p className="mt-3 text-muted-foreground">Your order is pending provider verification. Tickets will appear after PayChangu confirms payment.</p>
          <p className="mt-4 font-mono text-sm">Order: {pendingOrderId}</p>
          <Link href="/my-bookings"><Button className="mt-6">View My Tickets</Button></Link>
        </Card>
      </main>
    );
  }

  const configuredType = event.ticketTypes?.find((type) => type.name.toLowerCase() === tier.toLowerCase());
  const unitPrice = configuredType ? Number(configuredType.price) : Number(event.price);
  const total = unitPrice * quantity;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href={resaleListingId ? '/marketplace' : `/events/${id}`} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <ChevronLeft className="h-4 w-4" /> {resaleListingId ? 'Back to marketplace' : 'Back to event'}
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Card className="p-6 sm:p-8">
          <div className="mb-8 flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{resaleListingId ? 'Secondary Resale Checkout' : 'Secure Checkout'}</h1>
              <p className="text-sm text-muted-foreground">
                {resaleListingId ? 'Ticket transfer & payment is verified by PayChangu & Zosavuta.' : 'Payment is verified by PayChangu.'}
              </p>
            </div>
          </div>
          {resaleListingId && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 p-3 text-xs font-bold text-orange-800">
              <TagIcon className="h-4 w-4 text-orange-600" />
              <span>You are purchasing a verified secondary fan resale ticket. Upon PayChangu payment confirmation, ownership will be transferred atomically.</span>
            </div>
          )}
          {error && <div className="mb-6 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          <form onSubmit={startPayment} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="firstName">First name</Label><Input id="firstName" required value={details.firstName} onChange={(e) => setDetails({ ...details, firstName: e.target.value })} /></div>
              <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" required value={details.lastName} onChange={(e) => setDetails({ ...details, lastName: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={details.email || user.email || ''} onChange={(e) => setDetails({ ...details, email: e.target.value })} /></div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" required value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></div>
            <Button type="submit" disabled={submitting} className="w-full cursor-pointer">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting to PayChangu...</> : `Pay MWK ${total.toLocaleString()}`}</Button>
          </form>
        </Card>
        <Card className="h-fit p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order summary</p>
          <h2 className="mt-2 text-lg font-bold">{event.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{event.date} · {event.time}</p>
          <p className="text-sm text-muted-foreground">{event.venue}</p>
          <div className="mt-6 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><span>{tier} x {quantity}</span><span>MWK {total.toLocaleString()}</span></div>
            <div className="flex justify-between border-t pt-3 font-bold"><span>Total</span><span>MWK {total.toLocaleString()}</span></div>
          </div>
        </Card>
      </div>
    </main>
  );
}

function CheckoutLoading() {
  return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}

export default function CheckoutPage() {
  return <Suspense fallback={<CheckoutLoading />}><CheckoutContent /></Suspense>;
}
