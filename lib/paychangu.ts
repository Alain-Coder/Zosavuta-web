const PAYCHANGU_BASE_URL = 'https://api.paychangu.com';

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
}): Promise<PaymentInitialization> {
  const secretKey = process.env.PAYCHANGU_SECRET_KEY;
  if (!secretKey) throw new Error('PayChangu is not configured');

  const response = await fetch(`${PAYCHANGU_BASE_URL}/payment/initialize`, {
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
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status !== 'success' || !data?.data?.checkout_url) {
    throw new Error(data?.message || 'PayChangu payment initialization failed');
  }

  return {
    checkoutUrl: data.data.checkout_url,
    providerReference: data.data.tx_ref || input.txRef,
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