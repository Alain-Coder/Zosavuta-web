import type { NextApiRequest, NextApiResponse } from 'next';

// Placeholder in-memory data for demo purposes
let trips = [
  {
    id: 'trip-001',
    departureTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    origin: 'Lusaka',
    destination: 'Blantyre',
    seatCount: 40,
    // In a real app, seatMap would be stored in Firestore
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req;
  const operatorId = query.operatorId as string;

  // For now we ignore operatorId and return the static list
  if (method === 'GET') {
    res.status(200).json(trips);
    return;
  }

  if (method === 'POST') {
    // Create a new trip (simplified)
    const { origin, destination, departureTime, seatCount } = req.body;
    const newTrip = {
      id: `trip-${Date.now()}`,
      origin,
      destination,
      departureTime,
      seatCount: seatCount ?? 40,
    };
    trips.push(newTrip);
    res.status(201).json(newTrip);
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
