import path from 'path';
import { sendEmail } from '@/lib/email';

type OrganizerDecisionNotification = {
  to: string;
  recipientName?: string | null;
  approvedItem: 'organizer verification' | 'event submission';
  decision: 'approved' | 'rejected';
  title: string;
  reason?: string | null;
  eventUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split(String.fromCharCode(34)).join('&quot;')
    .split("'").join('&#39;');
}

export async function notifyOrganizerOfDecision({
  to,
  recipientName,
  approvedItem,
  decision,
  title,
  reason,
  eventUrl,
}: OrganizerDecisionNotification): Promise<void> {
  if (!to) return;

  const name = escapeHtml(recipientName?.trim() || 'there');
  const safeTitle = escapeHtml(title);
  const isEvent = approvedItem === 'event submission';
  const isApproved = decision === 'approved';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://zosavuta.com').replace(/\/+$/, '');
  const nextStep = isApproved
    ? isEvent
      ? 'Your event is now approved and available to attendees.'
      : 'Your organizer account is verified. You can now submit and publish events.'
    : isEvent
      ? 'Your event was not approved. Review the reason below, make the requested changes, and resubmit it for review.'
      : 'Your organizer verification was not approved. Review the reason below, update your details, and resubmit for review.';
  const actionUrl = isApproved && isEvent && eventUrl
    ? `${appUrl}/events/${encodeURIComponent(eventUrl)}`
    : isEvent
      ? `${appUrl}/organizer/events`
      : `${appUrl}/organizer/verification`;
  const safeReason = reason?.trim() ? escapeHtml(reason.trim()) : '';
  const subject = `${isApproved ? 'Approved' : 'Update required'}: ${title}`;

  try {
    await sendEmail({
      to,
      subject,
      text: `Hello ${recipientName?.trim() || 'there'},\n\nYour ${approvedItem} "${title}" has been ${decision}. ${nextStep}${safeReason ? `\n\nReason: ${reason}` : ''}\n\n${isApproved && isEvent ? 'View your event' : isEvent ? 'Update your event' : 'Open your organizer verification'}: ${actionUrl}\n\nThank you for choosing Zosavuta.`,
      html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Zosavuta review update</title></head>
  <body style="margin:0;padding:0;background-color:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#202936;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your ${approvedItem} has been ${decision}.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f7;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e7ec;border-radius:8px;">
          <tr><td align="center" style="padding:28px 32px 20px;border-bottom:1px solid #edf0f2;">
            <img src="cid:zosavuta-logo" width="56" height="56" alt="Zosavuta" style="display:block;width:56px;height:56px;border:0;margin:0 auto 8px;">
            <p style="margin:0;font-size:20px;line-height:28px;font-weight:bold;color:#18794e;">Zosavuta</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:${isApproved ? '#18794e' : '#a23b32'};">${isApproved ? 'Approved' : 'Changes requested'}</h1>
            <p style="margin:0 0 16px;font-size:16px;line-height:25px;">Hello ${name},</p>
            <p style="margin:0 0 12px;font-size:16px;line-height:25px;">Your ${approvedItem} has been ${decision}:</p>
            <p style="margin:0 0 18px;padding:14px 16px;background-color:#f8faf9;border:1px solid #e4ebe7;font-size:16px;line-height:24px;font-weight:bold;">${safeTitle}</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#46515d;">${nextStep}</p>
            ${safeReason ? `<p style="margin:0 0 24px;padding:14px 16px;background-color:#fff8f6;border:1px solid #f0d8d4;font-size:14px;line-height:22px;color:#663b36;"><strong>Reason:</strong> ${safeReason}</p>` : ''}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="${isApproved ? '#18794e' : '#344054'}" style="border-radius:6px;">
              <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:bold;">${isApproved && isEvent ? 'View event' : isEvent ? 'Update event' : 'Open organizer verification'}</a>
            </td></tr></table>
          </td></tr>
          <tr><td style="padding:18px 32px;background-color:#f8faf9;border-top:1px solid #edf0f2;text-align:center;font-size:12px;line-height:18px;color:#77818c;">Zosavuta · Malawi</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
      attachments: [{
        filename: 'zosavuta.png',
        path: path.join(process.cwd(), 'public', 'zosavuta.png'),
        contentType: 'image/png',
        cid: 'zosavuta-logo',
      }],
    });
  } catch (error) {
    console.error(`Unable to notify organizer about approved ${approvedItem}:`, error);
  }
}