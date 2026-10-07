'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TicketIcon, Facebook, Twitter, Instagram, Linkedin, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subMessage, setSubMessage] = useState('');

  if (pathname === '/auth' || pathname?.startsWith?.('/admin') || pathname?.startsWith?.('/organizer')) {
    return null;
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'footer' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubStatus('success');
        setSubMessage(data.message || "You're subscribed!");
        setEmail('');
      } else {
        setSubStatus('error');
        setSubMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setSubStatus('error');
      setSubMessage('Network error. Please try again.');
    }
  };

  return (
    <footer className="light bg-secondary text-secondary-foreground border-t border-border mt-auto pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-primary/10 transition-transform group-hover:scale-105">
                <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" priority />
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
              <a href="https://www.facebook.com/share/1CXU96jdXK/?mibextid=wwXIfr" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              {/* <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a> */}
              <a href="https://www.instagram.com/zosavuta_e_ticketing?stkn=ODdjdXAzM215cDN1&utm_source=qr" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              {/* <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a> */}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-black uppercase tracking-widest text-xs text-white mb-6">Quick Links</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/" className="text-secondary-foreground/70 hover:text-primary transition-colors">Explore Events</Link></li>
              <li><Link href="/organizer" className="text-secondary-foreground/70 hover:text-primary transition-colors">Sell Tickets</Link></li>
              <li><Link href="/my-bookings" className="text-secondary-foreground/70 hover:text-primary transition-colors">My Tickets</Link></li>
              <li><Link href="/auth" className="text-secondary-foreground/70 hover:text-primary transition-colors">Join Community</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-black uppercase tracking-widest text-xs text-white mb-6">Company</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/about" className="text-secondary-foreground/70 hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/support" className="text-secondary-foreground/70 hover:text-primary transition-colors">Contact Support</Link></li>
              <li><Link href="/terms" className="text-secondary-foreground/70 hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-secondary-foreground/70 hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h3 className="font-black uppercase tracking-widest text-xs text-white mb-6">Stay Updated</h3>
            <p className="text-secondary-foreground/70 text-sm">
              Get the latest events and exclusive offers delivered to your inbox.
            </p>

            {subStatus === 'success' ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{subMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="footer-newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSubStatus('idle'); }}
                    placeholder="Your email"
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 focus:ring-primary"
                  />
                  <Button
                    id="footer-newsletter-submit"
                    type="submit"
                    size="icon"
                    disabled={subStatus === 'loading'}
                    className="bg-primary hover:bg-primary/90 h-11 w-11 flex-shrink-0"
                  >
                    {subStatus === 'loading'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                {subStatus === 'error' && (
                  <p className="text-red-400 text-xs">{subMessage}</p>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-secondary-foreground/40">
          <p>&copy; {new Date().getFullYear()} ZOSAVUTA TICKETS. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-secondary-foreground/50 normal-case tracking-normal">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
