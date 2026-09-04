// lib/bus/api.ts
// API-based replacement for bus/firebase.ts — all data comes from MySQL via Next.js API routes.

import type { Bus, Route, Trip, Booking, Ticket } from '@/lib/bus/types';

const BASE = '/api/bus';

// ─── helpers ────────────────────────────────────────────────────────────────
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function putJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function deleteJSON(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error ${res.status}`);
}

// ─── BUSES ──────────────────────────────────────────────────────────────────
export async function getBusesByOperator(operatorId: string): Promise<Bus[]> {
  return fetchJSON<Bus[]>(`${BASE}/buses?operatorId=${encodeURIComponent(operatorId)}`);
}

export async function addBus(busData: Omit<Bus, 'id' | 'createdAt'>): Promise<Bus> {
  return postJSON<Bus>(`${BASE}/buses`, busData);
}

export async function updateBus(busId: string, busData: Partial<Bus>): Promise<void> {
  await putJSON(`${BASE}/buses?id=${encodeURIComponent(busId)}`, busData);
}

export async function deleteBus(busId: string): Promise<void> {
  await deleteJSON(`${BASE}/buses?id=${encodeURIComponent(busId)}`);
}

// ─── ROUTES ─────────────────────────────────────────────────────────────────
export async function getRoutesByOperator(operatorId: string): Promise<Route[]> {
  return fetchJSON<Route[]>(`${BASE}/routes?operatorId=${encodeURIComponent(operatorId)}`);
}

export async function addRoute(routeData: Omit<Route, 'id' | 'createdAt'>): Promise<Route> {
  return postJSON<Route>(`${BASE}/routes`, routeData);
}

// ─── TRIPS ──────────────────────────────────────────────────────────────────
export async function getTripsByOperator(operatorId: string): Promise<Trip[]> {
  return fetchJSON<Trip[]>(`${BASE}/trips?operatorId=${encodeURIComponent(operatorId)}`);
}

export async function addTrip(tripData: Omit<Trip, 'id' | 'createdAt'>): Promise<Trip> {
  return postJSON<Trip>(`${BASE}/trips`, tripData);
}

// ─── BOOKINGS ───────────────────────────────────────────────────────────────
export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  return fetchJSON<Booking[]>(`${BASE}/bookings?userId=${encodeURIComponent(userId)}`);
}

export async function getBookingsByOperator(operatorId: string): Promise<Booking[]> {
  return fetchJSON<Booking[]>(`${BASE}/bookings?operatorId=${encodeURIComponent(operatorId)}`);
}

// Alias exports for clarity and backward compatibility
export const getBusBookingsByUser = getBookingsByUser; // existing import name used in dashboard
export const getBusBookings = getBookingsByUser; // new clearer name

export async function allocateSeats(bookingId: string, seatNumbers: string[]): Promise<void> {
  await putJSON(`${BASE}/bookings?id=${encodeURIComponent(bookingId)}`, { seatNumbers });
}

// ─── TICKETS ────────────────────────────────────────────────────────────────

// ─── EVENTS ────────────────────────────────────────────────────────────────
/** Fetch events for a given organizer */
export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
  // Assuming an API endpoint exists at /api/events?organizerId=...
  // Replace with the correct endpoint when available.
  return fetchJSON<Event[]>(`${BASE}/events?organizerId=${encodeURIComponent(organizerId)}`).catch(() => []);
}

export async function getTicketsByUser(userId: string): Promise<Ticket[]> {
  return fetchJSON<Ticket[]>(`${BASE}/bookings?userId=${encodeURIComponent(userId)}`)
    .then(() => []); // Tickets are returned as part of bookings in the API; stub for compatibility
}

export async function getTicketsByBooking(bookingId: string): Promise<Ticket[]> {
  // The API doesn't have a dedicated tickets-by-booking endpoint yet; return empty for now.
  // In production, add GET /api/bus/tickets?bookingId=...
  return [];
}

export async function allocateTicketSeat(ticketId: string, seatNumber: string): Promise<void> {
  // No-op for now — seat allocation is handled at the booking level via allocateSeats
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────
export async function validateTicket(ticketId: string): Promise<boolean> {
  // Could call an API endpoint; for now use simple heuristic
  return !!ticketId && ticketId.length > 0;
}

// ─── REAL-TIME LISTENERS (replaced with polling / one-shot fetches) ────────
/** Fetch bookings once (replaces onSnapshot) */
export function onBookingsChange(operatorId: string, callback: (bookings: Booking[]) => void) {
  getBookingsByOperator(operatorId).then(callback).catch(() => callback([]));
  return () => { };
}

/** Fetch trips once (replaces onSnapshot) */
export function onTripsChange(operatorId: string, callback: (trips: Trip[]) => void) {
  getTripsByOperator(operatorId).then(callback).catch(() => callback([]));
  return () => { };
}

/** Fetch ticket once (replaces onSnapshot) */
export function onTicketValidationChange(ticketId: string, callback: (ticket: Ticket | null) => void) {
  callback(null); // Stub — add a real endpoint in production
  return () => { };
}

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
export async function getDashboardStats(operatorId: string) {
  const [buses, routes, trips, bookings] = await Promise.all([
    getBusesByOperator(operatorId).catch(() => []),
    getRoutesByOperator(operatorId).catch(() => []),
    getTripsByOperator(operatorId).catch(() => []),
    getBookingsByOperator(operatorId).catch(() => []),
  ]);
  return {
    buses: buses.length,
    routes: routes.length,
    trips: trips.length,
    bookings: bookings.length,
  };
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────
export async function getOperatorSettings(_operatorId: string) {
  return {
    notificationsEnabled: true,
    theme: 'system',
    language: 'en',
  };
}
