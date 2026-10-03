const PAYCHANGU_BASE_URL = (process.env.PAYCHANGU_API_URL || 'https://api.paychangu.com').replace(/\/$/, '');

export function getPayChanguAppUrl(requestUrl: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin).replace(/\/$/, '');
}

export interface PaymentInitialization {
  checkoutUrl: string;
  providerReference: string;
}

export async function initializePayChanguPayment(input: {
  amount: number;
  currency: string;
  email: string;
  firstName?: string;
  lastName?: string;
  txRef: string;
  callbackUrl: string;
  returnUrl: string;
  customization?: {
    title?: string;
    description?: string;
  };
}): Promise<PaymentInitialization> {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu is not configured');

  const response = await fetch(`${PAYCHANGU_BASE_URL}/payment`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      email: input.email,
      first_name: input.firstName || 'Customer',
      last_name: input.lastName || 'Customer',
      tx_ref: input.txRef,
      callback_url: input.callbackUrl,
      return_url: input.returnUrl,
      customization: {
        title: input.customization?.title || 'Zosavuta Tickets',
        description: input.customization?.description || 'Event ticket checkout',
      },
    }),
  });
  const responseText = await response.text();
  let data: any = null;
  try { data = responseText ? JSON.parse(responseText) : null; } catch { /* provider returned non-JSON */ }
  const checkoutUrl = data?.data?.checkout_url;
  if (!response.ok || data?.status !== 'success' || !checkoutUrl) {
    const providerMessage = data?.message || data?.error || responseText.slice(0, 300) || 'PayChangu payment initialization failed';
    throw new Error(`PayChangu initialization failed (${response.status}): ${providerMessage}`);
  }

  return {
    checkoutUrl,
    providerReference: data.data.data?.tx_ref || data.data.tx_ref || input.txRef,
  };
}

export async function verifyPayChanguTransaction(txRef: string) {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu is not configured');

  const response = await fetch(`${PAYCHANGU_BASE_URL}/verify-payment/${encodeURIComponent(txRef)}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${secretKey}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status !== 'success') {
    throw new Error(data?.message || 'PayChangu verification failed');
  }
  return data.data;
}