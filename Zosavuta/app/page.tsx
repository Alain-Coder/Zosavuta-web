'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPostAuthPath } from '@/lib/auth-redirect';
import type { UserRole } from '@/lib/roles';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth');
      return;
    }

    const redirect = async () => {
      try {
        const res = await fetch(`/api/users/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          router.replace(getPostAuthPath(data.role as UserRole));
        } else {
          router.replace('/dashboard');
        }
      } catch {
        router.replace('/dashboard');
      }
    };

    redirect();
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Redirecting...</p>
      </div>
    </div>
  );
}
