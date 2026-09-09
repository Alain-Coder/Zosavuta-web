'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';

export default function PhysicalVerification({ token, eventId, ticket }: { token: string; eventId: number; ticket: any }) {
  const { user, loading } = useAuth();
  const [result, setResult] = useState<{ result: string; message?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user || loading || result) return;
    setChecking(true);
    getAuthHeaders().then((headers) => fetch('/api/organizer/tickets/scan', { method: 'POST', headers, body: JSON.stringify({ eventId, token }) }))
      .then((response) => response.json())
      .then(setResult)
      .catch(() => setResult({ result: 'INVALID', message: 'Unable to verify ticket' }))
      .finally(() => setChecking(false));
  }, [eventId, loading, result, token, user]);

  if (loading) return <p className="mt-5 text-sm text-muted-foreground">Checking organizer access...</p>;
  if (!user) return <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-bold">Organizer login required</p><p className="mt-1">Sign in with an account authorized to manage this event before scanning this physical ticket.</p><div className="mt-3 flex flex-wrap gap-3"><Link className="font-bold underline" href={`/auth?redirect=${encodeURIComponent(`/tickets/verify/${token}`)}`}>Sign in to verify</Link><button type="button" className="font-bold underline" onClick={() => window.location.reload()}>I signed in another tab</button></div></div>;
  return <p className={`mt-5 font-bold ${result?.result === 'VALID_ENTRY' ? 'text-emerald-700' : 'text-red-700'}`}>{checking ? 'Verifying physical ticket...' : result?.message || 'Ticket verification completed.'}</p>;
}
