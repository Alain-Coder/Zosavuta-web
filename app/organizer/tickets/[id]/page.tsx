'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { AlertCircle, ClockIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function TicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [eventTitle, setEventTitle] = useState('');

  const [ticketData, setTicketData] = useState({
    ticketsTotal: '500',
    price: '3500',
    category: 'music',
    time: '18:00',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=/organizer/tickets/${submissionId}`);
    }
  }, [user, authLoading, router, submissionId]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/event-submissions/${submissionId}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load submission');

        if (data.status !== 'pending') {
          router.push('/organizer/dashboard');
          return;
        }

        if (data.ticketDetailsSubmitted) {
          router.push('/organizer/dashboard');
          return;
        }

        setEventTitle(data.title);
        setTicketData({
          ticketsTotal: data.ticketsTotal ? String(data.ticketsTotal) : '500',
          price: data.price ? String(data.price) : '3500',
          category: data.category || 'music',
          time: data.time || '18:00',
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, submissionId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/event-submissions/${submissionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          price: parseInt(ticketData.price),
          ticketsTotal: parseInt(ticketData.ticketsTotal),
          category: ticketData.category,
          time: ticketData.time,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save ticket details');

      toast.success('Tickets submitted for admin approval');
      router.push('/organizer/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save ticket details';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card className="p-8">
        <h1 className="text-2xl font-bold mb-1">Add Ticket Details</h1>
        <p className="text-muted-foreground mb-6">For: <strong>{eventTitle}</strong></p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 mb-6">
          <ClockIcon className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Event status is <strong>pending</strong>. Tickets will not go live until admin approval.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Field>
            <FieldLabel>Ticket Category *</FieldLabel>
            <select value={ticketData.category} onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background" required>
              <option value="music">Music</option>
              <option value="sports">Sports</option>
              <option value="conference">Conference</option>
              <option value="festival">Festival</option>
              <option value="workshop">Workshop</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Number of Tickets *</FieldLabel>
              <Input type="number" min="1" value={ticketData.ticketsTotal}
                onChange={(e) => setTicketData({ ...ticketData, ticketsTotal: e.target.value })} required />
            </Field>
            <Field>
              <FieldLabel>Price per Ticket (MWK) *</FieldLabel>
              <Input type="number" min="1" value={ticketData.price}
                onChange={(e) => setTicketData({ ...ticketData, price: e.target.value })} required />
            </Field>
          </div>
          <Field>
            <FieldLabel>Event Time *</FieldLabel>
            <Input type="time" value={ticketData.time}
              onChange={(e) => setTicketData({ ...ticketData, time: e.target.value })} required />
          </Field>
          <Button type="submit" disabled={saving} className="w-full h-12 font-semibold">
            {saving ? 'Submitting...' : 'Submit Tickets for Admin Approval'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
