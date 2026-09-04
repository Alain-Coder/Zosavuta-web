'use client';

import { cn } from '@/lib/utils';
import { 
  Music, 
  Trophy, 
  Users, 
  Palmtree, 
  Theater, 
  Star, 
  Gamepad2, 
  Heart, 
  Utensils, 
  ChevronRight 
} from 'lucide-react';
import { useRef } from 'react';

const categories = [
  { id: 'all', name: 'Featured', icon: Star },
  { id: 'music', name: 'Music', icon: Music },
  { id: 'sports', name: 'Sports', icon: Trophy },
  { id: 'conference', name: 'Conferences', icon: Users },
  { id: 'festival', name: 'Festivals', icon: Palmtree },
  { id: 'theater', name: 'Theatre', icon: Theater },
  { id: 'lifestyle', name: 'Lifestyle', icon: Heart },
  { id: 'food', name: 'Food & Drink', icon: Utensils },
  { id: 'workshop', name: 'Workshops', icon: Gamepad2 },
];

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryChips({ selectedCategory, onSelectCategory }: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative group">
      <div 
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full border text-[13px] font-semibold uppercase tracking-[0.04em] transition-all duration-200 whitespace-nowrap min-w-fit",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20" 
                  : "bg-card/90 text-muted-foreground border-border hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
              {cat.name}
            </button>
          );
        })}
      </div>
      
      {/* Optional: Add scroll indicator if needed */}
      <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
    </div>
  );
}
