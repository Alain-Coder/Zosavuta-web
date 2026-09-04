import type { NextApiRequest, NextApiResponse } from 'next';
import { getEventsByOrganizer } from '@/lib/bus/api';
import { getAuthUser } from '@/lib/auth-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const authUser = await getAuthUser(req);
  if (!authUser?.uid) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  try {
    const events = await getEventsByOrganizer(authUser.uid);
    return res.status(200).json(events);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return res.status(500).json({ error: 'Failed to load tickets' });
  }
}
