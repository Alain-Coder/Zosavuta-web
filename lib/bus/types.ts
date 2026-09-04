// lib/bus/types.ts

export interface BusOperator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
}

export interface Bus {
  id: string;
  operatorId: string;
  licensePlate: string;
  capacity: number;
  model?: string;
  seatMap?: any; // JSON representation of seat layout
  seatLayoutType?: '2x2' | '2x1' | 'consecutive';
  amenities?: string[]; // e.g., ['WiFi','AC','Charging Ports']
  createdAt: Date;
}

export interface Route {
  id: string;
  operatorId: string;
  name: string;
  origin: string;
  destination: string;
  basePrice?: number;
  distanceKm?: number;
  pickupPoints?: { name: string; lat: number; lng: number }[]; // future‑proof stops list
  estimatedDuration?: number; // minutes
  createdAt: Date;
}

export interface Trip {
  id: string;
  routeId: string;
  busId: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  seatsAvailable: number;
  availableSeats?: number; // real‑time available seats
  bookedSeats?: number; // seats already booked
  status?: 'Scheduled' | 'Departed' | 'Completed' | 'Cancelled';
  createdAt: Date;
}

export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  seats: number;
  totalPrice: number;
  status: 'confirmed' | 'cancelled' | 'pending';
  paymentStatus?: 'paid' | 'unpaid' | 'refunded';
  bookingReference?: string;
  createdAt: Date;
  operatorId?: string;
  seatNumbers?: string[];
}

export interface Ticket {
  id: string;
  bookingId: string;
  qrCode?: string; // raw QR data or URL
  checkInStatus?: 'checkedIn' | 'notCheckedIn';
  issuedAt: Date;
  scannedAt?: Date;
  seatNumber?: string;
}
