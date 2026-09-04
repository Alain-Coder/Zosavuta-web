'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  basePrice: number;
}

export default function BusHomePage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch('/api/bus/routes');
        if (res.ok) {
          const data = await res.json();
          setRoutes(data);
        }
      } catch (e) {
        console.error('Failed to fetch bus routes', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Bus Ticketing</h1>
      <p className="text-muted-foreground">
        Browse available bus routes and book your tickets instantly.
      </p>
      {routes.length === 0 ? (
        <p className="text-muted-foreground">No bus routes available yet.</p>
      ) : (
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
      )}
    </div>
  );
}
