'use client';

import React, { useState, useEffect } from 'react';
import { getTripsByOperator } from '@/lib/bus/api';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchTrips = async () => {
      try {
        const data = await getTripsByOperator(user.uid);
        setTrips(data);
      } catch (e) {
        console.error('Failed to fetch trips', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trip Scheduling</h1>
      {trips.length === 0 ? (
        <p>No trips scheduled yet.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          {trips.map(trip => (
            <li key={trip.id}>
              Trip ID: {trip.id} – Seats Available: {trip.seatsAvailable} – Price: MWK {trip.price}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
