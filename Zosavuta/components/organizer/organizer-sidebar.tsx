'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboardIcon,
  PlusIcon,
  TicketIcon,
  LogOutIcon,
  HomeIcon,
  CalendarIcon,
  ArrowLeftRightIcon,
  StoreIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { clearSessionExpiry } from '@/lib/auth-session';
import { Button } from '@/components/ui/button';
import React from 'react';

const NAV_ITEMS = [
  { href: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/organizer', label: 'Create Event', icon: PlusIcon, exact: true },


];

export function OrganizerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;
      try {
        const res = await fetch(`/api/users/${auth.currentUser.uid}`);
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role);
        }
      } catch {
        // ignore
      }
    };
    fetchRole();
  }, []);

  const handleSignOut = async () => {
    clearSessionExpiry();
    await signOut(auth);
    router.push('/auth');
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isOrganizerRoute = pathname.startsWith('/organizer');
  const isDualRole = userRole === 'customer_organizer';

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <Link href="/organizer/dashboard" className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-secondary/10 ring-1 ring-secondary/20">
            <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-sm tracking-tighter text-sidebar-foreground">ZOSAVUTA</span>
            <span className="text-[9px] font-bold text-secondary tracking-[0.2em] uppercase mt-1">Organizer</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {isDualRole && (
          <div className="px-2 mb-4">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-semibold h-10"
            >
              <Link href={isOrganizerRoute ? '/dashboard' : '/organizer/dashboard'}>
                <ArrowLeftRightIcon className="w-4 h-4" />
                {isOrganizerRoute ? 'Switch to Attendee Hub' : 'Switch to Organizer Hub'}
              </Link>
            </Button>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
                <React.Fragment key={href}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(href, exact)}
                      className="rounded-xl data-[active=true]:bg-secondary/10 data-[active=true]:text-secondary data-[active=true]:font-semibold hover:bg-sidebar-accent"
                    >
                      <Link href={href}>
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/organizer/events', false)}
                      className="rounded-xl data-[active=true]:bg-secondary/10 data-[active=true]:text-secondary data-[active=true]:font-semibold hover:bg-sidebar-accent"
                    >
                      <Link href="/organizer/events">
                        <CalendarIcon className="w-4 h-4" />
                        <span>My Events</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/organizer/tickets', false)}
                      className="rounded-xl data-[active=true]:bg-secondary/10 data-[active=true]:text-secondary data-[active=true]:font-semibold hover:bg-sidebar-accent"
                    >
                      <Link href="/organizer/tickets">
                        <TicketIcon className="w-4 h-4" />
                        <span>My Tickets</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </React.Fragment>
              ))}
              {isDualRole && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/dashboard'}
                    className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:bg-sidebar-accent"
                  >
                    <Link href="/dashboard">
                      <HomeIcon className="w-4 h-4" />
                      <span>Attendee Hub</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOutIcon className="w-4 h-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
