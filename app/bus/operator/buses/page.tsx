'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Wifi, 
  Wind, 
  BatteryCharging, 
  Compass, 
  Info, 
  ChevronRight,
  Sparkles,
  Layers,
  Wrench,
  Bus as BusIcon,
  X
} from 'lucide-react';
import { getBusesByOperator, addBus, updateBus, deleteBus } from '@/lib/bus/firebase';
import { getSeatGrid } from '@/lib/bus/utils';
import type { Bus } from '@/lib/bus/types';

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  // Form states
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState(40);
  const [seatLayoutType, setSeatLayoutType] = useState<'2x2' | '2x1' | 'consecutive'>('2x2');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock operator id for simplicity
  const operatorId = 'op1';

  const amenitiesList = [
    { name: 'WiFi', icon: <Wifi className="w-4 h-4" /> },
    { name: 'AC', icon: <Wind className="w-4 h-4" /> },
    { name: 'Charging Ports', icon: <BatteryCharging className="w-4 h-4" /> },
    { name: 'Toilet', icon: <Compass className="w-4 h-4" /> },
    { name: 'Reclining Seats', icon: <Sparkles className="w-4 h-4" /> },
  ];

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    setLoading(true);
    const data = await getBusesByOperator(operatorId);
    setBuses(data);
    if (data.length > 0 && !selectedBus) {
      setSelectedBus(data[0]);
    }
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingBus(null);
    setModel('');
    setLicensePlate('');
    setCapacity(40);
    setSeatLayoutType('2x2');
    setSelectedAmenities([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bus: Bus) => {
    setEditingBus(bus);
    setModel(bus.model || '');
    setLicensePlate(bus.licensePlate);
    setCapacity(bus.capacity);
    setSeatLayoutType(bus.seatLayoutType || '2x2');
    setSelectedAmenities(bus.amenities || []);
    setIsModalOpen(true);
  };

  const handleToggleAmenity = (amenityName: string) => {
    if (selectedAmenities.includes(amenityName)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenityName));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityName]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) return;

    const busData = {
      operatorId,
      licensePlate: licensePlate.toUpperCase(),
      capacity,
      model,
      seatLayoutType,
      amenities: selectedAmenities,
    };

    if (editingBus) {
      await updateBus(editingBus.id, busData);
    } else {
      const added = await addBus(busData);
      setSelectedBus(added);
    }

    setIsModalOpen(false);
    fetchBuses();
  };

  const handleDelete = async (busId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this bus from your fleet?')) {
      await deleteBus(busId);
      if (selectedBus?.id === busId) {
        setSelectedBus(null);
      }
      fetchBuses();
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/20 p-6 rounded-2xl border border-indigo-500/10 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 uppercase">
            Bus Fleet Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Add, configure, and visualise your fleet including custom seating layouts.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add New Bus
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Fleet List (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-extrabold tracking-wider uppercase text-foreground/80 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Active Fleet ({buses.length})
            </h2>

            {buses.length === 0 ? (
              <div className="p-12 text-center bg-card/40 rounded-2xl border border-dashed border-border/50">
                <BusIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground font-semibold">No buses in your fleet yet.</p>
                <button
                  onClick={handleOpenAddModal}
                  className="mt-4 text-sm font-bold text-indigo-600 hover:underline uppercase"
                >
                  Create your first bus now
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {buses.map((bus) => (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBus(bus)}
                    className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden group ${
                      selectedBus?.id === bus.id
                        ? 'bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent border-indigo-500 shadow-md'
                        : 'bg-card hover:bg-card/80 border-border/40 hover:border-indigo-500/40 shadow-sm'
                    }`}
                  >
                    {/* Decorative gradient corner */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform" />

                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          selectedBus?.id === bus.id 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <BusIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg tracking-tight text-foreground uppercase">
                            {bus.model || 'Unknown Coach'}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono font-bold tracking-wider">
                            {bus.licensePlate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(bus);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(bus.id, e)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-muted/30 p-2.5 rounded-xl border border-border/20">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Capacity</span>
                        <span className="font-black text-foreground text-sm">{bus.capacity} Seats</span>
                      </div>
                      <div className="bg-muted/30 p-2.5 rounded-xl border border-border/20">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Seating Layout</span>
                        <span className="font-black text-foreground text-sm capitalize">{bus.seatLayoutType || '2x2'}</span>
                      </div>
                    </div>

                    {/* Amenities Badges */}
                    {bus.amenities && bus.amenities.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {bus.amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/5 text-[9px] font-bold text-indigo-500 border border-indigo-500/10 uppercase"
                          >
                            {amenity === 'WiFi' && <Wifi className="w-2.5 h-2.5" />}
                            {amenity === 'AC' && <Wind className="w-2.5 h-2.5" />}
                            {amenity === 'Charging Ports' && <BatteryCharging className="w-2.5 h-2.5" />}
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seat Layout Visualizer Panel (1 col) */}
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold tracking-wider uppercase text-foreground/80 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-500" />
              Seating Map Layout
            </h2>

            {selectedBus ? (
              <div className="p-6 bg-card rounded-2xl border border-border/40 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-extrabold text-foreground uppercase">{selectedBus.model}</h3>
                    <p className="text-xs text-muted-foreground">
                      Seating plan: {selectedBus.capacity} seats ({selectedBus.seatLayoutType || '2x2'})
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold tracking-wider uppercase rounded border border-green-500/20">
                    Active Preview
                  </span>
                </div>

                {/* Seat Map Visualizer Grid */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border/20 max-h-[400px] overflow-y-auto">
                  {/* Bus Front Indicator */}
                  <div className="w-full py-1.5 mb-6 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase bg-muted/60 rounded border border-border/30 flex items-center justify-center gap-2">
                    <Wrench className="w-3 h-3 text-indigo-500" />
                    Front of Bus (Windshield)
                  </div>

                  <div className="flex flex-col gap-3">
                    {getSeatGrid(selectedBus.capacity, selectedBus.seatLayoutType || '2x2').map((row, rIdx) => (
                      <div key={rIdx} className="flex justify-center items-center gap-3">
                        {row.map((seat, cIdx) => {
                          if (seat === null) {
                            // Aisle representation
                            return (
                              <div
                                key={`aisle-${cIdx}`}
                                className="w-8 h-8 flex items-center justify-center text-[9px] font-black uppercase text-muted-foreground/30 select-none tracking-widest"
                              >
                                AISLE
                              </div>
                            );
                          }
                          return (
                            <div
                              key={seat}
                              className="w-10 h-10 rounded-lg bg-card border border-border/80 flex items-center justify-center text-xs font-bold text-foreground shadow-sm hover:border-indigo-500 select-none transition-all"
                              title={`Seat ${seat}`}
                            >
                              {seat}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-card/40 rounded-2xl border border-dashed border-border/50 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">Select a bus to inspect its seat allocation map.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Bus Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Fields Form */}
            <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto border-r border-border/20">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
                {editingBus ? 'Edit Fleet Bus' : 'Configure New Bus'}
              </h2>

              <div className="space-y-4">
                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Bus Model / Name</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Scania Touring, Volvo Coach"
                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* License Plate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">License Plate</label>
                  <input
                    type="text"
                    required
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. LA-9382"
                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors font-mono uppercase"
                  />
                </div>

                {/* Capacity & Seating Layout Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Capacity (Seats)</label>
                    <input
                      type="number"
                      required
                      min={6}
                      max={80}
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Layout Type</label>
                    <select
                      value={seatLayoutType}
                      onChange={(e) => setSeatLayoutType(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-border/60 bg-transparent text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors capitalize"
                    >
                      <option value="2x2" className="bg-card">2x2 Layout</option>
                      <option value="2x1" className="bg-card">2x1 Layout</option>
                      <option value="consecutive" className="bg-card">Consecutive</option>
                    </select>
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">Bus Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {amenitiesList.map((amenity) => {
                      const isSelected = selectedAmenities.includes(amenity.name);
                      return (
                        <button
                          key={amenity.name}
                          type="button"
                          onClick={() => handleToggleAmenity(amenity.name)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                              : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/55'
                          }`}
                        >
                          {amenity.icon}
                          {amenity.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/10 transition-colors"
                >
                  {editingBus ? 'Save Changes' : 'Add Bus'}
                </button>
              </div>
            </form>

            {/* Right Side: LIVE Seat layout visualizer preview (WOW effect) */}
            <div className="hidden md:flex w-[340px] bg-muted/40 p-6 flex-col overflow-y-auto max-h-full">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/80 mb-4 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Live Seat Grid Preview
              </h3>

              <div className="flex-1 bg-card/60 p-4 rounded-xl border border-border/30 overflow-y-auto">
                <div className="w-full py-1 text-center text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase bg-muted/50 rounded border border-border/20 mb-4">
                  Windshield
                </div>

                <div className="flex flex-col gap-2">
                  {capacity > 0 ? (
                    getSeatGrid(capacity, seatLayoutType).map((row, rIdx) => (
                      <div key={rIdx} className="flex justify-center items-center gap-2">
                        {row.map((seat, cIdx) => {
                          if (seat === null) {
                            return <div key={`aisle-${cIdx}`} className="w-6 text-[8px] font-black text-center text-muted-foreground/20">AISLE</div>;
                          }
                          return (
                            <div
                              key={seat}
                              className="w-8 h-8 rounded bg-card border border-border/60 flex items-center justify-center text-[10px] font-bold text-foreground/80"
                            >
                              {seat}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-muted-foreground py-8">Select capacity to view preview</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
