'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Eye, EyeOff, UserIcon, BriefcaseIcon, UsersIcon } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getPostAuthPath } from '@/lib/auth-redirect';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-errors';
import { setSessionExpiry } from '@/lib/auth-session';
import type { UserRole } from '@/lib/roles';

type AuthMode = 'signin' | 'signup';
type SignupRole = 'customer' | 'organizer' | 'customer_organizer';

function AuthContent() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SignupRole>('customer');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const applyAuthPersistence = async () => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  };

  const resolveUserRole = async (uid: string, fallback: UserRole): Promise<UserRole> => {
    try {
      const res = await fetch(`/api/users/${uid}`);
      if (res.ok) {
        const data = await res.json();
        return (data.role as UserRole) ?? fallback;
      }
    } catch {
      // API unreachable — use fallback
    }
    return fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, fullName, email, role }),
          });
        } catch {
          console.warn('User sync to API failed, proceeding anyway.');
        }

        setSessionExpiry(rememberMe);
        router.push(getPostAuthPath(role, redirectPath));
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        setSessionExpiry(rememberMe);
        const userRole = await resolveUserRole(user.uid, 'customer');
        router.push(getPostAuthPath(userRole, redirectPath));
      }
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-3 w-14 h-14 relative">
              <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Zosavuta</h1>
            <p className="text-muted-foreground">
              {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-4">
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
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    I want to...
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    <RoleOption
                      active={role === 'customer'}
                      onClick={() => setRole('customer')}
                      icon={<UserIcon className="w-5 h-5" />}
                      label="Attend Events"
                      description="Browse and buy tickets"
                      color="primary"
                    />
                    <RoleOption
                      active={role === 'organizer'}
                      onClick={() => setRole('organizer')}
                      icon={<BriefcaseIcon className="w-5 h-5" />}
                      label="Organize Events"
                      description="Create and manage events"
                      color="secondary"
                    />
                    <RoleOption
                      active={role === 'customer_organizer'}
                      onClick={() => setRole('customer_organizer')}
                      icon={<UsersIcon className="w-5 h-5" />}
                      label="Attend & Organize"
                      description="Do both — tickets and events"
                      color="primary"
                    />
                  </div>
                </div>
              </div>
            )}

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
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
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

            {mode === 'signup' && (
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative mt-2">
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
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signin' && (
              <div className="flex items-center gap-2">
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
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                }}
                className="ml-2 text-primary font-medium hover:underline"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
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
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left w-full ${
        active ? activeClass : 'border-border hover:border-primary/20'
      }`}
    >
      {icon}
      <div>
        <span className="text-sm font-semibold block">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
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
