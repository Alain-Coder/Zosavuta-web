'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboardIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  UsersIcon,
  BarChart3Icon,
  RotateCcwIcon,
  HistoryIcon,
  LogOutIcon,
  ArrowLeftRightIcon,
  ShieldCheckIcon,
  MessageSquareIcon,
  MailIcon,
  StarIcon,
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
} from '@/components/ui/sidebar';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { clearSessionExpiry } from '@/lib/auth-session';
import { getAuthHeaders } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';

export type AdminSection = 'overview' | 'approvals' | 'verifications' | 'payouts' | 'featured' | 'reports' | 'refunds' | 'audit' | 'messages' | 'newsletter';

interface NavItem {
  section?: AdminSection;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeVariant?: 'default' | 'destructive' | 'secondary' | 'outline';
}

export function AdminSidebar() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentSection = (searchParams?.get('section') as AdminSection) || 'overview';
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadgeData = async () => {
      if (!auth.currentUser) return;
      setAdminEmail(auth.currentUser.email);

      try {
        const headers = { 'x-admin-id': auth.currentUser.uid, ...(await getAuthHeaders()) };

        // Fetch pending ticket submissions
        const approvalsRes = await fetch(`/api/admin/ticket-approvals?adminId=${auth.currentUser.uid}`, { headers });
        if (approvalsRes.ok) {
          const data = await approvalsRes.json();
          const subs = Array.isArray(data.submissions) ? data.submissions : [];
          setPendingApprovals(subs.filter((s: any) => s.status === 'pending').length);
        }

        // Fetch pending KYC organizer verifications
        const verifRes = await fetch('/api/admin/organizer-verifications', { headers });
        if (verifRes.ok) {
          const vData = await verifRes.json();
          setPendingVerifications(vData.counts?.pending ?? 0);
        }

        // Fetch pending payout requests
        const payoutsRes = await fetch(`/api/admin/financial-verifications?adminId=${auth.currentUser.uid}`, { headers });
        if (payoutsRes.ok) {
          const pData = await payoutsRes.json();
          const pList = Array.isArray(pData.payouts) ? pData.payouts : [];
          setPendingPayouts(pList.filter((p: any) => p.status === 'REQUESTED' || p.status === 'ACCOUNTANT_REVIEW').length);
        }

        // Fetch unread contact messages
        const messagesRes = await fetch(`/api/admin/contact-messages?adminId=${auth.currentUser.uid}&limit=1`, { headers });
        if (messagesRes.ok) {
          const mData = await messagesRes.json();
          setUnreadMessages(mData.stats?.unread ?? 0);
        }

        // Fetch newsletter subscriber count
        const newsletterRes = await fetch(`/api/newsletter?adminId=${auth.currentUser.uid}&limit=1`, { headers });
        if (newsletterRes.ok) {
          const nData = await newsletterRes.json();
          setSubscriberCount(Number(nData.stats?.active ?? 0));
        }
      } catch {
        // silently fallback
      }
    };

    void fetchBadgeData();
  }, [pathname, searchParams]);

  const handleSignOut = async () => {
    clearSessionExpiry();
    await signOut(auth);
    router.push('/auth');
  };

  const isItemActive = (href: string, section?: AdminSection) => {
    if (href === '/admin/operators') {
      return pathname.startsWith('/admin/operators');
    }
    if (href === '/admin/contact-messages') {
      return (
        pathname.startsWith('/admin/contact-messages') ||
        pathname.startsWith('/admin/messages') ||
        (pathname === '/admin' && currentSection === 'messages')
      );
    }
    if (href === '/admin?section=newsletter') {
      return pathname === '/admin' && currentSection === 'newsletter';
    }
    if (pathname === '/admin') {
      return currentSection === section;
    }
    return false;
  };

  const operationsNav: NavItem[] = [
    {
      section: 'overview',
      href: '/admin?section=overview',
      label: 'Overview',
      icon: LayoutDashboardIcon,
    },
    {
      section: 'approvals',
      href: '/admin?section=approvals',
      label: 'Ticket Approvals',
      icon: CheckCircle2Icon,
      badgeCount: pendingApprovals,
    },
    {
      section: 'verifications',
      href: '/admin?section=verifications',
      label: 'Organizer KYC',
      icon: ShieldCheckIcon,
      badgeCount: pendingVerifications,
    },
    {
      section: 'payouts',
      href: '/admin?section=payouts',
      label: 'Financial Payouts',
      icon: CreditCardIcon,
      badgeCount: pendingPayouts,
    },
    {
      section: 'featured' as AdminSection,
      href: '/admin?section=featured',
      label: 'Featured Events',
      icon: StarIcon,
    },
  ];

  const supportNav: NavItem[] = [
    {
      href: '/admin/contact-messages',
      label: 'Contact Messages',
      icon: MessageSquareIcon,
      badgeCount: unreadMessages,
    },
    {
      section: 'newsletter',
      href: '/admin?section=newsletter',
      label: 'Newsletter',
      icon: MailIcon,
      badgeCount: subscriberCount,
    },
  ];

  const governanceNav: NavItem[] = [
    {
      section: 'reports',
      href: '/admin?section=reports',
      label: 'Financial Reports',
      icon: BarChart3Icon,
    },
    {
      section: 'refunds',
      href: '/admin?section=refunds',
      label: 'Refunds & Reversals',
      icon: RotateCcwIcon,
    },
    {
      section: 'audit',
      href: '/admin?section=audit',
      label: 'Audit Trail',
      icon: HistoryIcon,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-sidebar text-sidebar-foreground">
      {/* ── Header Branding ── */}
      <SidebarHeader className="border-b border-border/40 px-3 py-4 bg-sidebar">
        <Link href="/admin?section=overview" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden bg-primary/10 ring-1 ring-primary/20 transition-transform group-hover:scale-105">
            <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" priority />
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-black text-base tracking-tighter text-foreground">ZOSAVUTA</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-bold text-primary tracking-[0.2em] uppercase">
                Admin Panel
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </Link>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent className="px-2 py-4 bg-sidebar">
        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 group-data-[collapsible=icon]:hidden">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsNav.map(({ href, label, icon: Icon, section, badgeCount }) => {
                const active = isItemActive(href, section);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Link href={href} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                        </div>
                        {badgeCount !== undefined && badgeCount > 0 && (
                          <SidebarMenuBadge className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                            {badgeCount}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support & Inquiries Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 group-data-[collapsible=icon]:hidden">
            Support & Help
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportNav.map(({ href, label, icon: Icon, section, badgeCount }) => {
                const active = isItemActive(href, section);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Link href={href} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                        </div>
                        {badgeCount !== undefined && badgeCount > 0 && (
                          <SidebarMenuBadge className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                            {badgeCount}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Governance & Ledgers Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 group-data-[collapsible=icon]:hidden">
            Ledger & Governance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {governanceNav.map(({ href, label, icon: Icon, section }) => {
                const active = isItemActive(href, section);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className="rounded-xl data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Link href={href} className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-border/40 p-2 bg-sidebar mt-auto">
        {adminEmail && (
          <div className="px-2 py-1.5 mb-1 group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Session</p>
            <p className="text-xs font-semibold text-foreground truncate">{adminEmail}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOutIcon className="w-4 h-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden font-semibold">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
