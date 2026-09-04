'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  MapPin, 
  Calendar, 
  Sliders, 
  Tag, 
  CheckCircle, 
  Users,
  Compass,
  Edit,
  X
} from 'lucide-react';
import { 
  getBookingsByOperator, 
  getTripsByOperator, 
  getRoutesByOperator, 
  getBusesByOperator, 
  allocateSeats,
  getTicketsByBooking,
  allocateTicketSeat
} from '@/lib/bus/firebase';
import { generateSeatLabels } from '@/lib/bus/utils';
import type { Booking, Trip, Route, Bus } from '@/lib/bus/types';

const PASSENGER_NAMES: Record<string, string> = {
  user1: 'Mwayi Kachika',
  user2: 'Chifundo Banda',
  user3: 'Tiwonge Phiri',
  user4: 'Limbani Gondwe',
};

export default function BookingsPage() {
  const operatorId = 'op1';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Seat Allocation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedBookings, fetchedTrips, fetchedRoutes, fetchedBuses] = await Promise.all([
        getBookingsByOperator(operatorId),
        getTripsByOperator(operatorId),
        getRoutesByOperator(operatorId),
        getBusesByOperator(operatorId)
      ]);
      setBookings(fetchedBookings);
      setTrips(fetchedTrips);
      setRoutes(fetchedRoutes);
      setBuses(fetchedBuses);
    } catch (e) {
      console.error('Failed to fetch bookings data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAllocationModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedSeats(booking.seatNumbers || []);
    setIsModalOpen(true);
  };

  const handleSeatCheckboxToggle = (seatLabel: string, maxSeats: number) => {
    if (selectedSeats.includes(seatLabel)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatLabel));
    } else {
      if (selectedSeats.length < maxSeats) {
        setSelectedSeats([...selectedSeats, seatLabel]);
      } else {
        // Replace first element to maintain capacity limit
        setSelectedSeats([...selectedSeats.slice(1), seatLabel]);
      }
    }
  };

  const handleSaveAllocation = async () => {
    if (!selectedBooking) return;
    
    // Save seat numbers to booking
    await allocateSeats(selectedBooking.id, selectedSeats);

    // Sync individual tickets seat allocation
    try {
      const tickets = await getTicketsByBooking(selectedBooking.id);
      for (let i = 0; i < tickets.length; i++) {
        const seat = selectedSeats[i];
        if (seat) {
          await allocateTicketSeat(tickets[i].id, seat);
        }
      }
    } catch (err) {
      console.warn('Failed to assign seats to individual tickets', err);
    }

    setIsModalOpen(false);
    setSelectedBooking(null);
    fetchData();
  };

  // Helper selectors
  const getTripInfo = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return null;
    const route = routes.find(r => r.id === trip.routeId);
    const bus = buses.find(b => b.id === trip.busId);
    return { trip, route, bus };
  };

  // Find all occupied seats on the current trip, excluding the selected booking's seats
  const getOccupiedSeatsOnTrip = (tripId: string, currentBookingId: string): string[] => {
    const occupied: string[] = [];
    bookings.forEach(b => {
      if (b.tripId === tripId && b.id !== currentBookingId && b.status === 'confirmed' && b.seatNumbers) {
        occupied.push(...b.seatNumbers);
      }
    });
    return occupied;
  };

  // Filter Bookings list
  const filteredBookings = bookings.filter(booking => {
    const passengerName = (PASSENGER_NAMES[booking.userId] || 'Guest Passenger').toLowerCase();
    const reference = (booking.bookingReference || '').toLowerCase();
    const id = booking.id.toLowerCase();
    
    const matchesSearch = passengerName.includes(searchTerm.toLowerCase()) || 
                          reference.includes(searchTerm.toLowerCase()) ||
                          id.includes(searchTerm.toLowerCase());
                          
    const matchesStatus = statusFilter === 'all' ? true : booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/20 p-6 rounded-2xl border border-indigo-500/10 backdrop-blur-md">
        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 uppercase">
          Bookings Management
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track ticket reservations, view payment details, and allocate passenger seats.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border/40 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search passenger, ref code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500 capitalize font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table List of Bookings */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/20 text-muted-foreground text-xs uppercase font-black tracking-wider bg-muted/20">
                  <th className="py-4 px-6">Ref Code</th>
                  <th className="py-4 px-6">Passenger Name</th>
                  <th className="py-4 px-6">Route & Schedule</th>
                  <th className="py-4 px-6">Seats Reserved</th>
                  <th className="py-4 px-6">Seat Numbers</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground font-semibold">
                      No matching bookings found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const passengerName = PASSENGER_NAMES[b.userId] || 'Guest Passenger';
                    const tripDetails = getTripInfo(b.tripId);
                    
                    return (
                      <tr key={b.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs font-bold text-foreground">
                          {b.bookingReference || b.id.substr(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-6 font-semibold">{passengerName}</td>
                        <td className="py-4 px-6">
                          {tripDetails?.route ? (
                            <div>
                              <div className="font-semibold text-foreground">{tripDetails.route.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(tripDetails.trip.departureTime).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown Trip</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-bold">{b.seats} Seats</td>
                        <td className="py-4 px-6">
                          {b.seatNumbers && b.seatNumbers.length > 0 ? (
                            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 font-extrabold text-xs rounded border border-indigo-500/20">
                              {b.seatNumbers.join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                              Unallocated
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            b.status === 'confirmed'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : b.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleOpenAllocationModal(b)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow shadow-indigo-600/10 active:scale-95 transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Seats
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seat Allocation Dialog Modal */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Allocate Seat Numbers</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select exactly **{selectedBooking.seats} seat(s)** for {PASSENGER_NAMES[selectedBooking.userId] || 'Passenger'}.
              </p>
            </div>

            {(() => {
              const tripDetails = getTripInfo(selectedBooking.tripId);
              if (!tripDetails || !tripDetails.bus) return <p className="text-sm text-red-500">Bus configuration missing.</p>;
              
              const bus = tripDetails.bus;
              const allSeats = generateSeatLabels(bus.capacity, bus.seatLayoutType || '2x2');
              const occupiedSeats = getOccupiedSeatsOnTrip(selectedBooking.tripId, selectedBooking.id);

              return (
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/20 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-muted-foreground block uppercase">Current Selection</span>
                      <span className="font-extrabold text-indigo-500 text-sm">
                        {selectedSeats.length === 0 ? 'None selected' : selectedSeats.join(', ')}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                      selectedSeats.length === selectedBooking.seats 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/25' 
                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/25'
                    }`}>
                      {selectedSeats.length} / {selectedBooking.seats} Chosen
                    </span>
                  </div>

                  {/* Visual grid layout select */}
                  <div className="bg-muted/20 p-5 rounded-xl border border-border/30 max-h-[300px] overflow-y-auto">
                    <div className="text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/60 py-1.5 rounded border border-border/20 mb-6">
                      Windshield (Front)
                    </div>

                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {allSeats.map((seat) => {
                        const isOccupied = occupiedSeats.includes(seat);
                        const isChecked = selectedSeats.includes(seat);
                        
                        return (
                          <button
                            key={seat}
                            disabled={isOccupied}
                            type="button"
                            onClick={() => handleSeatCheckboxToggle(seat, selectedBooking.seats)}
                            className={`w-11 h-11 rounded-lg text-xs font-bold transition-all border flex items-center justify-center select-none ${
                              isOccupied
                                ? 'bg-muted/40 text-muted-foreground/40 border-border/30 cursor-not-allowed'
                                : isChecked
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow shadow-indigo-600/25'
                                : 'bg-card hover:border-indigo-500/40 text-foreground border-border/80'
                            }`}
                          >
                            {seat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedSeats.length !== selectedBooking.seats}
                onClick={handleSaveAllocation}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-muted disabled:to-muted disabled:text-muted-foreground text-white font-bold text-xs uppercase tracking-widest transition-all"
              >
                Save Seat Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
