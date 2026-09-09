import PhysicalVerification from './physical-verification';
import DigitalVerification from './digital-verification';
import { query } from '@/lib/db';

export default async function VerifyTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const physicalInfo = await query<any>(
    `SELECT p.eventId, p.ticketNumber, p.status, p.ticketType, e.title AS eventTitle, e.date AS eventDate, e.time AS eventTime, e.venue AS eventVenue
     FROM physical_tickets p JOIN events e ON e.id = p.eventId WHERE p.secureToken = ? LIMIT 1`,
    [token]
  );
  if (physicalInfo[0]) {
    const physicalTicket = physicalInfo[0];
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center bg-background px-4 py-12">
        <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">Physical ticket</p>
          <h1 className="mt-3 text-3xl font-black">Organizer verification</h1>
          <div className="mt-6 space-y-2 text-left text-sm"><p><strong>Event:</strong> {physicalTicket.eventTitle}</p><p><strong>Ticket:</strong> <span className="font-mono">{physicalTicket.ticketNumber}</span></p><p><strong>Type:</strong> {physicalTicket.ticketType}</p></div>
          <PhysicalVerification token={token} eventId={Number(physicalTicket.eventId)} ticket={physicalTicket} />
        </section>
      </main>
    );
  }
  const digitalInfo = await query<any>(
    `SELECT t.ticketNumber, t.status, o.tier AS ticketType, o.eventTitle, o.eventDate, o.eventTime, o.eventVenue
     FROM order_tickets t JOIN orders o ON o.id = t.orderId WHERE t.verificationToken = ? LIMIT 1`,
    [token]
  );
  if (digitalInfo[0]) {
    const digitalTicket = digitalInfo[0];
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center bg-background px-4 py-12">
        <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">Digital ticket</p>
          <h1 className="mt-3 text-3xl font-black">Organizer verification</h1>
          <div className="mt-6 space-y-2 text-left text-sm"><p><strong>Event:</strong> {digitalTicket.eventTitle}</p><p><strong>Ticket:</strong> <span className="font-mono">{digitalTicket.ticketNumber}</span></p><p><strong>Type:</strong> {digitalTicket.ticketType}</p></div>
          <DigitalVerification token={token} ticket={digitalTicket} />
        </section>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center bg-background px-4 py-12">
      <section className="w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Ticket unavailable</p>
        <h1 className="mt-3 text-3xl font-black">Verification failed</h1>
        <p className="mt-5 font-bold text-red-700">This ticket link is invalid or does not exist.</p>
      </section>
    </main>
  );
}