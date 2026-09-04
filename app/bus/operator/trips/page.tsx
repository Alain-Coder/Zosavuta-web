import React from 'react';
import { getTripsByOperator } from '@/lib/bus/firebase';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default async function TripsPage() {
  const user = auth.currentUser;
  const operatorId = user?.uid || '';
  const trips = await getTripsByOperator(operatorId);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trip Scheduling</h1>
      {trips.length === 0 ? (
        <p>No trips scheduled yet.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-2">
          {trips.map(trip => (
            <li key={trip.id}>
              Trip ID: {trip.id} – Seats Available: {trip.seatsAvailable} – Price: ${trip.price}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
