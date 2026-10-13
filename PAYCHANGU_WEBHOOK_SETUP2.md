# PayChangu Payment and Payout Webhook Setup

Configure the PayChangu webhook callback for both payment and payout events to:

```text
https://YOUR_PUBLIC_DOMAIN/api/payments/webhook
```

The server expects an HMAC-SHA256 signature of the exact raw JSON request body. Configure the same value in the server environment as:

```env
PAYCHANGU_WEBHOOK_SECRET=your-webhook-signing-secret
```

Send the hexadecimal digest in one of these headers:

```text
x-paychangu-signature: <hex-digest>
```

`x-webhook-signature` and `signature` are also accepted. A `sha256=` prefix is supported.

The single endpoint routes `api.charge.payment` to payment processing and `api.payout` to payout processing. Both event types use the same `PAYCHANGU_WEBHOOK_SECRET`; the payout is verified server-to-server before its ledger or balance is updated.

The webhook then performs these checks in order:

1. Verify the HMAC signature.
2. Find the recorded payment by PayChangu transaction reference.
3. Verify the transaction server-to-server with PayChangu.
4. Confirm status is `success`, currency is `MWK`, and amount matches the recorded payment.
5. Atomically mark the payment paid, confirm the order, issue tickets, decrement inventory, and record pending seller earnings.

Duplicate callbacks for an already-paid payment are acknowledged without creating duplicate tickets or ledger entries.