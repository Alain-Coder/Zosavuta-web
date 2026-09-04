'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboardIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  CalendarIcon,
  TicketIcon,
  LogOutIcon,
  UsersIcon,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { clearSessionExpiry } from '@/lib/auth-session';
import { getAuthHeaders } from '@/lib/auth-client';

type Section = 'overview' | 'approvals' | 'revenue' | 'events' | 'tickets';

const NAV_ITEMS: { section: Section; label: string; icon: any }[] = [
  { section: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
  { section: 'approvals', label: 'Approvals', icon: CheckCircleIcon },
  { section: 'revenue', label: 'Revenue', icon: TrendingUpIcon },
  { section: 'events', label: 'Events', icon: CalendarIcon },
  { section: 'tickets', label: 'Tickets', icon: TicketIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams(); // URLSearchParams | null
  let section: Section = 'approvals';   // default
  if (searchParams) {
    const param = searchParams.get('section');
    if (param) {
      section = param as Section;
    }
  }
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      if (!auth.currentUser) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/event-submissions?status=pending&readyForReview=true', { headers });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // ignore
      }
    };
    fetchPending();
  }, [pathname, section]);

  const handleSignOut = async () => {
    clearSessionExpiry();
    await signOut(auth);
    router.push('/auth');
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <Link href="/admin?section=overview" className="flex items-center gap-3">
          {/* existing Overview link ... */}</Link>

        <Link href="/admin/operators" className="flex items-center gap-3 mt-2">
          <UsersIcon className="w-4 h-4" />
          <span>Operators</span>
        </Link>
        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-primary/10 ring-1 ring-primary/20">
          <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-black text-sm tracking-tighter text-sidebar-foreground">ZOSAVUTA</span>
          <span className="text-[9px] font-bold text-primary tracking-[0.2em] uppercase mt-1">Admin Panel</span>
        </div>

      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ section: s, label, icon: Icon }) => (
                <SidebarMenuItem key={s}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/admin' && section === s}
                    className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-sidebar-accent"
                  >
                    <Link href={`/admin?section=${s}`}>
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                      {s === 'approvals' && pendingCount > 0 && (
                        <SidebarMenuBadge className="bg-primary text-primary-foreground">
                          {pendingCount}
                        </SidebarMenuBadge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
