import QRCode from 'qrcode';
import path from 'path';
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
    const attachments: NonNullable<import('nodemailer').SendMailOptions['attachments']> = [{
      filename: 'zosavuta.png',
      path: path.join(process.cwd(), 'public', 'zosavuta.png'),
      contentType: 'image/png',
      cid: 'zosavuta-logo',
    }];
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
      <tr><td style="padding:20px;border:1px solid #dfe5e9;border-radius:6px;">
        <h2 style="margin:0 0 12px;font-size:18px;line-height:24px;color:#202936;">Ticket ${escapeHtml(ticket.ticketNumber)}</h2>
        <p style="margin:0 0 8px;font-size:14px;line-height:21px;color:#46515d;">Type: ${escapeHtml(first.tier || 'Standard')}</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:21px;"><a href="${escapeHtml(ticket.verificationUrl)}" style="color:#18794e;font-weight:bold;">Open digital ticket</a></p>
        <img src="cid:${ticket.cid}" alt="QR code for ${escapeHtml(ticket.ticketNumber)}" width="220" height="220" style="display:block;width:220px;height:220px;border:0;">
      </td></tr>
      <tr><td height="16" style="height:16px;font-size:1px;line-height:1px;">&nbsp;</td></tr>`).join('');
    const eventDate = new Date(first.eventDate).toLocaleDateString('en-MW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    await sendEmail({
      to: first.email,
      subject: `Your ticket(s) for ${first.eventTitle}`,
      text: `Hello ${first.firstName || 'there'},\n\nYour payment is confirmed. Your digital ticket(s) for ${first.eventTitle} is ready.\nEvent: ${eventDate} at ${first.eventTime}\nVenue: ${first.eventVenue}\n\n${ticketContent.map((ticket) => `${ticket.ticketNumber}: ${ticket.verificationUrl}`).join('\n')}\n\nKeep your QR code ready at the entrance.`,
      html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Your Zosavuta tickets</title></head>
  <body style="margin:0;padding:0;background-color:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#202936;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your payment is confirmed. Your ${rows.length} digital ticket${rows.length === 1 ? '' : 's'} are ready.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f7;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e7ec;border-radius:8px;">
          <tr><td align="center" style="padding:28px 32px 20px;border-bottom:1px solid #edf0f2;">
            <img src="cid:zosavuta-logo" width="56" height="56" alt="Zosavuta" style="display:block;width:56px;height:56px;border:0;margin:0 auto 8px;">
            <p style="margin:0;font-size:20px;line-height:28px;font-weight:bold;color:#18794e;">Zosavuta</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#202936;">Your tickets are ready</h1>
            <p style="margin:0 0 18px;font-size:16px;line-height:25px;">Hello ${escapeHtml(first.firstName || 'there')}, your payment is confirmed.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#f8faf9;border:1px solid #e4ebe7;">
              <tr><td style="padding:16px 18px;">
                <p style="margin:0 0 8px;font-size:17px;line-height:24px;font-weight:bold;color:#202936;">${escapeHtml(first.eventTitle)}</p>
                <p style="margin:0 0 4px;font-size:14px;line-height:21px;color:#46515d;">${escapeHtml(eventDate)} at ${escapeHtml(first.eventTime)}</p>
                <p style="margin:0;font-size:14px;line-height:21px;color:#46515d;">${escapeHtml(first.eventVenue)}</p>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${ticketsHtml}</table>
            <p style="margin:8px 0 0;font-size:14px;line-height:22px;color:#46515d;">Keep your QR code ready at the entrance.</p>
          </td></tr>
          <tr><td style="padding:18px 32px;background-color:#f8faf9;border-top:1px solid #edf0f2;text-align:center;font-size:12px;line-height:18px;color:#77818c;">Zosavuta · Malawi</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
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
