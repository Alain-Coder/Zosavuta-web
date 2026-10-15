import { sendEmail } from '@/lib/email';

type PendingReviewNotification = {
  reviewType: 'organizer verification' | 'event submission';
  title: string;
  submittedBy: string;
};

export async function notifyAdminOfPendingReview({
  reviewType,
  title,
  submittedBy,
}: PendingReviewNotification): Promise<void> {
  const subject = `Pending ${reviewType}: ${title}`;
  const text = `${reviewType} requires review.\n\n${title}\nSubmitted by: ${submittedBy}\n\nReview it at ${process.env.APP_URL || 'https://zosavuta.com'}/admin.`;
  const escapedTitle = title.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
  const escapedSubmitter = submittedBy.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
  const adminUrl = `${process.env.APP_URL || 'https://zosavuta.com'}/admin`;

  try {
    await sendEmail({
      to: 'admin@zosavuta.com',
      subject,
      text,
      html: `<p>A ${reviewType} is ready for review.</p><p><strong>${escapedTitle}</strong><br>Submitted by: ${escapedSubmitter}</p><p><a href="${adminUrl}">Open the admin dashboard</a></p>`,
    });
  } catch (error) {
    console.error(`Unable to notify admin about pending ${reviewType}:`, error);
  }
}