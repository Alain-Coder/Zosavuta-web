// Mock data for bus module
import type { Bus, Route, Trip, Booking, Ticket } from './types';

export const MOCK_BUSES: Bus[] = [
  {
    id: 'bus1',
    operatorId: 'op1',
    licensePlate: 'ZB-1234',
    capacity: 50,
    model: 'Volvo Coach',
    seatLayoutType: '2x2',
    amenities: ['WiFi', 'AC', 'Charging Ports'],
    createdAt: new Date(),
  },
  {
    id: 'bus2',
    operatorId: 'op1',
    licensePlate: 'ZB-5678',
    capacity: 40,
    model: 'Mercedes Sprinter',
    seatLayoutType: '2x1',
    amenities: ['WiFi', 'AC'],
    createdAt: new Date(),
  },
];

export const MOCK_ROUTES: Route[] = [
  {
    id: 'route1',
    operatorId: 'op1',
    name: 'Harare to Lilongwe',
    origin: 'Harare',
    destination: 'Lilongwe',
    basePrice: 20,
    distanceKm: 350,
    pickupPoints: [
      { name: 'Harare Central', lat: -17.8252, lng: 31.0335 },
      { name: 'Lilongwe Stop', lat: -13.9833, lng: 33.7866 },
    ],
    estimatedDuration: 300, // minutes
    createdAt: new Date(),
  },
  {
    id: 'route2',
    operatorId: 'op1',
    name: 'Lusaka to Ndola',
    origin: 'Lusaka',
    destination: 'Ndola',
    basePrice: 15,
    distanceKm: 200,
    pickupPoints: [
      { name: 'Lusaka Hub', lat: -15.4167, lng: 28.2833 },
      { name: 'Ndola Stop', lat: -12.9583, lng: 28.6361 },
    ],
    estimatedDuration: 180,
    createdAt: new Date(),
  },
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip1',
    routeId: 'route1',
    busId: 'bus1',
    departureTime: new Date(Date.now() + 3600 * 1000),
    arrivalTime: new Date(Date.now() + 5 * 3600 * 1000),
    price: 20,
    seatsAvailable: 30,
    availableSeats: 30,
    bookedSeats: 0,
    status: 'Scheduled',
    createdAt: new Date(),
  },
  {
    id: 'trip2',
    routeId: 'route2',
    busId: 'bus2',
    departureTime: new Date(Date.now() + 7200 * 1000),
    arrivalTime: new Date(Date.now() + 4 * 3600 * 1000),
    price: 15,
    seatsAvailable: 25,
    availableSeats: 25,
    bookedSeats: 0,
    status: 'Scheduled',
    createdAt: new Date(),
  },
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'book1',
    tripId: 'trip1',
    userId: 'user1',
    seats: 2,
    totalPrice: 40,
    status: 'confirmed',
    paymentStatus: 'paid',
    bookingReference: 'BR-001',
    createdAt: new Date(),
    operatorId: 'op1',
    seatNumbers: ['1A', '1B'],
  },
  {
    id: 'book2',
    tripId: 'trip2',
    userId: 'user1',
    seats: 1,
    totalPrice: 15,
    status: 'confirmed',
    paymentStatus: 'paid',
    bookingReference: 'BR-002',
    createdAt: new Date(),
    operatorId: 'op1',
    seatNumbers: ['2A'],
  },
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'ticket1',
    bookingId: 'book1',
    qrCode: 'QR123ABC',
    checkInStatus: 'notCheckedIn',
    issuedAt: new Date(),
    scannedAt: undefined,
    seatNumber: '1A',
  },
  {
    id: 'ticket2',
    bookingId: 'book1',
    qrCode: 'QR123ABD',
    checkInStatus: 'notCheckedIn',
    issuedAt: new Date(),
    scannedAt: undefined,
    seatNumber: '1B',
  },
  {
    id: 'ticket3',
    bookingId: 'book2',
    qrCode: 'QR456DEF',
    checkInStatus: 'notCheckedIn',
    issuedAt: new Date(),
    scannedAt: undefined,
    seatNumber: '2A',
  },
];
