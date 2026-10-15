import { createHash, randomBytes } from 'crypto';
import path from 'path';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] as string);
}

function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is required to create verification links.');
  return appUrl.replace(/\/+$/, '');
}

export async function sendVerificationEmail(uid: string): Promise<void> {
  const conn = await pool.getConnection();
  let email = '';
  let fullName = '';
  let token = '';

  try {
    await conn.beginTransaction();
    const [userRows] = await conn.execute(
      'SELECT email, fullName, emailVerified FROM users WHERE uid = ? FOR UPDATE',
      [uid]
    );
    const user = (userRows as { email: string; fullName: string; emailVerified: number }[])[0];
    if (!user) throw new Error('Account not found.');
    if (Boolean(Number(user.emailVerified))) {
      await conn.commit();
      return;
    }

    const [attemptRows] = await conn.execute(
      'SELECT COUNT(*) AS count FROM email_verification_tokens WHERE uid = ? AND createdAt >= NOW() - INTERVAL 1 HOUR',
      [uid]
    );
    const attempts = Number((attemptRows as { count: number }[])[0]?.count || 0);
    if (attempts >= 3) {
      throw new Error('Too many verification emails requested. Please try again in an hour.');
    }

    token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await conn.execute(
      'UPDATE email_verification_tokens SET consumedAt = NOW() WHERE uid = ? AND consumedAt IS NULL',
      [uid]
    );
    await conn.execute(
      'INSERT INTO email_verification_tokens (uid, tokenHash, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',
      [uid, tokenHash]
    );
    email = user.email;
    fullName = user.fullName;
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const verificationUrl = `${getAppUrl()}/email-verification?token=${encodeURIComponent(token)}`;
  const name = escapeHtml(fullName || 'there');
  await sendEmail({
    to: email,
    subject: 'Verify your Zosavuta email address',
    text: `Hello ${fullName || 'there'},\n\nConfirm your email address within 30 minutes by opening this link:\n${verificationUrl}\n\nIf you did not create a Zosavuta account, you can ignore this email.`,
    html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Verify your Zosavuta email</title></head>
  <body style="margin:0;padding:0;background-color:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#202936;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm your Zosavuta email address to finish setting up your account.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f5f7;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e7ec;border-radius:8px;">
          <tr><td align="center" style="padding:28px 32px 20px;border-bottom:1px solid #edf0f2;">
            <img src="cid:zosavuta-logo" width="56" height="56" alt="Zosavuta" style="display:block;width:56px;height:56px;border:0;margin:0 auto 8px;">
            <p style="margin:0;font-size:20px;line-height:28px;font-weight:bold;color:#18794e;">Zosavuta</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#202936;">Verify your email address</h1>
            <p style="margin:0 0 16px;font-size:16px;line-height:25px;">Hello ${name},</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:25px;">Confirm your email address to finish setting up your Zosavuta account. This link expires in 30 minutes.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#18794e" style="border-radius:6px;">
              <a href="${escapeHtml(verificationUrl)}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:16px;line-height:20px;font-weight:bold;">Verify my email</a>
            </td></tr></table>
            <p style="margin:24px 0 8px;font-size:13px;line-height:20px;color:#647080;">If the button does not work, copy this link into your browser:</p>
            <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;"><a href="${escapeHtml(verificationUrl)}" style="color:#18794e;">${escapeHtml(verificationUrl)}</a></p>
            <p style="margin:0;font-size:13px;line-height:20px;color:#647080;">If you did not create a Zosavuta account, you can ignore this email.</p>
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
}

export async function confirmEmailVerification(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error('This verification link is invalid or expired.');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [tokenRows] = await conn.execute(
      'SELECT uid FROM email_verification_tokens WHERE tokenHash = ? AND consumedAt IS NULL AND expiresAt > NOW() FOR UPDATE',
      [tokenHash]
    );
    const row = (tokenRows as { uid: string }[])[0];
    if (!row) throw new Error('This verification link is invalid, expired, or already used.');

    const [consumeResult] = await conn.execute(
      'UPDATE email_verification_tokens SET consumedAt = NOW() WHERE tokenHash = ? AND consumedAt IS NULL AND expiresAt > NOW()',
      [tokenHash]
    );
    if (Number((consumeResult as { affectedRows: number }).affectedRows) !== 1) {
      throw new Error('This verification link is invalid, expired, or already used.');
    }

    await conn.execute('UPDATE users SET emailVerified = 1 WHERE uid = ?', [row.uid]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
