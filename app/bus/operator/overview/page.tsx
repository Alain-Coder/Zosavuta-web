import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, getCountFromServer } from 'firebase/firestore';

export default async function OperatorOverviewPage() {
  let busesCount = 0;
  let routesCount = 0;
  let tripsCount = 0;
  let bookingsCount = 0;

  try {
    const snap = await getCountFromServer(query(collection(db, 'buses')));
    busesCount = snap.data().count ?? 0;
  } catch (e) {
    console.error('Failed to get bus count', e);
  }
  try {
    const snap = await getCountFromServer(query(collection(db, 'routes')));
    routesCount = snap.data().count ?? 0;
  } catch (e) {
    console.error('Failed to get route count', e);
  }
  try {
    const snap = await getCountFromServer(query(collection(db, 'trips')));
    tripsCount = snap.data().count ?? 0;
  } catch (e) {
    console.error('Failed to get trip count', e);
  }
  try {
    const snap = await getCountFromServer(query(collection(db, 'bookings')));
    bookingsCount = snap.data().count ?? 0;
  } catch (e) {
    console.error('Failed to get booking count', e);
  }

  const stats = [
    { label: 'Buses', count: busesCount },
    { label: 'Routes', count: routesCount },
    { label: 'Trips', count: tripsCount },
    { label: 'Bookings', count: bookingsCount },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Operator Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
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
