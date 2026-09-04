export type UserRole = 'customer' | 'organizer' | 'customer_organizer' | 'admin';

export function canOrganize(role: UserRole | string | null | undefined): boolean {
  return role === 'organizer' || role === 'customer_organizer';
}

export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return role === 'admin';
}

export function canAttend(role: UserRole | string | null | undefined): boolean {
  return role === 'customer' || role === 'customer_organizer';
}
