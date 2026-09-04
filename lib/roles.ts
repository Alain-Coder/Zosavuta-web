export type CustomerAccountType = 'ATTENDEE' | 'ORGANIZER' | 'ATTENDEE_ORGANIZER';
export type AdminRole = 'SYSTEM_ADMINISTRATOR' | 'ACCOUNTANT';
export type UserRole = 'customer' | 'organizer' | 'customer_organizer' | 'admin' | 'operator' | 'accountant';

export const CUSTOMER_ACCOUNT_TYPES: CustomerAccountType[] = [
  'ATTENDEE',
  'ORGANIZER',
  'ATTENDEE_ORGANIZER',
];

export const ADMIN_ROLES: AdminRole[] = ['SYSTEM_ADMINISTRATOR', 'ACCOUNTANT'];

export function canOrganize(role: UserRole | string | null | undefined): boolean {
  return role === 'organizer' || role === 'customer_organizer';
}

export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return role === 'admin' || role === 'accountant';
}

export function isSystemAdministrator(role: UserRole | string | null | undefined): boolean {
  return role === 'admin';
}

export function isAccountant(role: UserRole | string | null | undefined): boolean {
  return role === 'accountant';
}

export function canAttend(role: UserRole | string | null | undefined): boolean {
  return role === 'customer' || role === 'customer_organizer';
}
