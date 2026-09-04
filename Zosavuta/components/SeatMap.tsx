import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

export interface Seat {
  number: string;
  row: number;
  col: number;
  status: 'available' | 'booked';
}

interface SeatMapProps {
  tripId: string;
  initialSeats: Seat[];
  onSeatChange?: (seats: Seat[]) => void;
  disabledSeats?: number[];
}

/**
 * SeatMap renders a static bus placeholder image with clickable seat overlays.
 * Seats are positioned on a 13×5 grid (65 seats) trimmed to 58 seats. Operators may omit additional seats via the `disabledSeats` prop.
 * Clicking a seat toggles its status and persists the change via `/api/operator/book-seat`.
 */
export default function SeatMap({ tripId, initialSeats, onSeatChange, disabledSeats = [] }: SeatMapProps) {
  // Ensure each seat's status conforms to the allowed union type
  const sanitizedSeats: Seat[] = initialSeats.map((s) => ({
    ...s,
    status: s.status === 'available' ? 'available' : 'booked',
  }));
  const [seats, setSeats] = useState<Seat[]>(sanitizedSeats);


  // Convert disabledSeats to a Set for fast lookup
  const disabledSet = new Set(disabledSeats.map(String));

  // Notify parent of seat changes
  useEffect(() => {
    if (onSeatChange) onSeatChange(seats);
  }, [seats, onSeatChange]);

  const toggleSeat = async (seatNumber: string) => {
    // Explicitly type the result as Seat[] to keep the status union
    const updated: Seat[] = seats.map((s) =>
      s.number === seatNumber
        ? { ...s, status: s.status === 'available' ? 'booked' : 'available' }
        : s
    );
    setSeats(updated);
    try {
      const res = await fetch('/api/operator/book-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          seatNumber,
          newStatus: updated.find((s) => s.number === seatNumber)!.status,
        }),
      });
      if (!res.ok) throw new Error('Failed to persist seat change');
      toast.success(`Seat ${seatNumber} ${updated.find((s) => s.number === seatNumber)!.status}`);
    } catch (err) {
      console.error(err);
      toast.error('Could not save seat status');
    }
  };

  // Layout helpers – a simple grid over the placeholder image
  const seatSize = 30; // px
  const gap = 8; // px
  const rows = 13;
  const cols = 5;
  const imageWidth = 400; // matches placeholder dimensions
  const imageHeight = 200;

  const calculatePosition = (row: number, col: number) => {
    const offsetX = (imageWidth - cols * seatSize - (cols - 1) * gap) / 2;
    const offsetY = (imageHeight - rows * seatSize - (rows - 1) * gap) / 2;
    const left = offsetX + col * (seatSize + gap);
    const top = offsetY + row * (seatSize + gap);
    return { left, top };
  };

  return (
    <div className="relative" style={{ width: `${imageWidth}px`, height: `${imageHeight}px` }}>
      <Image src="/bus_placeholder.png" alt="Bus seat map" fill style={{ objectFit: 'contain' }} priority />
      {seats.filter(seat => !disabledSet.has(seat.number)).map((seat) => {
        const { left, top } = calculatePosition(seat.row, seat.col);
        const bg = seat.status === 'booked' ? 'bg-red-500' : 'bg-green-500';
        return (
          <button
            key={seat.number}
            className={`absolute ${bg} rounded-sm text-white text-xs flex items-center justify-center transition-transform hover:scale-110`}
            style={{ width: `${seatSize}px`, height: `${seatSize}px`, left: `${left}px`, top: `${top}px` }}
            onClick={() => toggleSeat(seat.number)}
          >
            {seat.number}
          </button>
        );
      })}
    </div>
  );
}
