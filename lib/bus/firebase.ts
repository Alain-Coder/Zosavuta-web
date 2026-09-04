// lib/bus/firebase.ts
// Helper functions for bus operator pages. Uses mock/localStorage data as fallback and provides real‑time listeners.

import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import {
  MOCK_BUSES,
  MOCK_ROUTES,
  MOCK_TRIPS,
  MOCK_BOOKINGS,
  MOCK_TICKETS,
} from '@/lib/bus/mock-data';
import type { Bus, Route, Trip, Booking, Ticket } from '@/lib/bus/types';

// -------------------- LOCAL STORAGE PERSISTENCE FALLBACKS --------------------
function getLocalList<T>(key: string, defaultList: T[]): T[] {
  if (typeof window === 'undefined') return defaultList;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultList));
    return defaultList;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultList;
  }
}

function setLocalList<T>(key: string, list: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(list));
}

// -------------------- BUSES --------------------
export async function getBusesByOperator(operatorId: string): Promise<Bus[]> {
  try {
    const q = query(collection(db, 'buses'), where('operatorId', '==', operatorId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bus));
    }
    throw new Error('No buses found in Firestore');
  } catch (e) {
    console.warn('Firestore unavailable, using mock/local buses', e);
    const local = getLocalList<Bus>('zosavuta_buses', MOCK_BUSES);
    return local.filter((b) => b.operatorId === operatorId);
  }
}

export async function addBus(busData: Omit<Bus, 'id' | 'createdAt'>): Promise<Bus> {
  const newBus: Bus = {
    id: 'bus_' + Math.random().toString(36).substr(2, 9),
    ...busData,
    createdAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'buses'), newBus);
    newBus.id = docRef.id;
  } catch (e) {
    console.warn('Firestore unavailable, saving bus locally', e);
    const local = getLocalList<Bus>('zosavuta_buses', MOCK_BUSES);
    local.push(newBus);
    setLocalList('zosavuta_buses', local);
  }
  return newBus;
}

export async function updateBus(busId: string, busData: Partial<Bus>): Promise<void> {
  try {
    const docRef = doc(db, 'buses', busId);
    await updateDoc(docRef, busData);
  } catch (e) {
    console.warn('Firestore unavailable, updating bus locally', e);
    const local = getLocalList<Bus>('zosavuta_buses', MOCK_BUSES);
    const index = local.findIndex((b) => b.id === busId);
    if (index !== -1) {
      local[index] = { ...local[index], ...busData };
      setLocalList('zosavuta_buses', local);
    }
  }
}

export async function deleteBus(busId: string): Promise<void> {
  try {
    const docRef = doc(db, 'buses', busId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore unavailable, deleting bus locally', e);
    let local = getLocalList<Bus>('zosavuta_buses', MOCK_BUSES);
    local = local.filter((b) => b.id !== busId);
    setLocalList('zosavuta_buses', local);
  }
}

// -------------------- ROUTES --------------------
export async function getRoutesByOperator(operatorId: string): Promise<Route[]> {
  try {
    const q = query(collection(db, 'routes'), where('operatorId', '==', operatorId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Route));
    }
    throw new Error('No routes in Firestore');
  } catch (e) {
    console.warn('Firestore unavailable, using mock/local routes', e);
    const local = getLocalList<Route>('zosavuta_routes', MOCK_ROUTES);
    return local.filter((r) => r.operatorId === operatorId);
  }
}

export async function addRoute(routeData: Omit<Route, 'id' | 'createdAt'>): Promise<Route> {
  const newRoute: Route = {
    id: 'route_' + Math.random().toString(36).substr(2, 9),
    ...routeData,
    createdAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'routes'), newRoute);
    newRoute.id = docRef.id;
  } catch (e) {
    console.warn('Firestore unavailable, saving route locally', e);
    const local = getLocalList<Route>('zosavuta_routes', MOCK_ROUTES);
    local.push(newRoute);
    setLocalList('zosavuta_routes', local);
  }
  return newRoute;
}

// -------------------- TRIPS --------------------
export async function getTripsByOperator(operatorId: string): Promise<Trip[]> {
  try {
    const q = query(collection(db, 'trips'), where('operatorId', '==', operatorId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
    }
    throw new Error('No trips in Firestore');
  } catch (e) {
    console.warn('Firestore unavailable, using mock/local trips', e);
    const routes = MOCK_ROUTES.filter((r) => r.operatorId === operatorId).map((r) => r.id);
    const buses = MOCK_BUSES.filter((b) => b.operatorId === operatorId).map((b) => b.id);
    const localTrips = getLocalList<Trip>('zosavuta_trips', MOCK_TRIPS);
    return localTrips.filter((t) => routes.includes(t.routeId) && buses.includes(t.busId));
  }
}

export async function addTrip(tripData: Omit<Trip, 'id' | 'createdAt'>): Promise<Trip> {
  const newTrip: Trip = {
    id: 'trip_' + Math.random().toString(36).substr(2, 9),
    ...tripData,
    createdAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'trips'), newTrip);
    newTrip.id = docRef.id;
  } catch (e) {
    console.warn('Firestore unavailable, saving trip locally', e);
    const local = getLocalList<Trip>('zosavuta_trips', MOCK_TRIPS);
    local.push(newTrip);
    setLocalList('zosavuta_trips', local);
  }
  return newTrip;
}

// -------------------- BOOKINGS --------------------
export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  try {
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch (e) {
    console.warn('Firestore unavailable, using mock/local bookings', e);
    const local = getLocalList<Booking>('zosavuta_bookings', MOCK_BOOKINGS);
    return local.filter((b) => b.userId === userId);
  }
}

export async function getBookingsByOperator(operatorId: string): Promise<Booking[]> {
  try {
    const q = query(collection(db, 'bookings'), where('operatorId', '==', operatorId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
  } catch (e) {
    console.warn('Firestore unavailable, using mock/local bookings', e);
    const local = getLocalList<Booking>('zosavuta_bookings', MOCK_BOOKINGS);
    return local.filter((b) => b.operatorId === operatorId);
  }
}

export async function allocateSeats(bookingId: string, seatNumbers: string[]): Promise<void> {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, { seatNumbers });
  } catch (e) {
    console.warn('Firestore unavailable, allocating seats locally', e);
    const local = getLocalList<Booking>('zosavuta_bookings', MOCK_BOOKINGS);
    const index = local.findIndex((b) => b.id === bookingId);
    if (index !== -1) {
      local[index] = { ...local[index], seatNumbers };
      setLocalList('zosavuta_bookings', local);
    }
  }
}

// -------------------- TICKETS --------------------
export async function getTicketsByUser(userId: string): Promise<Ticket[]> {
  const bookings = await getBookingsByUser(userId);
  const bookingIds = bookings.map((b) => b.id);
  const localTickets = getLocalList<Ticket>('zosavuta_tickets', MOCK_TICKETS);
  return localTickets.filter((t) => bookingIds.includes(t.bookingId));
}

export async function getTicketsByBooking(bookingId: string): Promise<Ticket[]> {
  try {
    const q = query(collection(db, 'tickets'), where('bookingId', '==', bookingId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
  } catch (e) {
    const localTickets = getLocalList<Ticket>('zosavuta_tickets', MOCK_TICKETS);
    return localTickets.filter((t) => t.bookingId === bookingId);
  }
}

export async function allocateTicketSeat(ticketId: string, seatNumber: string): Promise<void> {
  try {
    const docRef = doc(db, 'tickets', ticketId);
    await updateDoc(docRef, { seatNumber });
  } catch (e) {
    const localTickets = getLocalList<Ticket>('zosavuta_tickets', MOCK_TICKETS);
    const index = localTickets.findIndex((t) => t.id === ticketId);
    if (index !== -1) {
      localTickets[index] = { ...localTickets[index], seatNumber };
      setLocalList('zosavuta_tickets', localTickets);
    }
  }
}

// -------------------- VALIDATION --------------------
export async function validateTicket(ticketId: string): Promise<boolean> {
  const localTickets = getLocalList<Ticket>('zosavuta_tickets', MOCK_TICKETS);
  const ticket = localTickets.find((t) => t.id === ticketId);
  return !!ticket;
}

// -------------------- REAL‑TIME LISTENERS --------------------
/** Listen to bookings for a given operator (or user) */
export function onBookingsChange(operatorId: string, callback: (bookings: Booking[]) => void) {
  try {
    const q = query(collection(db, 'bookings'), where('operatorId', '==', operatorId));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      callback(data);
    });
  } catch (e) {
    console.warn('Firestore unavailable, using mock bookings listener', e);
    const local = getLocalList<Booking>('zosavuta_bookings', MOCK_BOOKINGS);
    callback(local.filter((b) => b.operatorId === operatorId));
    return () => {};
  }
}

/** Listen to trips for a given operator */
export function onTripsChange(operatorId: string, callback: (trips: Trip[]) => void) {
  try {
    const q = query(collection(db, 'trips'), where('operatorId', '==', operatorId));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
      callback(data);
    });
  } catch (e) {
    console.warn('Firestore unavailable, using mock trips listener', e);
    const routes = MOCK_ROUTES.filter((r) => r.operatorId === operatorId).map((r) => r.id);
    const buses = MOCK_BUSES.filter((b) => b.operatorId === operatorId).map((b) => b.id);
    const localTrips = getLocalList<Trip>('zosavuta_trips', MOCK_TRIPS);
    const data = localTrips.filter((t) => routes.includes(t.routeId) && buses.includes(t.busId));
    callback(data);
    return () => {};
  }
}

/** Listen to validation updates for a specific ticket */
export function onTicketValidationChange(ticketId: string, callback: (ticket: Ticket | null) => void) {
  try {
    const q = query(collection(db, 'tickets'), where('id', '==', ticketId));
    return onSnapshot(q, (snap) => {
      const doc = snap.docs[0];
      const data = doc ? ({ id: doc.id, ...doc.data() } as Ticket) : null;
      callback(data);
    });
  } catch (e) {
    console.warn('Firestore unavailable, using mock ticket listener', e);
    const localTickets = getLocalList<Ticket>('zosavuta_tickets', MOCK_TICKETS);
    const ticket = localTickets.find((t) => t.id === ticketId) || null;
    callback(ticket);
    return () => {};
  }
}

// -------------------- DASHBOARD STATS --------------------
export async function getDashboardStats(operatorId: string) {
  const [buses, routes, trips, bookings] = await Promise.all([
    getBusesByOperator(operatorId),
    getRoutesByOperator(operatorId),
    getTripsByOperator(operatorId),
    getBookingsByOperator(operatorId),
  ]);
  return {
    buses: buses.length,
    routes: routes.length,
    trips: trips.length,
    bookings: bookings.length,
  };
}

// -------------------- SETTINGS --------------------
export async function getOperatorSettings(operatorId: string) {
  return {
    notificationsEnabled: true,
    theme: 'system',
    language: 'en',
  };
}
