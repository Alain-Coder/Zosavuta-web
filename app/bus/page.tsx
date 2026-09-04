import React from 'react';
import Link from 'next/link';
import { MOCK_ROUTES } from '@/lib/bus/mock-data';

export default function BusHomePage() {
  const routes = MOCK_ROUTES;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Bus Ticketing</h1>
      <p className="text-muted-foreground">
        Browse available bus routes and book your tickets instantly.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route) => (
          <Link
            key={route.id}
            href={`/bus/route/${route.id}`}
            className="p-6 bg-card rounded-xl border border-border/30 hover:border-primary/50 transition-shadow shadow-sm hover:shadow-md"
          >
            <h2 className="font-semibold text-lg text-foreground mb-2">
              {route.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {route.origin} → {route.destination}
            </p>
            <p className="mt-2 text-sm text-primary">
              Base price: MWK {route.basePrice ?? 0}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
