'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStats } from '@/lib/bus/api';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function OperatorOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ buses: 0, routes: 0, trips: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchStats = async () => {
      try {
        const data = await getDashboardStats(user.uid);
        setStats(data);
      } catch (e) {
        console.error('Failed to fetch operator stats', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const statCards = [
    { label: 'Buses', count: stats.buses },
    { label: 'Routes', count: stats.routes },
    { label: 'Trips', count: stats.trips },
    { label: 'Bookings', count: stats.bookings },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Operator Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="p-6 bg-card rounded-xl border border-border/30 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">{s.label}</h2>
            <p className="mt-2 text-3xl font-bold text-primary">{s.count}</p>
          </div>
        ))}
      </div>
      <nav className="flex space-x-4 mt-6">
        <Link href="/bus/operator/buses" className="text-primary hover:underline">Bus Management</Link>
        <Link href="/bus/operator/routes" className="text-primary hover:underline">Route Management</Link>
        <Link href="/bus/operator/trips" className="text-primary hover:underline">Trip Scheduling</Link>
        <Link href="/bus/operator/bookings" className="text-primary hover:underline">Bookings</Link>
        <Link href="/bus/operator/manifest" className="text-primary hover:underline">Passenger Manifest</Link>
        <Link href="/bus/operator/validation" className="text-primary hover:underline">Ticket Validation</Link>
        <Link href="/bus/operator/reports" className="text-primary hover:underline">Reports</Link>
        <Link href="/bus/operator/settings" className="text-primary hover:underline">Settings</Link>
      </nav>
    </div>
  );
}
