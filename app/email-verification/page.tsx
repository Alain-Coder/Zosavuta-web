'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { getAuthHeaders } from '@/lib/auth-client';

function EmailVerificationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const sendFailed = searchParams.get('sendFailed') === '1';
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const confirm = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to verify your email.');
      setVerified(true);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/email-verification/send', {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send the verification email.');
      setMessage(result.message);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-12">
      <Card className="w-full space-y-5 p-8 text-center">
        <h1 className="text-2xl font-bold">{verified ? 'Email verified' : 'Verify your email address'}</h1>
        {verified ? (
          <>
            <p>Your email address is verified. You can now sign in and continue.</p>
            <Link href="/auth"><Button className="w-full">Continue to sign in</Button></Link>
          </>
        ) : token ? (
          <>
            <p>Confirm this action to complete email verification.</p>
            <Button className="w-full" disabled={loading} onClick={confirm}>
              {loading ? 'Verifying...' : 'Confirm email address'}
            </Button>
          </>
        ) : (
          <>
            <p>We sent a verification link to your email. Check your inbox and spam or junk folder. The link expires after 30 minutes.</p>
            {sendFailed && <p role="alert" className="text-sm text-amber-700">We could not send the email just now. Use the button below to request another verification link.</p>}
            {!authLoading && user && <Button className="w-full" disabled={loading} onClick={resend}>{loading ? 'Sending...' : 'Resend verification email'}</Button>}
            {!authLoading && !user && <Link className="text-primary underline" href="/auth">Sign in to resend the verification email</Link>}
          </>
        )}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </Card>
    </main>
  );
}

export default function EmailVerificationPage() {
  return <Suspense fallback={<main className="p-12 text-center">Loading...</main>}><EmailVerificationContent /></Suspense>;
}
