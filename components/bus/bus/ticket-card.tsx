import React from 'react';
import Image from 'next/image';
import { Booking, Route, Trip } from '@/lib/bus/types';

interface TicketCardProps {
  booking: Booking;
  route?: Route;
  trip?: Trip;
  qrCodeUrl?: string;
}

export default function TicketCard({ booking, route, trip, qrCodeUrl }: TicketCardProps) {
  return (
    <div className="relative p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      {/* Decorative gradient border */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/20 via-purple-500/10 to-indigo-500/20 rounded-xl" />
      <div className="relative flex flex-col space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Ticket #{booking.id}</h3>
        {route && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Route:</span> {route.name} ({route.origin} → {route.destination})
          </p>
        )}
        {trip && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Departure:</span> {new Date(trip.departureTime).toLocaleString()}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Seats:</span> {booking.seats}
          {booking.seatNumbers && booking.seatNumbers.length > 0 && (
            <span className="ml-1 text-primary-light font-semibold">
              ({booking.seatNumbers.join(', ')})
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Total:</span> ${booking.totalPrice?.toFixed(2) ?? (booking.seats * (trip?.price ?? 0)).toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Status:</span>{' '}
          <span className={booking.status === 'confirmed' ? 'text-green-500' : booking.status === 'cancelled' ? 'text-red-500' : 'text-yellow-500'}>
            {booking.status}
          </span>
        </p>
        {qrCodeUrl && (
          <div className="mt-2 self-center">
            <Image src={qrCodeUrl} alt="QR Code" width={120} height={120} className="rounded" />
          </div>
        )}
      </div>
    </div>
  );
}
