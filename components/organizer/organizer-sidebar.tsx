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

const NAV_ITEMS = [
  { href: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/organizer', label: 'Create Event', icon: PlusIcon, exact: true },
  { href: '/organizer/events', label: 'My Events', icon: CalendarIcon },
];

export function OrganizerSidebar() {
  const pathname = usePathname() ?? '';
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
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-border/40 px-3 py-4 bg-sidebar flex flex-row items-center justify-center">
        <Link href="/organizer/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden bg-primary/10 transition-transform group-hover:scale-105">
            <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" priority />
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-black text-base tracking-tighter text-foreground">ZOSAVUTA</span>
            <span className="text-[9px] font-bold text-primary tracking-[0.2em] uppercase mt-0.5">Organizer</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 bg-sidebar">
        {isDualRole && (
          <div className="px-2 mb-4 group-data-[collapsible=icon]:hidden">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-semibold h-10"
            >
              <Link href={isOrganizerRoute ? '/dashboard' : '/organizer/dashboard'}>
                <ArrowLeftRightIcon className="w-4 h-4 shrink-0" />
                <span>{isOrganizerRoute ? 'Switch to Attendee Hub' : 'Switch to Organizer Hub'}</span>
              </Link>
            </Button>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href, exact)}
                    tooltip={label}
                    className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  >
                    <Link href={href}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isDualRole && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/dashboard'}
                    tooltip="Attendee Hub"
                    className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  >
                    <Link href="/dashboard">
                      <HomeIcon className="w-4 h-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">Attendee Hub</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-2 bg-sidebar mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOutIcon className="w-4 h-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}