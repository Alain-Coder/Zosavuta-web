import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import SeatMap, { Seat } from '@/components/SeatMap';
import { getAuthHeaders } from '@/lib/auth-client';

type Trip = {
  id: string;
  departureTime: string;
  origin: string;
  destination: string;
  seatCount: number;
};

export default function OperatorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  // Ensure user is logged in and has operator role
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }
    if (user) {
      fetch(`/api/users/${user.uid}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.role !== 'operator') {
            toast.error('Access denied');
            router.push('/dashboard');
          }
        })
        .catch(() => {});
    }
  }, [authLoading, user, router]);

  // Load trips for this operator and generate placeholder seats
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/operator/trips?operatorId=${user.uid}`, { headers });
        const trips: Trip[] = res.ok ? await res.json() : [];
        const current = trips[0] ?? null;
        setTrip(current);
        if (current) {
          // Build 40 seats (10 rows × 4 columns) as placeholder
          const rows = 10;
          const cols = 4;
          const generated: Seat[] = [];
          let num = 1;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              generated.push({ number: String(num), row: r, col: c, status: 'available' });
              num++;
            }
          }
          setSeats(generated);
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load trips');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return <p className="text-center text-muted-foreground">No trips assigned. Contact admin.</p>;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Trip {trip.id}</h1>
      <p>{trip.origin} → {trip.destination}</p>
      <p className="text-muted-foreground mb-6">Departure: {new Date(trip.departureTime).toLocaleString()}</p>
      <SeatMap tripId={trip.id} initialSeats={seats} onSeatChange={setSeats} />
    </main>
  );
}
