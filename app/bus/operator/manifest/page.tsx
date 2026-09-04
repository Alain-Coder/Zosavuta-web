'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  UserCheck, 
  Edit,
  Bus as BusIcon,
  Tag,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  getTripsByOperator, 
  getBusesByOperator, 
  getRoutesByOperator, 
  getBookingsByOperator, 
  getTicketsByBooking,
  allocateSeats,
  allocateTicketSeat
} from '@/lib/bus/firebase';
import { getSeatGrid, generateSeatLabels } from '@/lib/bus/utils';
import type { Trip, Bus, Route, Booking, Ticket } from '@/lib/bus/types';

const PASSENGER_NAMES: Record<string, string> = {
  user1: 'Mwayi Kachika',
  user2: 'Chifundo Banda',
  user3: 'Tiwonge Phiri',
  user4: 'Limbani Gondwe',
};

export default function PassengerManifestPage() {
  const operatorId = 'op1';
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<{
    booking: Booking;
    ticket?: Ticket;
    seatLabel: string;
  } | null>(null);

  // Seat Reallocation State
  const [isReallocating, setIsReallocating] = useState(false);
  const [reallocateTargetSeat, setReallocateTargetSeat] = useState<string>('');

  useEffect(() => {
    loadManifestData();
  }, []);

  const loadManifestData = async () => {
    setLoading(true);
    try {
      const [fetchedTrips, fetchedBuses, fetchedRoutes, fetchedBookings] = await Promise.all([
        getTripsByOperator(operatorId),
        getBusesByOperator(operatorId),
        getRoutesByOperator(operatorId),
        getBookingsByOperator(operatorId)
      ]);

      setTrips(fetchedTrips);
      setBuses(fetchedBuses);
      setRoutes(fetchedRoutes);
      setBookings(fetchedBookings);

      if (fetchedTrips.length > 0 && !selectedTrip) {
        setSelectedTrip(fetchedTrips[0]);
      }
    } catch (e) {
      console.error('Failed to load manifest data', e);
    } finally {
      setLoading(false);
    }
  };

  // Find related objects for active trip
  const activeBus = selectedTrip ? buses.find(b => b.id === selectedTrip.busId) : null;
  const activeRoute = selectedTrip ? routes.find(r => r.id === selectedTrip.routeId) : null;
  const activeBookings = selectedTrip ? bookings.filter(b => b.tripId === selectedTrip.id && b.status === 'confirmed') : [];

  // Map occupied seats to booking/ticket info
  const occupiedSeatsMap: Record<string, { booking: Booking; seatLabel: string }> = {};
  activeBookings.forEach(booking => {
    if (booking.seatNumbers) {
      booking.seatNumbers.forEach(seat => {
        occupiedSeatsMap[seat] = { booking, seatLabel: seat };
      });
    }
  });

  const handleSeatClick = (seatLabel: string) => {
    setSelectedSeat(seatLabel);
    const occupiedInfo = occupiedSeatsMap[seatLabel];
    if (occupiedInfo) {
      setSelectedPassenger({
        booking: occupiedInfo.booking,
        seatLabel
      });
    } else {
      setSelectedPassenger(null);
    }
  };

  const handleOpenReallocate = () => {
    if (!selectedPassenger) return;
    setReallocateTargetSeat('');
    setIsReallocating(true);
  };

  const handleConfirmReallocate = async () => {
    if (!selectedPassenger || !reallocateTargetSeat) return;

    const booking = selectedPassenger.booking;
    const currentSeat = selectedPassenger.seatLabel;
    
    // Calculate new seats list
    const newSeats = (booking.seatNumbers || []).map(s => s === currentSeat ? reallocateTargetSeat : s);
    
    // Save to Firestore/Local database
    await allocateSeats(booking.id, newSeats);

    // Also update ticket list if tickets exist
    const tickets = await getTicketsByBooking(booking.id);
    const relatedTicket = tickets.find(t => t.seatNumber === currentSeat);
    if (relatedTicket) {
      await allocateTicketSeat(relatedTicket.id, reallocateTargetSeat);
    }

    setIsReallocating(false);
    setSelectedSeat(reallocateTargetSeat);
    setSelectedPassenger(null);
    
    // Refresh manifest data
    await loadManifestData();
  };

  // Generate list of vacant seats for reallocation selection
  const allSeatLabels = activeBus ? generateSeatLabels(activeBus.capacity, activeBus.seatLayoutType || '2x2') : [];
  const vacantSeatLabels = allSeatLabels.filter(seat => !occupiedSeatsMap[seat]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/20 p-6 rounded-2xl border border-indigo-500/10 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 uppercase">
            Passenger Manifest
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visualise occupied seats, track check-ins, and easily reallocate passenger seats.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-black uppercase text-muted-foreground whitespace-nowrap">Select Trip:</label>
          <select
            value={selectedTrip?.id || ''}
            onChange={(e) => {
              const trip = trips.find(t => t.id === e.target.value);
              setSelectedTrip(trip || null);
              setSelectedSeat(null);
              setSelectedPassenger(null);
            }}
            className="px-4 py-2.5 rounded-xl border border-border/60 bg-card text-sm text-foreground focus:outline-none focus:border-indigo-500 uppercase font-semibold"
          >
            {trips.map(trip => {
              const route = routes.find(r => r.id === trip.routeId);
              return (
                <option key={trip.id} value={trip.id}>
                  {route ? `${route.origin} → ${route.destination}` : 'Unknown'} ({new Date(trip.departureTime).toLocaleDateString()})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : selectedTrip ? (
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Visual Seating Plan & Boarding Status */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border/40 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-border/20 pb-4">
                <div>
                  <h2 className="text-lg font-black uppercase text-foreground/80 flex items-center gap-2">
                    <BusIcon className="w-5 h-5 text-indigo-500" />
                    Seating Layout Board
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Coach: {activeBus?.model || 'Volvo'} ({activeBus?.licensePlate || 'N/A'}) • Layout: {activeBus?.seatLayoutType || '2x2'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-muted border border-border/80" />
                    <span className="text-muted-foreground">Vacant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-500 shadow shadow-indigo-600/20" />
                    <span className="text-muted-foreground">Occupied</span>
                  </div>
                </div>
              </div>

              {activeBus ? (
                <div className="bg-muted/30 p-6 rounded-xl border border-border/20 max-h-[500px] overflow-y-auto">
                  {/* Windshield */}
                  <div className="w-full py-2 mb-8 text-center text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase bg-muted/70 rounded border border-border/30">
                    Front of Bus (Windshield)
                  </div>

                  <div className="flex flex-col gap-3">
                    {getSeatGrid(activeBus.capacity, activeBus.seatLayoutType || '2x2').map((row, rIdx) => (
                      <div key={rIdx} className="flex justify-center items-center gap-3">
                        {row.map((seat, cIdx) => {
                          if (seat === null) {
                            return <div key={`aisle-${cIdx}`} className="w-8 h-8 flex items-center justify-center text-[9px] font-bold text-muted-foreground/20">AISLE</div>;
                          }
                          const isOccupied = !!occupiedSeatsMap[seat];
                          const isSelected = selectedSeat === seat;
                          return (
                            <button
                              key={seat}
                              onClick={() => handleSeatClick(seat)}
                              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-extrabold select-none transition-all border ${
                                isOccupied
                                  ? isSelected
                                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                                  : isSelected
                                    ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500'
                                    : 'bg-card hover:border-indigo-500/40 text-foreground border-border/80'
                              }`}
                            >
                              {seat}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>No bus layout available</p>
              )}
            </div>

            {/* Passenger Manifest list table */}
            <div className="p-6 bg-card rounded-2xl border border-border/40 shadow-sm">
              <h2 className="text-lg font-black uppercase text-foreground/80 flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-500" />
                Booked Passengers List ({activeBookings.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border/20 text-muted-foreground text-xs uppercase font-black tracking-wider">
                      <th className="py-3 px-4">Seat</th>
                      <th className="py-3 px-4">Passenger Name</th>
                      <th className="py-3 px-4">Ref Code</th>
                      <th className="py-3 px-4">Tickets</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No passengers booked on this trip yet.
                        </td>
                      </tr>
                    ) : (
                      activeBookings.map((b) => {
                        const name = PASSENGER_NAMES[b.userId] || 'Passenger';
                        return (b.seatNumbers || []).map((seat) => (
                          <tr 
                            key={`${b.id}-${seat}`} 
                            onClick={() => handleSeatClick(seat)}
                            className={`border-b border-border/10 hover:bg-muted/30 cursor-pointer transition-colors ${
                              selectedSeat === seat ? 'bg-indigo-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-extrabold text-indigo-600">{seat}</td>
                            <td className="py-3 px-4 font-bold">{name}</td>
                            <td className="py-3 px-4 font-mono text-xs">{b.bookingReference || b.id.substr(0, 8)}</td>
                            <td className="py-3 px-4">{b.seats} Pass(es)</td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 uppercase border border-green-500/15">
                                Confirmed
                              </span>
                            </td>
                          </tr>
                        ));
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Passenger Information Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold tracking-wider uppercase text-foreground/80 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              Manifest Inspector
            </h2>

            {selectedPassenger ? (
              <div className="p-6 bg-card rounded-2xl border border-border/40 shadow-sm space-y-6 relative overflow-hidden">
                {/* Decorative border */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase block mb-1">
                      Assigned Seat
                    </span>
                    <span className="text-3xl font-black text-foreground">
                      Seat {selectedPassenger.seatLabel}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-bold uppercase rounded">
                    Active Boarding
                  </span>
                </div>

                <div className="space-y-4 border-t border-border/10 pt-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Passenger Name</span>
                    <span className="font-extrabold text-foreground">{PASSENGER_NAMES[selectedPassenger.booking.userId] || 'Guest Passenger'}</span>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Booking Reference</span>
                    <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded border border-border/20 mt-1 inline-block">
                      {selectedPassenger.booking.bookingReference || 'BR-N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Tickets Booked</span>
                      <span className="font-bold text-foreground">{selectedPassenger.booking.seats} seat(s)</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">Total Amount</span>
                      <span className="font-bold text-indigo-500">${selectedPassenger.booking.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/10 pt-4 flex flex-col gap-2">
                  <button
                    onClick={handleOpenReallocate}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all active:scale-95"
                  >
                    <Edit className="w-4 h-4" />
                    Reallocate Seat
                  </button>
                </div>
              </div>
            ) : selectedSeat ? (
              <div className="p-6 bg-card rounded-2xl border border-border/40 shadow-sm text-center py-12">
                <HelpCircle className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-pulse" />
                <h3 className="font-black text-foreground uppercase text-lg">Seat {selectedSeat} is vacant</h3>
                <p className="text-xs text-muted-foreground mt-2 px-4">
                  There are currently no bookings allocated to this seat on this scheduled trip.
                </p>
              </div>
            ) : (
              <div className="p-6 bg-card rounded-2xl border border-border/40 shadow-sm text-center py-12 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
                <p className="text-sm font-semibold">Select an occupied seat from the bus map above to view passenger manifest data.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-card/40 border border-border/40 rounded-2xl">
          <p className="text-muted-foreground font-bold">No active trips scheduled. Create a trip first under scheduling.</p>
        </div>
      )}

      {/* Seat Reallocation Modal */}
      {isReallocating && selectedPassenger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-6">
            <button
              onClick={() => setIsReallocating(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Reallocate Passenger Seat</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Move {PASSENGER_NAMES[selectedPassenger.booking.userId] || 'Guest'} from **Seat {selectedPassenger.seatLabel}** to a vacant seat.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Select Vacant Seat</label>
                {vacantSeatLabels.length === 0 ? (
                  <p className="text-xs text-red-500 font-bold bg-red-500/5 p-3 rounded-xl border border-red-500/15">
                    No vacant seats available on this bus! The bus is fully booked.
                  </p>
                ) : (
                  <select
                    value={reallocateTargetSeat}
                    onChange={(e) => setReallocateTargetSeat(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500 font-extrabold"
                  >
                    <option value="" className="bg-card">-- Choose Seat --</option>
                    {vacantSeatLabels.map((seat) => (
                      <option key={seat} value={seat} className="bg-card">
                        Seat {seat} (Vacant)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsReallocating(false)}
                className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reallocateTargetSeat}
                onClick={handleConfirmReallocate}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-muted disabled:to-muted disabled:text-muted-foreground text-white font-bold text-xs uppercase tracking-widest transition-all"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
