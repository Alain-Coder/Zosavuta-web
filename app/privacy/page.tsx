'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, ShieldCheck, Lock, Eye, Mail, FileText } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <section className="relative bg-secondary py-16 text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
            Privacy <span className="text-primary italic">Policy</span>
          </h1>
          <p className="text-sm text-white/70 font-medium max-w-2xl leading-relaxed">
            Effective Date: October 7, 2026. At Zosavuta, we are committed to safeguarding your personal information and ensuring full transparency about how your data is collected, used, and protected.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-10">
        <Card className="p-8 border border-border/60 shadow-xl rounded-3xl space-y-8">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
              Information We Collect
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Zosavuta collects personal information necessary to provide our digital e-ticketing services, process transactions, and deliver secure event entry tokens. We collect:
            </p>
            <ul className="space-y-2.5 pt-2 text-xs font-semibold text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Account & Contact Information:</strong> Full name, email address, phone number, and account role (Customer or Organizer).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Payment Information:</strong> Bank account, mobile money details (Airtel Money, TNM Mpamba) and card payment references. Payments are processed via encrypted, PCI-compliant payment gateways. Zosavuta does not store full credit card numbers or secret PINs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Ticket & Attendance Data:</strong> Order records, digital QR ticket identifiers, ticket verification timestamps, and venue admission logs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Device & Technical Data:</strong> IP addresses, browser specifications, and usage logs required for security monitoring and session management.</span>
              </li>
            </ul>
          </section>

          <hr className="border-border/40" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
              How We Use Your Information
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Your information is strictly utilized to operate, secure, and enhance the Zosavuta ticketing platform:
            </p>
            <ul className="space-y-2.5 pt-2 text-xs font-semibold text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Issuing digital tickets with encrypted QR codes and sending order receipts via email.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Facilitating ticket verification and gate check-in at event venues.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Allowing event organizers to manage attendee lists, track sales performance, and process payout settlements.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Preventing fraudulent activity, counterfeit tickets, and unauthorized duplicate scans.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Sending important event updates, schedule changes, or platform support notices.</span>
              </li>
            </ul>
          </section>

          <hr className="border-border/40" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
              Information Sharing & Disclosure
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              We respect your privacy and never sell your personal data to third parties. Data is shared only under strict conditions:
            </p>
            <ul className="space-y-2.5 pt-2 text-xs font-semibold text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">With Event Organizers:</strong> Organizers receive guest details (name, email, ticket tier) strictly necessary for gate verification, capacity control, and event management.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">With Payment Service Providers:</strong> Financial details are shared with regulated telecom operators (Airtel Malawi, TNM) and financial institution gateways solely to process your transaction securely.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Legal Obligations:</strong> We may disclose information if required by law enforcement or Malawian statutory authorities to enforce legal compliance or protect public safety.</span>
              </li>
            </ul>
          </section>

          <hr className="border-border/40" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
              Data Security & Storage
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              We employ robust administrative, technical, and physical safeguards to protect your personal information against unauthorized access, loss, or alteration. All web communications utilize TLS/SSL encryption, and digital tickets use cryptographically signed tokens.
            </p>
          </section>

          <hr className="border-border/40" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">5</span>
              Your Rights & Choices
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              You have the right to access, update, or request the deletion of your personal account details at any time. You can also unsubscribe from promotional newsletter communications using the link provided in our emails or by contacting customer support.
            </p>
          </section>

          <hr className="border-border/40" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">6</span>
              Contact Us About Privacy
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us at{' '}
              <a href="mailto:support@zosavuta.com" className="text-primary font-bold underline">
                support@zosavuta.com
              </a>.
            </p>
          </section>
        </Card>

        {/* Footer Navigation CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-8 bg-muted/40 rounded-3xl border border-border/50">
          <div>
            <h3 className="font-black uppercase tracking-tight text-base">Questions about your data?</h3>
            <p className="text-xs text-muted-foreground font-medium">Our customer support team is available to assist you with any privacy inquiry.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/terms">
              <Button variant="outline" className="font-bold uppercase tracking-wider text-xs px-5 h-12 rounded-xl">
                Terms of Service
              </Button>
            </Link>
            <Link href="/support">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs px-6 h-12 rounded-xl">
                <span>Contact Support</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
