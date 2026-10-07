'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, ArrowLeftIcon, Eye, EyeOff, UserIcon, BriefcaseIcon, UsersIcon, CheckCircle2 } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getPostAuthPath } from '@/lib/auth-redirect';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-errors';
import { setSessionExpiry } from '@/lib/auth-session';
import { getAuthHeaders } from '@/lib/auth-client';
import type { UserRole } from '@/lib/roles';

type AuthMode = 'signin' | 'signup' | 'forgot_password';
type SignupRole = 'customer' | 'organizer' | 'customer_organizer';

function AuthContent() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get('redirect');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SignupRole>('customer');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const applyAuthPersistence = async () => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  };

  const fetchUserRoleStrict = async (uid: string): Promise<UserRole> => {
    let res: Response;
    try {
      res = await fetch(`/api/users/${uid}`);
    } catch {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Account role could not be verified. Please contact support.');
      }
      throw new Error(`Server error (${res.status}): Failed to retrieve your account permissions.`);
    }

    const data = await res.json();
    if (!data?.role) {
      throw new Error('No role is configured for this account. Please contact an administrator.');
    }
    return data.role as UserRole;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot_password') {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        await sendPasswordResetEmail(auth, email.trim());
        setSuccess('Password reset link sent! Check your email inbox for instructions. If you don’t see the email, please check your Spam or Junk folder.');
        return;
      }

      await applyAuthPersistence();

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (fullName.trim() === '') {
          throw new Error('Full name is required');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: fullName });

        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
            body: JSON.stringify({ uid: user.uid, fullName, email, role }),
          });
          if (!res.ok) {
            throw new Error('Failed to register account profile in database.');
          }
        } catch (dbErr: any) {
          await signOut(auth);
          throw new Error(dbErr?.message || 'Network error: Failed to save user account in the database. Please try again.');
        }

        setSessionExpiry(rememberMe);
        router.push(getPostAuthPath(role, redirectPath));
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        try {
          const userRole = await fetchUserRoleStrict(user.uid);
          setSessionExpiry(rememberMe);
          router.push(getPostAuthPath(userRole, redirectPath));
        } catch (roleErr: any) {
          // If MySQL role wasn't available or network issues:
          // Immediately sign out so user isn't left in half-authenticated state
          await signOut(auth);
          throw roleErr;
        }
      }
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center px-4 py-12">
      <Card className={`w-full ${mode === 'signup' ? 'max-w-2xl' : 'max-w-md'} transition-all duration-300 shadow-xl`}>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 w-14 h-14 relative">
              <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Zosavuta</h1>
            <p className="text-muted-foreground">
              {mode === 'signin'
                ? 'Sign in to your account'
                : mode === 'signup'
                  ? 'Create your account'
                  : 'Reset your password'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}

            {mode === 'forgot_password' ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Enter your account email address and we&apos;ll send you a password reset link.
                </p>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="mt-2"
                    required
                  />
                </div>
              </div>
            ) : mode === 'signup' ? (
              <div className="space-y-5">
                {/* Full Name & Email in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      className="mt-1.5"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="mt-1.5"
                      required
                    />
                  </div>
                </div>

                {/* Password & Confirm Password in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role selection in 3 inline columns */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    I want to...
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <RoleOption
                      active={role === 'customer'}
                      onClick={() => setRole('customer')}
                      icon={<UserIcon className="w-5 h-5 flex-shrink-0" />}
                      label="Attend Events"
                      description="Browse and buy tickets"
                      color="primary"
                    />
                    <RoleOption
                      active={role === 'organizer'}
                      onClick={() => setRole('organizer')}
                      icon={<BriefcaseIcon className="w-5 h-5 flex-shrink-0" />}
                      label="Organize Events"
                      description="Create and manage events"
                      color="primary"
                    />
                    <RoleOption
                      active={role === 'customer_organizer'}
                      onClick={() => setRole('customer_organizer')}
                      icon={<UsersIcon className="w-5 h-5 flex-shrink-0" />}
                      label="Attend & Organize"
                      description="Both tickets and events"
                      color="primary"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loading}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 text-base mt-2 cursor-pointer"
            >
              {loading
                ? 'Loading...'
                : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Create Account'
                    : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'forgot_password' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-primary font-semibold hover:underline cursor-pointer inline-flex items-center gap-1.5"
              >
                <ArrowLeftIcon className="h-4 w-4" /> Remember your password? Sign in
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError('');
                    setSuccess('');
                  }}
                  className="ml-2 text-primary font-semibold hover:underline cursor-pointer"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => router.replace('/')} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
              <ArrowLeftIcon className="h-4 w-4" /> Back to home
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RoleOption({
  active,
  onClick,
  icon,
  label,
  description,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: 'primary' | 'secondary';
}) {
  const activeClass =
    color === 'primary'
      ? 'border-primary bg-primary/5 text-primary'
      : 'border-secondary bg-secondary/5 text-secondary';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 p-3 rounded-xl border-2 transition-all text-left w-full h-full ${active ? activeClass : 'border-border hover:border-primary/20'
        }`}
    >
      <div className="mt-0.5">{icon}</div>
      <div>
        <span className="text-xs font-bold block leading-tight">{label}</span>
        <span className="text-[11px] text-muted-foreground block mt-1 leading-snug">{description}</span>
      </div>
    </button>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
