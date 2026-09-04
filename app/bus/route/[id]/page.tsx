import React from 'react';
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Route } from '@/lib/bus/types';
import { MOCK_ROUTES } from '@/lib/bus/mock-data';

export async function generateStaticParams() {
  return MOCK_ROUTES.map((route) => ({ id: route.id }));
}

export default async function RouteDetailPage({ params }: { params: { id: string } }) {
  let route: Route | undefined;

  try {
    const routeRef = doc(db, 'routes', params.id);
    const snap = await getDoc(routeRef);
    if (snap.exists()) {
      route = snap.data() as Route;
    }
  } catch (error) {
    console.warn('Firestore unavailable, using mock route detail fallback', error);
  }

  if (!route) {
    route = MOCK_ROUTES.find((item) => item.id === params.id);
  }

  if (!route) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-primary">{route.name}</h1>
      <p className="text-muted-foreground">
        {route.origin} → {route.destination}
      </p>
      <p className="text-lg">Base price: MWK {route.basePrice ?? 0}</p>
      {/* Add more details, booking button, schedule, etc. */}
    </div>
  );
}
