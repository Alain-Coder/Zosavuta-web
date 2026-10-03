'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, Phone, CheckCircle2, AlertCircle, Sparkles, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', message: data.message || 'Thank you! Your message has been saved and sent to our support team.' });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to submit inquiry. Please try again.' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Network error occurred. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <section className="relative bg-foreground py-20 overflow-hidden text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-background to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">
            Contact <span className="text-primary italic">Support</span>
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto font-medium">
            Have a question about event tickets or selling tickets on Zosavuta? Our support team is ready to help.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        {/* Contact Method Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-8 text-center bg-card border border-border/60 hover:border-primary/40 transition-all shadow-xl group">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 text-primary rounded-2xl mb-5 group-hover:scale-110 transition-transform">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="font-black uppercase tracking-tight text-lg mb-2">Email Support</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
              Send us an email anytime and our team will get back to you within 24 hours.
            </p>
            <a href="mailto:support@zosavuta.com" className="text-primary font-bold text-sm hover:underline italic">
              support@zosavuta.com
            </a>
          </Card>

          <Card className="p-8 text-center bg-card border border-border/60 hover:border-primary/40 transition-all shadow-xl group">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 text-primary rounded-2xl mb-5 group-hover:scale-110 transition-transform">
              <Phone className="w-7 h-7" />
            </div>
            <h3 className="font-black uppercase tracking-tight text-lg mb-2">Phone & Call Support</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
              Call our support center Monday to Friday, 8:00 AM – 5:00 PM CAT.
            </p>
            <a href="tel:+265899730195" className="text-primary font-bold text-sm hover:underline italic">
              +265 (0) 899 730 195
            </a>
          </Card>

          <Card className="p-8 text-center bg-card border border-border/60 hover:border-primary/40 transition-all shadow-xl group">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-2xl mb-5 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-black uppercase tracking-tight text-lg mb-2">WhatsApp Support</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
              Instant assistance for urgent ticket verification or venue inquiries.
            </p>
            <a
              href="https://wa.me/265886630486"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-bold text-sm hover:underline italic flex items-center justify-center gap-1"
            >
              <span>Chat on WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </Card>
        </div>

        {/* Contact Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <Card className="lg:col-span-7 p-8 md:p-10 border border-border/60 shadow-2xl rounded-3xl">
            <div className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Direct Inquiry</p>
              <h2 className="text-3xl font-black tracking-tight uppercase">Send Support <span className="text-primary">Message</span></h2>
              <p className="text-xs text-muted-foreground font-medium mt-1">Your message will be logged securely in our support database.</p>
            </div>

            {status && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 mb-6 ${status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
                  }`}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-xs font-semibold leading-relaxed">{status.message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">Your Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Kondwani Phiri"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider">Subject / Concern</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Ticket Confirmation Question"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider">Detailed Message</Label>
                <Textarea
                  id="message"
                  placeholder="Explain your inquiry or issue so we can help you fast..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-36 rounded-xl resize-none"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs h-14 rounded-xl shadow-lg shadow-primary/20"
              >
                {loading ? 'Submitting to Database...' : 'Submit Support Message'}
              </Button>
            </form>
          </Card>

          {/* Quick FAQ Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="font-black uppercase tracking-tight text-xl">Quick FAQ</h3>
            </div>

            <div className="space-y-4">
              {FAQ_ITEMS.map((item, idx) => (
                <Card key={idx} className="p-5 border border-border/50 bg-card rounded-2xl">
                  <h4 className="font-bold text-sm text-foreground mb-2 flex items-start gap-2">
                    <span className="text-primary font-black">Q:</span>
                    <span>{item.question}</span>
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5 font-medium">
                    {item.answer}
                  </p>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
              <div>
                <h4 className="font-black uppercase text-xs tracking-wider mb-1">Official Protection</h4>
                <p className="text-[11px] text-muted-foreground font-medium">
                  All Zosavuta event tickets are verified cryptographically. Need terms details? Check our{' '}
                  <Link href="/terms" className="text-primary font-bold underline">Terms of Service</Link>.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: 'How do I access my tickets after buying?',
    answer: 'Tickets bought on Zosavuta are issued immediately to your email and accessible inside your user account.',
  },
  {
    question: 'Are ticket sales refundable?',
    answer: 'Ticket sales are final. If you can no longer attend an event, you can list your ticket on our official fan-to-fan Marketplace.',
  },
  // {
  //   question: 'How does bus transport ticketing work?',
  //   answer: 'If your event or bus route offers bus transport, your ticket QR includes seat reservation and boarding instructions.',
  // },
  {
    question: 'What payment options are supported?',
    answer: 'We support local mobile money (Airtel Money, Mpamba) as well as Visa and Mastercard via PayChangu.',
  },
];
