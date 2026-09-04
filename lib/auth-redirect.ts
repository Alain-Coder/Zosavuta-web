import type { UserRole } from '@/lib/roles';
import { canOrganize, isAdmin } from '@/lib/roles';

function isOrganizerPath(path: string): boolean {
  return path === '/organizer' || path.startsWith('/organizer/');
}

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

export function getPostAuthPath(role: UserRole, redirectPath?: string | null): string {
  if (isAdmin(role)) {
    if (redirectPath && !isOrganizerPath(redirectPath)) return redirectPath;
    return '/admin';
  }

  if (canOrganize(role)) {
    if (redirectPath && !isAdminPath(redirectPath)) return redirectPath;
    return role === 'customer_organizer' ? '/dashboard' : '/organizer/dashboard';
  }

  if (redirectPath && !isAdminPath(redirectPath) && !isOrganizerPath(redirectPath)) {
    return redirectPath;
  }

  return '/dashboard';
}
