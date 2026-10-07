import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
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
  RefreshCw,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Zosavuta E-Ticketing Malawi',
  description:
    "Learn about Zosavuta — Malawi's e-ticketing platform making it easier to discover events, buy secure tickets, manage ticket sales, and enjoy a smoother event experience. Developed by SenLain Systems Limited in partnership with MarketWeb Digital Marketing.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero Section ── */}
      <section className="relative bg-foreground py-20 md:py-28 overflow-hidden text-white">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-background to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest mb-6">
            <span>Ticket Yako, M&apos;manja Mwako</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 leading-none">
            About <span className="text-primary italic">Zosavuta</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto font-medium leading-relaxed">
            Making events simpler for Malawi — connecting event organizers
            with the public and making tickets easier to discover, buy,
            manage, and verify.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href="/events">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-13 rounded-2xl text-sm uppercase tracking-wider gap-2 cursor-pointer"
              >
                <Ticket className="w-5 h-5" />
                Explore Events
              </Button>
            </Link>

            <Link href="/organizer">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold px-8 h-13 rounded-2xl text-sm uppercase tracking-wider gap-2 cursor-pointer"
              >
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
          {/* Checkout */}
          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Zap className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Checkout Speed
              </p>
              <p className="text-sm font-bold text-foreground">
                30-Second Booking
              </p>
            </div>
          </div>

          {/* Gate Security */}
          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Gate Security
              </p>
              <p className="text-sm font-bold text-foreground">
                One Ticket, One Scan
              </p>
            </div>
          </div>

          {/* Payouts */}
          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Organizer Payouts
              </p>
              <p className="text-sm font-bold text-foreground">
                Within 24 Hours
              </p>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Revenue Management
              </p>
              <p className="text-sm font-bold text-foreground">
                Revenue Visibility
              </p>
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
              Making Events Simpler for Malawi
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed">
              Zosavuta is Malawi&apos;s e-ticketing platform. We are building
              the end-to-end digital backbone that connects event organizers
              to the public and makes it easier to buy and sell tickets for
              concerts, conferences, festivals, workshops, and more.
            </p>

            <p className="text-base text-muted-foreground leading-relaxed">
              Zosavuta is proudly developed by{' '}
              <strong className="text-foreground">
                SenLain Systems Limited
              </strong>{' '}
              in partnership with{' '}
              <strong className="text-foreground">
                MarketWeb Digital Marketing
              </strong>
              , two Malawian companies based in Lilongwe. Together, we are
              passionate about solving real, everyday Malawian problems through
              simple, dependable technology.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* SenLain */}
              <div className="p-4 rounded-2xl border border-border/60 bg-card flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />

                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    SenLain Systems Limited
                  </h4>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lilongwe, Malawi • Technology & Software Development
                  </p>
                </div>
              </div>

              {/* MarketWeb */}
              <div className="p-4 rounded-2xl border border-border/60 bg-card flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />

                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    MarketWeb Digital Marketing
                  </h4>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lilongwe, Malawi • Digital Marketing & Growth
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Built in Malawi */}
          <div className="lg:col-span-5">
            <Card className="p-8 border border-border/70 shadow-xl rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 space-y-6">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 mx-auto">
                <Image
                  src="/zosavuta.png"
                  alt="Zosavuta"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  Built in Malawi, For Malawi
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Designed around local realities, with familiar payment
                  options, local settlement, secure ticket verification, and
                  event tools built for the way Malawian organizers and
                  attendees actually operate.
                </p>
              </div>

              <div className="space-y-3 border-t border-border/50 pt-5 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Airtel Money, TNM Mpamba & Bank Cards
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Encrypted single-use QR verification codes
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Full reconciliation & automated audit trails
                  </span>
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
            For years in Malawi, a sold-out show too often meant an empty bank
            account for organizers and artists. Event planners have been
            battling counterfeit tickets with duplicate or fake QR codes.
            Organizers have also had to rely on paper tickets that are easy to
            duplicate, manipulate, and sell outside proper channels.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Problem 1 */}
            <div className="bg-card/80 p-5 rounded-2xl border border-destructive/20 space-y-2">
              <span className="text-2xl font-black text-destructive">
                01
              </span>

              <h3 className="font-bold text-foreground text-sm">
                Counterfeit Tickets
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Fake and duplicate tickets can be produced and distributed
                outside official channels, putting legitimate organizers and
                attendees at risk.
              </p>
            </div>

            {/* Problem 2 */}
            <div className="bg-card/80 p-5 rounded-2xl border border-destructive/20 space-y-2">
              <span className="text-2xl font-black text-destructive">
                02
              </span>

              <h3 className="font-bold text-foreground text-sm">
                Gate Chaos & Queues
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Slow manual checks, cash handling bottlenecks, and disputes
                over duplicated tickets can frustrate fans at the entrance.
              </p>
            </div>

            {/* Problem 3 */}
            <div className="bg-card/80 p-5 rounded-2xl border border-destructive/20 space-y-2">
              <span className="text-2xl font-black text-destructive">
                03
              </span>

              <h3 className="font-bold text-foreground text-sm">
                Revenue Leakage
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Limited visibility over sales, unverified transactions, and
                inefficient processes can make it harder for organizers to
                accurately track their event revenue.
              </p>
            </div>
          </div>

          <p className="text-sm font-bold text-foreground pt-2">
            Zosavuta is built to help solve these problems by bringing
            discovery, secure ticketing, payment, verification, and event
            management together in one platform.
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
              Zosavuta is a B2B2C full-stack marketplace that connects
              organizers to a secure online ticketing platform, helping people
              discover, buy, manage, and verify tickets with less hassle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* ── For the Public ── */}
            <Card className="p-8 border border-border/70 shadow-lg rounded-3xl bg-card space-y-6 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-foreground">
                  For the Public
                </h3>

                <p className="text-xs font-bold text-primary uppercase tracking-wider mt-1">
                  Fans, Attendees & Festival-Goers
                </p>
              </div>

              <ul className="space-y-4 text-sm text-muted-foreground">

                {/* Discover */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Discover in one place:
                    </strong>{' '}
                    Find events across Malawi — concerts, football matches,
                    conferences, festivals, theatre, and more.
                  </span>
                </li>

                {/* Checkout */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Fast Checkout:
                    </strong>{' '}
                    Buy your ticket using Airtel Money, TNM Mpamba, or Bank
                    Card without the usual printing, cash, and queue hassles.
                  </span>
                </li>

                {/* Delivery */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Digital Ticket Delivery:
                    </strong>{' '}
                    Receive your ticket digitally through Email and your
                    customer portal with a secure QR code.
                  </span>
                </li>

                {/* Verification */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      One Ticket, One Scan:
                    </strong>{' '}
                    Tickets are verified at the gate, helping prevent
                    duplicate entry and unauthorized use.
                  </span>
                </li>

                {/* Resale Marketplace */}
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Ticket Resale Marketplace:
                    </strong>{' '}
                    Plans changed? Browse available resale tickets or securely
                    resell your ticket to another attendee when you can no
                    longer make it.
                  </span>
                </li>
              </ul>

              <div className="pt-2">
                <Link href="/events">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold"
                  >
                    Browse Events
                  </Button>
                </Link>
              </div>
            </Card>

            {/* ── For Organizers ── */}
            <Card className="p-8 border border-border/70 shadow-lg rounded-3xl bg-card space-y-6 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary-foreground flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-foreground">
                  For Organizers
                </h3>

                <p className="text-xs font-bold text-primary uppercase tracking-wider mt-1">
                  Promoters, Creators & Event Planners
                </p>
              </div>

              <ul className="space-y-4 text-sm text-muted-foreground">

                {/* Create Event */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Create Your Event:
                    </strong>{' '}
                    Set your event details, ticket tiers such as Standard,
                    VIP, and VVIP, pricing, capacity, and early-bird offers.
                  </span>
                </li>

                {/* Dashboard */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Real-Time Sales Dashboard:
                    </strong>{' '}
                    Track ticket sales, revenue, ticket volumes, and event
                    performance from one place.
                  </span>
                </li>

                {/* Scanner */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      Ticket Verification:
                    </strong>{' '}
                    Use the scanner to verify tickets at the gate and help
                    prevent duplicate entry attempts.
                  </span>
                </li>

                {/* Payouts */}
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

                  <span>
                    <strong className="text-foreground">
                      24-Hour Payouts:
                    </strong>{' '}
                    Receive organizer payouts within 24 hours after the event,
                    subject to the applicable settlement and verification
                    process.
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

            {/* Empower Fans */}
            <Card className="p-6 border border-border/80 bg-card rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>

              <h3 className="text-lg font-black text-foreground">
                Empower Fans
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Provide a seamless, safe, and enjoyable experience for every
                attendee, from discovering an event to getting through the
                gate.
              </p>
            </Card>

            {/* Drive Event Growth */}
            <Card className="p-6 border border-border/80 bg-card rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>

              <h3 className="text-lg font-black text-foreground">
                Drive Event Growth
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect Malawian event organizers to the digital economy,
                helping them manage ticket sales, track revenue, and build
                better events.
              </p>
            </Card>

            {/* Drive Innovation */}
            <Card className="p-6 border border-border/80 bg-card rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>

              <h3 className="text-lg font-black text-foreground">
                Drive Innovation
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Leverage modern technology to formalize and modernize
                Malawi&apos;s event ecosystem and contribute meaningfully to
                the Malawi Digital Transformation Agenda.
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
              What Guides Everything We Build
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Customer Focus */}
            <Card className="p-8 border border-border/70 rounded-3xl bg-card space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-foreground">
                Customer Focus
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                The fan and the organizer are at the center of all we do. We
                focus on creating useful experiences and delivering value at
                every touchpoint.
              </p>
            </Card>

            {/* Security First */}
            <Card className="p-8 border border-border/70 rounded-3xl bg-card space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-foreground">
                Security First
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                One ticket, one scan. Our platform provides a layer of control
                that paper tickets cannot, with tickets generated through the
                platform and verified against the system.
              </p>
            </Card>

            {/* Transparency */}
            <Card className="p-8 border border-border/70 rounded-3xl bg-card space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-foreground">
                Transparency
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                We believe customers and organizers should understand what
                they are paying for. Our goal is to keep our processes and
                fees clear, straightforward, and easy to understand.
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
              &ldquo;If it&apos;s not zosavuta, you haven&apos;t built it
              right.&rdquo;
            </blockquote>

            <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium pt-2">
              At Zosavuta, we find purpose in solving the fraud, the queues,
              and the stress that can surround event ticketing. We are not
              just selling tickets. We are helping build a more trusted and
              convenient event experience in Malawi, one secure scan at a
              time.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link href="/events">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-12 rounded-xl text-xs uppercase tracking-wider"
              >
                Browse Events Now
              </Button>
            </Link>

            <Link href="/support">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold px-8 h-12 rounded-xl text-xs uppercase tracking-wider"
              >
                Talk to Our Team
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}