import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPinIcon, CalendarIcon, TicketIcon } from 'lucide-react';
import Image from 'next/image';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  image: string;
  category: string;
  ticketsAvailable: number;
  price: number;
  organizer: string;
}

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return {
        month: months[monthIndex] || '',
        day
      };
    }
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return { month, day };
  };

  const { month, day } = formatDate(event.date);

  return (
    <div className="relative group transition-all duration-500 hover:-translate-y-2 h-full">
      {/* Ticket Container */}
      <div className="max-w-sm mx-auto bg-card rounded-[24px] shadow-lg border border-border/50 overflow-hidden flex flex-col h-full hover:shadow-2xl group-hover:border-primary/30 transition-all">
        
        {/* Top Section: Artwork & Details */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute top-4 left-4">
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-md border-none px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-md">
              {event.category}
            </Badge>
          </div>
          
          {/* Date Over Image */}
          <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-md flex flex-col items-center justify-center w-12 h-14 border border-border/50">
            <span className="text-[9px] font-bold text-primary tracking-wider uppercase leading-none mt-1">{month}</span>
            <span className="text-xl font-black text-foreground leading-none mb-1">{day}</span>
          </div>
          
          {/* Event Title over image */}
          <div className="absolute bottom-4 left-5 right-5 z-10">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary/80">Presented by</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white truncate">{event.organizer || 'Zosavuta Events'}</span>
            </div>
            <h3 className="text-xl font-black tracking-tight leading-tight uppercase text-white drop-shadow-md line-clamp-2">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 bg-card relative flex-grow flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Venue</p>
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                 <MapPinIcon className="w-4 h-4 text-primary flex-shrink-0" />
                 <span className="truncate">{event.venue || event.location}</span>
              </div>
            </div>
            
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Time</p>
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                 <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
                 <span>{event.time}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Perforated Divider */}
        <div className="flex items-center justify-center relative bg-card flex-shrink-0">
          <div className="absolute left-0 -ml-3 w-6 h-6 bg-background rounded-full border-r border-border/50" />
          <div className="absolute right-0 -mr-3 w-6 h-6 bg-background rounded-full border-l border-border/50" />
          <div className="w-full border-t-2 border-dashed border-border/60 mx-6" />
        </div>

        {/* Bottom Stub: Action */}
        <div className="p-6 bg-muted/30 flex items-center justify-between flex-shrink-0 border-t border-border/5">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Tickets from</span>
            <div className="font-black text-xl text-primary flex items-baseline gap-1 italic">
              <span className="text-xs font-bold">MWK</span>
              <span>{event.price.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <TicketIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

