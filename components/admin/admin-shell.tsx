'use client';

import { Suspense } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname, useSearchParams } from 'next/navigation';
import { ShieldCheckIcon } from 'lucide-react';

const SECTION_TITLES: Record<string, string> = {
  overview: 'Dashboard Overview',
  approvals: 'Ticket Approvals',
  verifications: 'Organizer KYC Verifications',
  payouts: 'Financial Payouts',
  featured: 'Featured Events',
  reports: 'Financial Reports',
  refunds: 'Refunds & Reversals',
  audit: 'Audit Trail',
  messages: 'Contact Messages',
  newsletter: 'Newsletter Subscribers',
};

function AdminHeader() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const section = searchParams?.get('section') ?? 'overview';

  let pageTitle = 'Admin Control';
  if (pathname.startsWith('/admin/operators')) {
    pageTitle = 'Bus Operators';
  } else if (pathname.startsWith('/admin/contact-messages') || pathname.startsWith('/admin/messages')) {
    pageTitle = 'Contact Messages';
  } else if (SECTION_TITLES[section]) {
    pageTitle = SECTION_TITLES[section];
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-sm font-semibold text-foreground">{pageTitle}</span>
      </div>
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-widest hidden sm:block">
          Admin Panel
        </span>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Suspense fallback={null}>
          <AdminSidebar />
        </Suspense>
        <SidebarInset className="flex-1 min-w-0">
          <Suspense fallback={null}>
            <AdminHeader />
          </Suspense>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
