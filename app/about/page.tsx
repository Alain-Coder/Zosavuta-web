import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  QrCode,
  Zap,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight,
  HeartHandshake,
  Smartphone,
  Building2,
  Lock,
  Eye,
  Ticket,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Zosavuta E-Ticketing Malawi',
  description:
    "Learn about Zosavuta — Malawi's premier digital e-ticketing platform developed by MarketWeb Digital Marketing and SenLain Systems Limited. Ticket Yako, M'manja Mwako.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero Section ── */}
      <section className="relative bg-foreground py-20 md:py-28 overflow-hidden text-white">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-background to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Ticket Yako, M’manja Mwako</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
            About <span className="text-primary italic">Zosavuta</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto font-medium leading-relaxed">
            Malawi’s end-to-end digital e-ticketing backbone. Connecting event organizers to the public,
            eliminating ticket counterfeit syndicates, and restoring trust to Malawi’s creative economy.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href="/events">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-13 rounded-2xl text-sm uppercase tracking-wider gap-2">
                <Ticket className="w-5 h-5" />
                Explore Events
              </Button>
            </Link>
            <Link href="/organizer">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold px-8 h-13 rounded-2xl text-sm uppercase tracking-wider gap-2">
                Sell Tickets
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Key Highlights Pill Banner ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Checkout Speed</p>
              <p className="text-sm font-bold text-foreground">30-Second Booking</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Gate Security</p>
              <p className="text-sm font-bold text-foreground">One Ticket, One Scan</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Organizer Payouts</p>
              <p className="text-sm font-bold text-foreground">Within 24 Hours</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Revenue Protection</p>
              <p className="text-sm font-bold text-foreground">Zero Revenue Leakage</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-16">
        {/* ── Section: What We Are ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
              What We Are
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Malawi’s Premier E-Ticketing Platform
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Zosavuta is Malawi&apos;s e-ticketing platform. We are building the end-to-end digital backbone that connects event organizers to the public, and eliminates the chaos that has defined events in Malawi from the start. We make it easy to buy and sell tickets for any event: concerts, conferences, festivals, football, workshops, and more.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Zosavuta is proudly developed by <strong className="text-foreground">MarketWeb Digital Marketing</strong> and <strong className="text-foreground">SenLain Systems Limited</strong>, Malawian technology companies based in Lilongwe. We are passionate about solving real, everyday Malawian problems through simple, dependable technology.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl border border-border/60 bg-card flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">MarketWeb Digital Marketing</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Lilongwe, Malawi • Digital Strategy & Growth</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-border/60 bg-card flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">SenLain Systems Limited</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Lilongwe, Malawi • Enterprise Software Systems</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="p-8 border border-border/70 shadow-xl rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 space-y-6">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 mx-auto">
                <Image src="/zosavuta.png" alt="Zosavuta" fill className="object-cover" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground">Built in Malawi, For Malawi</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tailored to local realities: local mobile money (Airtel Money, TNM Mpamba), local bank settlement, offline-capable gate scanners, and prompt 24-hour payouts in Malawi Kwacha.
                </p>
              </div>
              <div className="space-y-3 border-t border-border/50 pt-5 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Airtel Money, TNM Mpamba & Bank Cards</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Encrypted single-use QR verification codes</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full reconciliation & automated audit trails</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ── Section: The Problem We Saw ── */}
        <section className="bg-destructive/5 border border-destructive/20 rounded-3xl p-8 sm:p-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-black uppercase tracking-widest">
            The Problem We Saw
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            A Sold-Out Show Should Never Mean an Empty Bank Account
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-4xl">
            For years in Malawi, a sold-out show too often meant an empty bank account for organizers and artists. Event planners have been battling syndicates producing counterfeit tickets with duplicate or fake QR codes. Organizers have had to rely on paper tickets that are easy to duplicate, easy to manipulate, and easy to sell outside proper channels.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-card/80 p-5 rounded-2xl border border-destructive/20 space-y-2">
              <span className="text-2xl font-black text-destructive">01</span>
              <h3 className="font-bold text-foreground text-sm">Counterfeit Syndicates</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Fraudulent duplicate tickets printed and distributed outside official channels, stealing proceeds from legitimate promoters.
              </p>
            </div>
            <div className="bg-card/80 p-5 rounded-2xl border border-destructive/20 space-y-2">
              <span className="text-2xl font-black text-destructive">02</span>
              <h3 className="font-bold text-foreground text-sm">Gate Chaos & Queues</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Slow manual checks, cash handling bottlenecks, and disputes over duplicated tickets frustrating fans at the entrance.
              </p>
            </div>
            <div className="bg-card/80 p-5 rounded-2xl border border-destructive/20 space-y-2">
              <span className="text-2xl font-black text-destructive">03</span>
              <h3 className="font-bold text-foreground text-sm">Revenue Leakage</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero real-time accounting, unverified sales, and delayed promoter earnings that stunt Malawi&apos;s creative and sports economy.
              </p>
            </div>
          </div>
          <p className="text-sm font-bold text-foreground pt-2">
            Zosavuta is here to permanently eliminate this problem.
          </p>
        </section>

        {/* ── Section: What We Built ── */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
              What We Built
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              A Complete B2B2C Event Marketplace
            </h2>
            <p className="text-base text-muted-foreground">
              Zosavuta is a B2B2C full-stack marketplace that streamlines event operations by connecting organizers to a secure online booking platform, enabling users to seamlessly discover and book tickets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For the Public */}
            <Card className="p-8 border border-border/70 shadow-lg rounded-3xl bg-card space-y-6 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground">For the Public</h3>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mt-1">Fans, Attendees & Festival-Goers</p>
              </div>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Discover in one place:</strong> Find any event across Malawi — concerts, football matches, tech conferences, festivals, and theater.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">30-Second Checkout:</strong> Pay instantly using Airtel Money, TNM Mpamba, or Bank Card. No printing, no cash, no queue.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Instant Digital Delivery:</strong> Your ticket arrives instantly via Email and inside your customer portal with an encrypted QR code.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">One Ticket, One Scan:</strong> Cryptographically signed tokens that can only ever be scanned once at the gate.
                  </span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/events">
                  <Button variant="outline" className="w-full rounded-xl font-bold">
                    Browse Events
                  </Button>
                </Link>
              </div>
            </Card>

            {/* For Organizers */}
            <Card className="p-8 border border-border/70 shadow-lg rounded-3xl bg-card space-y-6 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary-foreground flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground">For Organizers</h3>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mt-1">Promoters, Creators & Event Planners</p>
              </div>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Create in &lt; 5 Minutes:</strong> Set custom ticket tiers (Standard, VIP, VVIP) and capacity controls with administrative approval.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Real-Time Sales Dashboard:</strong> Track live revenue, ticket volume, buyer demographics, and performance analytics anytime.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Free Scanner App:</strong> Gate attendants verify tickets in under a second and block duplicate entry attempts automatically.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">24-Hour Payouts:</strong> Transparent settlement straight into your bank or mobile money within 24 hours of event completion.
                  </span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/organizer">
                  <Button className="w-full rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                    Create an Event
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* ── Section: Our Mission ── */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-3xl p-8 sm:p-12 border border-border space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-black uppercase tracking-widest">
              Our Mission
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              To Simplify Access Through Technology
            </h2>
            <p className="text-lg font-semibold text-primary">
              To make every ticket secure, traceable, and zosavuta to buy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-border/80 bg-card rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-foreground">Empower Fans</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Provide a seamless, safe, and enjoyable experience for every attendee without fear of fake tickets or gate rejection.
              </p>
            </Card>

            <Card className="p-6 border border-border/80 bg-card rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-foreground">Drive Event Growth</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect Malawian event organizers to the digital economy, helping them track revenue accurately, eliminate fraud, and grow the creative industry.
              </p>
            </Card>

            <Card className="p-6 border border-border/80 bg-card rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-foreground">Drive Innovation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Leverage modern technology to formalize Malawi&apos;s event ecosystem and contribute meaningfully to the Malawi Digital Transformation Agenda.
              </p>
            </Card>
          </div>
        </section>

        {/* ── Section: Our Core Values ── */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
              Our Core Values
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              What Guides Every Line of Code We Write
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 border border-border/70 rounded-3xl bg-card space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-foreground">Customer Focus</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The fan and the organizer are at the center of all we do. We deliver tangible value and peace of mind at every single touchpoint.
              </p>
            </Card>

            <Card className="p-8 border border-border/70 rounded-3xl bg-card space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-foreground">Security First</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                One ticket, one scan. Our system provides the cryptographic layer of control that paper tickets never could. Every ticket is generated on our platform and verified against the database.
              </p>
            </Card>

            <Card className="p-8 border border-border/70 rounded-3xl bg-card space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-foreground">Transparency</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We are completely transparent about all we do, including our fees. No hidden charges. What you see is what you get.
              </p>
            </Card>
          </div>
        </section>

        {/* ── Quote & Closing Mantra Banner ── */}
        <section className="relative overflow-hidden rounded-3xl bg-foreground text-white p-8 sm:p-14 text-center space-y-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-primary font-black uppercase tracking-widest text-xs">
              The Zosavuta Standard
            </p>
            <blockquote className="text-2xl sm:text-4xl font-black tracking-tight leading-snug italic">
              &ldquo;If it&apos;s not zosavuta, you haven&apos;t built it right.&rdquo;
            </blockquote>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium pt-2">
              At Zosavuta, we find purpose in solving the fraud, the queues, and the stress. We are not just selling tickets. We are restoring trust to Malawi&apos;s event industry, one secure scan at a time.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link href="/events">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-12 rounded-xl text-xs uppercase tracking-wider">
                Browse Events Now
              </Button>
            </Link>
            <Link href="/support">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold px-8 h-12 rounded-xl text-xs uppercase tracking-wider">
                Talk to Our Team
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
