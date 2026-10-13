import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { query } from '@/lib/db';
import { verifyPayChanguTransaction } from '@/lib/paychangu';
import { getPayChanguAppUrl } from '@/lib/paychangu';
import { completeVerifiedPayment } from '@/lib/payment-settlement';
import { getPayChanguPayoutDetails } from '@/lib/paychangu-payouts';
import { applyVerifiedPayoutStatus } from '@/lib/payout-reconciliation';

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYCHANGU_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const received = signature.replace(/^sha256=/i, '').trim().toLowerCase();
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function GET(req: NextRequest) {
  const txRef = req.nextUrl.searchParams.get('tx_ref') || req.nextUrl.searchParams.get('reference');
  if (!txRef) {
    return NextResponse.json({ error: 'Webhook endpoint accepts signed POST notifications' }, { status: 400 });
  }

  const payments = await query<{ orderId: string }>(
    'SELECT orderId FROM payments WHERE providerReference = ? OR idempotencyKey = ? LIMIT 1',
    [txRef, txRef]
  );
  if (!payments.length) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  // GET is only a customer redirect/status view. Payment confirmation remains POST-only.
  const appUrl = getPayChanguAppUrl(req.url);
  return NextResponse.redirect(`${appUrl}/checkout/${payments[0].orderId}?payment=pending&tx_ref=${encodeURIComponent(txRef)}`);
}

async function handlePaymentWebhook(payload: Record<string, any>) {
  const txRef = String(
    payload.tx_ref
    || payload.reference
    || payload.data?.tx_ref
    || payload.data?.transaction?.tx_ref
    || ''
  );
  if (!txRef) return NextResponse.json({ error: 'Provider reference is required' }, { status: 400 });

  try {
    const verified = await verifyPayChanguTransaction(txRef);
    const payments = await query<{ id: string; orderId: string; amount: number; status: string }>(
      'SELECT id, orderId, amount, status FROM payments WHERE providerReference = ? OR idempotencyKey = ?',
      [txRef, txRef]
    );
    const payment = payments[0];
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status === 'PAID') {
      await completeVerifiedPayment(payment.id, payment.orderId, txRef);
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (
      String(verified.status).toLowerCase() !== 'success'
      || Number(verified.amount) !== Number(payment.amount)
      || String(verified.currency).toUpperCase() !== 'MWK'
    ) {
      return NextResponse.json({ error: 'Payment verification mismatch' }, { status: 400 });
    }
    await completeVerifiedPayment(payment.id, payment.orderId, txRef);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePayoutWebhook(payload: Record<string, any>) {
  const providerRef = String(
    payload.charge_id
    || payload.data?.charge_id
    || payload.data?.transaction?.charge_id
    || payload.tx_ref
    || ''
  );
  if (!providerRef) {
    return NextResponse.json({ error: 'Provider reference is missing' }, { status: 400 });
  }

  try {
    const details = await getPayChanguPayoutDetails(providerRef);
    const verifiedStatus = details?.data?.transaction?.status;
    if (typeof verifiedStatus !== 'string' || !verifiedStatus.trim()) {
      throw new Error('PayChangu payout details did not include data.transaction.status');
    }

    const result = await applyVerifiedPayoutStatus(providerRef, verifiedStatus);
    if (result === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }
    if (result === 'PENDING') {
      console.info('PayChangu payout remains non-final for', providerRef, { verifiedStatus });
      return NextResponse.json({ received: true, pending: true, verifiedStatus });
    }
    if (result === 'DUPLICATE') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ received: true, finalStatus: result });
  } catch (error) {
    console.error('Server-to-server PayChangu verification failed for', providerRef, error);
    return NextResponse.json({ error: 'Payout verification or reconciliation failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('Signature')
    || req.headers.get('x-paychangu-signature')
    || req.headers.get('x-webhook-signature')
    || req.headers.get('signature');
  if (!isValidSignature(rawBody, signature)) {
    console.error('PayChangu webhook rejected: invalid signature', {
      hasWebhookSecret: Boolean(process.env.PAYCHANGU_WEBHOOK_SECRET),
      hasSignature: Boolean(signature),
      signatureLength: signature?.replace(/^sha256=/i, '').trim().length || 0,
    });
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const eventType = String(
    payload.event_type
    || payload.data?.event_type
    || payload.data?.transaction?.event_type
    || payload.event
    || ''
  ).toLowerCase();

  if (eventType === 'api.charge.payment') return handlePaymentWebhook(payload);
  if (eventType === 'api.payout') return handlePayoutWebhook(payload);

  return NextResponse.json({ error: 'Unsupported or missing PayChangu event type' }, { status: 400 });
}