'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top scroll coordinate to 0
  // make it scroll gently
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className={cn(
      "fixed bottom-8 right-8 z-50 transition-all duration-300 transform",
      isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-50 pointer-events-none"
    )}>
      <Button
        variant="secondary"
        size="icon"
        onClick={scrollToTop}
        className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all border-none"
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-6 h-6" />
      </Button>
    </div>
  );
}
