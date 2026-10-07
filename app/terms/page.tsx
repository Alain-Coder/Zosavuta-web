'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileText, ChevronLeft, ArrowRight, Check } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <section className="relative bg-secondary py-16 text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
            Terms of <span className="text-primary italic">Service</span>
          </h1>
          <p className="text-sm text-white/70 font-medium max-w-2xl leading-relaxed">
            Effective Date: October 7, 2026. Please read these Terms of Service carefully before purchasing tickets or utilizing the Zosavuta event discovery platform.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-10">
        <Card className="p-8 border border-border/60 shadow-xl rounded-3xl space-y-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
              Acceptance of Terms
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              By accessing, browsing, or purchasing tickets through Zosavuta, you agree to be bound by these Terms of Service and all applicable laws of Malawi. If you do not agree to these terms, please refrain from using our services.
            </p>
          </section>

          <hr className="border-border/40" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
              Ticket Purchases & Redirection
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Zosavuta operates as a primary event discovery platform for events happening in Malawi. Including ticket purchasing, user account registration, payment processing, and electronic ticket issuance.</p>
            <ul className="space-y-2 pt-2 text-xs font-semibold text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>All ticket prices are listed in Malawi Kwacha (MWK) unless specified otherwise.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ticket verification and venue admission QR codes are issued digitally after successful payment.</span>
              </li>
            </ul>
          </section>

          <hr className="border-border/40" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">3</span>
              Refund & Resale Policy
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Except where an event is officially cancelled by the event organizer, all ticket sales are final and non-refundable. If an attendee can no longer attend an event, they may utilize Zosavuta's official Fan-to-Fan Marketplace to safely resell verified tickets.
            </p>
          </section>

          <hr className="border-border/40" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">4</span>
              Organizer Responsibilities
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Event organizers hosting events on Zosavuta are responsible for providing accurate event descriptions, venue locations, pricing, and timing. Zosavuta reserves the right to unlist any event that violates community standards or local regulations.
            </p>
          </section>

          <hr className="border-border/40" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">5</span>
              Contact Information
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              For questions concerning these Terms of Service or general inquiries, please email us at <a href="mailto:support@zosavuta.com" className="text-primary font-bold underline">support@zosavuta.com</a>.
            </p>
          </section>
        </Card>

        {/* Footer Navigation CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-8 bg-muted/40 rounded-3xl border border-border/50">
          <div>
            <h3 className="font-black uppercase tracking-tight text-base">Have additional questions?</h3>
            <p className="text-xs text-muted-foreground font-medium">Our customer support team is available to assist you.</p>
          </div>
          <Link href="/support">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs px-6 h-12 rounded-xl">
              <span>Contact Support</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
