'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';
import { canOrganize, isAdmin } from '@/lib/roles';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  event: string;
  purchaser: string;
  quantity: number;
  price: number;
  status: string;
  purchasedAt: string;
}

export default function OrganizerTickets() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/organizer/tickets');
    }
  }, [user, authLoading, router]);

  // Fetch role and tickets
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
        const ticketsRes = await fetch('/api/organizer/tickets', { headers });
        const data: Ticket[] = ticketsRes.ok ? await ticketsRes.json() : [];
        setTickets(data);
      } catch (err) {
        console.error('Error loading tickets', err);
        toast.error('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, router]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <Link href="/organizer/dashboard">
          <Button variant="outline" className="h-10 px-6">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>
      <TicketTable tickets={tickets} />
    </div>
  );
}

function TicketTable({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-4">No tickets yet</p>
        <Link href="/organizer">
          <Button className="bg-primary hover:bg-primary/90">Submit Your First Ticket</Button>
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
              <th className="px-6 py-3 text-left font-semibold">Ticket ID</th>
              <th className="px-6 py-3 text-left font-semibold">Event</th>
              <th className="px-6 py-3 text-left font-semibold">Purchaser</th>
              <th className="px-6 py-3 text-left font-semibold">Qty</th>
              <th className="px-6 py-3 text-left font-semibold">Price (MWK)</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Purchased At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-muted/50 transition">
                <td className="px-6 py-4 font-medium">{t.id}</td>
                <td className="px-6 py-4">{t.event}</td>
                <td className="px-6 py-4">{t.purchaser}</td>
                <td className="px-6 py-4 text-center">{t.quantity}</td>
                <td className="px-6 py-4">{t.price.toLocaleString()}</td>
                <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                <td className="px-6 py-4 text-muted-foreground">{t.purchasedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-gray-100 text-gray-600',
    redeemed: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
