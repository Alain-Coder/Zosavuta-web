'use client';

import { OrganizerSidebar } from '@/components/organizer/organizer-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';

interface OrganizerShellProps {
  children: React.ReactNode;
}

export function OrganizerShell({ children }: OrganizerShellProps) {
  const pathname = usePathname() ?? '';

  // Dynamically generate the page title based on the current route
  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'dashboard';

    const titles: Record<string, string> = {
      'dashboard': 'Dashboard',
      'events': 'My Events',
      'tickets': 'My Tickets',
      'create': 'Create Event',
    };

    return titles[lastSegment] || 'Organizer';
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-[calc(100vh-4rem)]">
        <OrganizerSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-md px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {getPageTitle()}
              </span>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <span className="text-xs text-muted-foreground hidden sm:block">
                Organizer Dashboard
              </span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}