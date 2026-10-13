import QRCode from 'qrcode';
import pool, { query } from '@/lib/db';
import { sendEmail } from '@/lib/email';

type TicketEmailRow = {
  orderId: string;
  firstName: string | null;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  tier: string;
  email: string;
  ticketNumber: string;
  verificationToken: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] as string);
}

export async function sendOrderTicketsEmail(orderId: string): Promise<void> {
  const rows = await query<TicketEmailRow>(
    `SELECT o.id AS orderId, o.firstName, o.eventTitle, o.eventDate, o.eventTime,
       o.eventVenue, o.tier, u.email, t.ticketNumber, t.verificationToken
     FROM orders o
     JOIN users u ON u.uid = o.userId
     JOIN order_tickets t ON t.orderId = o.id
     WHERE o.id = ? AND o.status = 'confirmed' AND o.paymentStatus = 'PAID'
     ORDER BY t.id`,
    [orderId]
  );
  if (!rows.length) throw new Error(`No confirmed paid tickets found for order ${orderId}.`);

  const first = rows[0];
  const delivery = await query<{ status: string }>(
    'SELECT status FROM ticket_email_deliveries WHERE orderId = ? LIMIT 1',
    [orderId]
  );
  if (delivery[0]?.status === 'SENT') return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT IGNORE INTO ticket_email_deliveries (orderId, status, attempts)
       VALUES (?, 'PENDING', 0)`,
      [orderId]
    );
    const [claimResult] = await conn.execute(
      `UPDATE ticket_email_deliveries
       SET status = 'SENDING', attempts = attempts + 1, lastError = NULL
       WHERE orderId = ? AND (status IN ('PENDING', 'FAILED') OR
         (status = 'SENDING' AND updatedAt < NOW() - INTERVAL 10 MINUTE))`,
      [orderId]
    );
    if (Number((claimResult as { affectedRows: number }).affectedRows) !== 1) {
      await conn.commit();
      return;
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
    if (!baseUrl) throw new Error('NEXT_PUBLIC_APP_URL is required to create ticket links.');
    const attachments: NonNullable<import('nodemailer').SendMailOptions['attachments']> = [];
    const ticketContent = await Promise.all(rows.map(async (ticket, index) => {
      const verificationUrl = `${baseUrl}/tickets/verify/${encodeURIComponent(ticket.verificationToken)}`;
      const cid = `ticket-${index + 1}@zosavuta`;
      attachments.push({
        filename: `${ticket.ticketNumber}.png`,
        content: await QRCode.toBuffer(verificationUrl, { type: 'png', width: 320, margin: 2 }),
        contentType: 'image/png',
        cid,
      });
      return { ticketNumber: ticket.ticketNumber, verificationUrl, cid };
    }));
    const ticketsHtml = ticketContent.map((ticket) => `
      <section style="border:1px solid #ddd;border-radius:12px;padding:16px;margin:16px 0">
        <h2 style="margin-top:0">Ticket ${escapeHtml(ticket.ticketNumber)}</h2>
        <p>Type: ${escapeHtml(first.tier || 'Standard')}</p>
        <p><a href="${escapeHtml(ticket.verificationUrl)}">Open digital ticket</a></p>
        <img src="cid:${ticket.cid}" alt="QR code for ${escapeHtml(ticket.ticketNumber)}" width="240" height="240" />
      </section>`).join('');
    const eventDate = new Date(first.eventDate).toLocaleDateString('en-MW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    await sendEmail({
      to: first.email,
      subject: `Your ticke(s) for ${first.eventTitle}`,
      text: `Hello ${first.firstName || 'there'},\n\nYour payment is confirmed. Your digital ticket(s) for ${first.eventTitle} is ready.\nEvent: ${eventDate} at ${first.eventTime}\nVenue: ${first.eventVenue}\n\n${ticketContent.map((ticket) => `${ticket.ticketNumber}: ${ticket.verificationUrl}`).join('\n')}\n\nKeep your QR code ready at the entrance.`,
      html: `<p>Hello ${escapeHtml(first.firstName || 'there')},</p><p>Your payment is confirmed. Here is your digital ticket(s):</p><p><strong>${escapeHtml(first.eventTitle)}</strong><br />${escapeHtml(eventDate)} at ${escapeHtml(first.eventTime)}<br />${escapeHtml(first.eventVenue)}</p>${ticketsHtml}<p>Keep your QR code ready at the entrance.</p>`,
      attachments,
    });
    await pool.execute(
      `UPDATE ticket_email_deliveries SET status = 'SENT', sentAt = NOW(), lastError = NULL WHERE orderId = ?`,
      [orderId]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'SMTP delivery failed';
    await pool.execute(
      `UPDATE ticket_email_deliveries SET status = 'FAILED', lastError = ? WHERE orderId = ?`,
      [message, orderId]
    );
    throw error;
  }
}
