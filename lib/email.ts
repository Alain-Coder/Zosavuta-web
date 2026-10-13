import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: SendMailOptions['attachments'];
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !pass || !from || !Number.isInteger(port) || port < 1) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments,
  });
}
