import Link from 'next/link';
import { TicketIcon, Facebook, Twitter, Instagram, Linkedin, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function Footer() {
  return (
    <footer className="light bg-secondary text-secondary-foreground border-t border-border mt-auto pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                <TicketIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tighter text-white leading-none">ZOSAVUTA</span>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase leading-none mt-0.5">Tickets MW</span>
              </div>
            </Link>
            <p className="text-secondary-foreground/70 text-sm leading-relaxed max-w-xs">
              Malawi's premier event discovery and ticketing platform. We connect you to the experiences that matter most.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-black uppercase tracking-widest text-xs text-white mb-6">Quick Links</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/events" className="text-secondary-foreground/70 hover:text-primary transition-colors">Explore Events</Link></li>
              <li><Link href="/organizer" className="text-secondary-foreground/70 hover:text-primary transition-colors">Sell Tickets</Link></li>
              <li><Link href="/my-bookings" className="text-secondary-foreground/70 hover:text-primary transition-colors">My Tickets</Link></li>
              <li><Link href="/auth" className="text-secondary-foreground/70 hover:text-primary transition-colors">Join Community</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-black uppercase tracking-widest text-xs text-white mb-6">Company</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li><a href="#" className="text-secondary-foreground/70 hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="text-secondary-foreground/70 hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="text-secondary-foreground/70 hover:text-primary transition-colors">Contact Support</a></li>
              <li><a href="#" className="text-secondary-foreground/70 hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h3 className="font-black uppercase tracking-widest text-xs text-white mb-6">Stay Updated</h3>
            <p className="text-secondary-foreground/70 text-sm">
              Get the latest events and exclusive offers delivered to your inbox.
            </p>
            <div className="flex gap-2">
              <Input 
                placeholder="Your email" 
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 focus:ring-primary"
              />
              <Button size="icon" className="bg-primary hover:bg-primary/90 h-11 w-11 flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-secondary-foreground/40">
          <p>&copy; {new Date().getFullYear()} ZOSAVUTA TICKETS. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
