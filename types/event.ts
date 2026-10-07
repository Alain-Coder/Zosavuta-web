export interface Event {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  category: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  image: string;
  price: number;
  ticketsTotal: number;
  ticketsAvailable: number;
  ticketTypes?: Array<{ name: string; price: number }>;
  organizerId: string;
  organizer?: string;
  status: 'active' | 'draft' | 'sold_out' | 'cancelled' | 'completed';
  busTransport: boolean;
  seatingChart: boolean;
  isFeatured: boolean;
  createdAt?: string;
}
