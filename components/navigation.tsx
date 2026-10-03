'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MenuIcon,
  TicketIcon,
  LogOutIcon,
  ChevronRight,
  TrophyIcon,
  LayoutDashboardIcon,
  UserIcon,
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { clearSessionExpiry } from '@/lib/auth-session';
import { canOrganize, isAdmin, canAttend, UserRole } from '@/lib/roles';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/', label: 'Explore Events' },
  { href: '/my-bookings', label: 'My Tickets' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Help' },
  { href: '/organizer', label: 'Organizer' },
];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | 'operator' | null>(null);
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Auth listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setUserRole(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/users/${u.uid}`);
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role ?? null);
        } else {
          setUserRole(null);
        }
      } catch (err: any) {
        if (!err.code?.includes('unavailable') && !err.message?.includes('offline')) {
          console.error('Error fetching role:', err);
        }
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (pathname === '/auth' || pathname?.startsWith?.('/organizer') || pathname?.startsWith?.('/admin')) return null;

  const getDashboardHref = () => {
    if (isAdmin(userRole)) return '/admin';
    if (userRole === 'organizer') return '/organizer/dashboard';
    if (userRole === 'operator') return '/operator/dashboard';
    return '/dashboard';
  };

  const visibleNavLinks = NAV_LINKS.filter((link) => {
    if (link.href === '/organizer') {
      return userRole && canOrganize(userRole) && !isAdmin(userRole);
    }
    // Only attendees have tickets
    if (link.href === '/my-bookings') {
      if (userRole === 'organizer' || isAdmin(userRole) || userRole === 'operator') {
        return false;
      }
    }
    return true;
  }).map((link) => {
    if (link.href === '/dashboard') {
      return {
        ...link,
        href: getDashboardHref(),
        label: userRole === 'organizer' ? 'Organizer Hub' : isAdmin(userRole) ? 'Admin Hub' : 'Dashboard',
      };
    }
    return link;
  });

  const handleSignOut = async () => {
    try {
      clearSessionExpiry();
      await signOut(auth);
      setDropdownOpen(false);
      router.push('/auth');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const avatarInitial = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = user?.displayName?.split(' ')[0] || 'Member';

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-primary/10 transition-transform group-hover:scale-105">
              <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" priority />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-base tracking-tighter text-foreground">ZOSAVUTA</span>
              <span className="text-[9px] font-bold text-primary tracking-[0.2em] uppercase mt-0.5">Tickets MW</span>
            </div>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden md:flex items-center gap-1">
            {visibleNavLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* ── Desktop right section ── */}
          <div className="hidden md:flex items-center gap-2">

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              /* Avatar + dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border/60 hover:border-border transition-colors bg-card"
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-black">
                    {avatarInitial}
                  </div>
                  <span className="text-sm font-medium text-foreground">{displayName}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border/60 bg-popover shadow-xl shadow-black/10 overflow-hidden z-50">
                    {/* Role badge */}
                    <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {canAttend(userRole) && (
                        <DropdownLink href="/my-bookings" icon={<TicketIcon className="w-4 h-4" />} onClick={() => setDropdownOpen(false)}>
                          My Tickets
                        </DropdownLink>
                      )}
                      {canAttend(userRole) && (
                        <DropdownLink href="/dashboard" icon={<LayoutDashboardIcon className="w-4 h-4" />} onClick={() => setDropdownOpen(false)}>
                          {userRole === 'customer_organizer' ? 'Attendee Hub' : 'Dashboard'}
                        </DropdownLink>
                      )}
                      {isAdmin(userRole) && (
                        <DropdownLink href="/admin" icon={<LayoutDashboardIcon className="w-4 h-4" />} onClick={() => setDropdownOpen(false)}>
                          Admin Dashboard
                        </DropdownLink>
                      )}
                      {canOrganize(userRole) && !isAdmin(userRole) && (
                        <DropdownLink href="/organizer/dashboard" icon={<UserIcon className="w-4 h-4" />} onClick={() => setDropdownOpen(false)}>
                          Organizer Hub
                        </DropdownLink>
                      )}
                      {userRole === 'operator' && (
                        <DropdownLink href="/operator/dashboard" icon={<LayoutDashboardIcon className="w-4 h-4" />} onClick={() => setDropdownOpen(false)}>
                          Operator Dashboard
                        </DropdownLink>
                      )}
                    </div>

                    <div className="p-1.5 border-t border-border/40">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/8 transition-colors"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest */
              <div className="flex items-center gap-2">
                <Link href="/auth">
                  <Button variant="ghost" size="sm" className="font-semibold text-xs uppercase tracking-wider">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth?mode=signup">
                  <Button size="sm" className="rounded-full px-5 font-bold text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground">
                    Join free
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MenuIcon className="w-5 h-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-full sm:w-[360px] p-0 border-l border-border/40">
                <div className="flex flex-col h-full">

                  {/* Sheet header */}
                  <SheetHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b border-border/40">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-primary/10 shrink-0">
                      <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" />
                    </div>
                    <div className="flex-1 text-left">
                      <SheetTitle className="font-black text-base tracking-tighter leading-none">ZOSAVUTA</SheetTitle>
                      {user && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                          {user.displayName || user.email}
                        </p>
                      )}
                    </div>
                    <SheetDescription className="sr-only">Navigation menu</SheetDescription>
                  </SheetHeader>

                  {/* Nav links */}
                  <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                    <section>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Browse</p>
                      <div className="space-y-1">
                        {visibleNavLinks.map((link) => {
                          const active = pathname === link.href;
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${active ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                                }`}
                            >
                              <span className="text-sm font-medium">{link.label}</span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </Link>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Account</p>
                      {loading ? (
                        <div className="h-12 rounded-xl bg-muted animate-pulse" />
                      ) : user ? (
                        <div className="space-y-1">
                          {canAttend(userRole) && (
                            <MobileLink href="/my-bookings" icon={<TicketIcon className="w-4 h-4" />} onClick={() => setMobileOpen(false)}>My Tickets</MobileLink>
                          )}
                          {canAttend(userRole) && (
                            <MobileLink href="/dashboard" icon={<LayoutDashboardIcon className="w-4 h-4" />} onClick={() => setMobileOpen(false)}>
                              {userRole === 'customer_organizer' ? 'Attendee Hub' : 'Dashboard'}
                            </MobileLink>
                          )}
                          {isAdmin(userRole) && (
                            <MobileLink href="/admin" icon={<LayoutDashboardIcon className="w-4 h-4" />} onClick={() => setMobileOpen(false)}>Admin Dashboard</MobileLink>
                          )}
                          {canOrganize(userRole) && !isAdmin(userRole) && (
                            <MobileLink href="/organizer/dashboard" icon={<UserIcon className="w-4 h-4" />} onClick={() => setMobileOpen(false)}>Organizer Hub</MobileLink>
                          )}
                          {userRole === 'operator' && (
                            <MobileLink href="/operator/dashboard" icon={<LayoutDashboardIcon className="w-4 h-4" />} onClick={() => setMobileOpen(false)}>Operator Dashboard</MobileLink>
                          )}
                          <button
                            onClick={() => { handleSignOut(); setMobileOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-destructive hover:bg-destructive/8 transition-colors mt-2"
                          >
                            <LogOutIcon className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <Link href="/auth" onClick={() => setMobileOpen(false)}>
                            <Button variant="outline" className="w-full rounded-xl font-semibold text-xs uppercase tracking-wider">Sign in</Button>
                          </Link>
                          <Link href="/auth?mode=signup" onClick={() => setMobileOpen(false)}>
                            <Button className="w-full rounded-xl font-semibold text-xs uppercase tracking-wider">Join free</Button>
                          </Link>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Sheet footer */}
                  <div className="px-5 py-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground text-center">Discover amazing events in Malawi</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
}

/* ── Small helpers ── */

function DropdownLink({
  href, icon, onClick, children,
}: {
  href: string; icon: React.ReactNode; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  );
}

function MobileLink({
  href, icon, onClick, children,
}: {
  href: string; icon: React.ReactNode; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foreground hover:bg-muted/60 transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  );
}
