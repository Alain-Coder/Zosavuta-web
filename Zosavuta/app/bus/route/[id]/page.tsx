'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function RouteDetailPage() {
  const params = useParams();
  const routeId = params.id as string;
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(`/api/bus/routes`);
        if (res.ok) {
          const routes = await res.json();
          const found = routes.find((r: any) => r.id === routeId);
          setRoute(found || null);
        } else {
          setRoute(null);
        }
      } catch {
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [routeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Route not found</p>
      </div>
    );
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
