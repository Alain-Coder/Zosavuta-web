import type { UserRole } from '@/lib/roles';
import { canOrganize, isAdmin, canAttend } from '@/lib/roles';

function isOrganizerPath(path: string): boolean {
  return path === '/organizer' || path.startsWith('/organizer/');
}

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

function isOperatorPath(path: string): boolean {
  return path === '/operator' || path.startsWith('/operator/');
}

function isAttendeePath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/') || path === '/my-bookings';
}

function isPublicPath(path: string): boolean {
  return (
    path === '/' ||
    path === '/events' ||
    path.startsWith('/events/') ||
    path === '/about' ||
    path === '/support' ||
    path === '/terms' ||
    path === '/contact'
  );
}

export function getPostAuthPath(role: UserRole, redirectPath?: string | null): string {
  if (isAdmin(role)) {
    if (redirectPath && isAdminPath(redirectPath)) return redirectPath;
    return '/admin';
  }

  if (role === 'organizer') {
    // Organizers go straight to organizer dashboard, never attendee dashboard
    if (redirectPath && (isOrganizerPath(redirectPath) || isPublicPath(redirectPath))) {
      return redirectPath;
    }
    return '/organizer/dashboard';
  }

  // if (role === 'operator') {
  //   if (redirectPath && (isOperatorPath(redirectPath) || isPublicPath(redirectPath))) {
  //     return redirectPath;
  //   }
  //   return '/operator/dashboard';
  // }

  if (role === 'customer_organizer') {
    if (redirectPath && !isAdminPath(redirectPath) && !isOperatorPath(redirectPath)) {
      return redirectPath;
    }
    return '/organizer/dashboard';
  }

  // Pure customer/attendee: cannot access admin, organizer, or operator routes
  if (redirectPath && !isAdminPath(redirectPath) && !isOrganizerPath(redirectPath) && !isOperatorPath(redirectPath)) {
    return redirectPath;
  }

  return '/dashboard';
}

