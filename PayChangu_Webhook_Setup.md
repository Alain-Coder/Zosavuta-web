# PayChangu Payment and Payout Webhook Handling

## Webhook Authentication

For the normal PayChangu merchant webhook setup, use the **Webhook Secret configured for the PayChangu account** and verify the `Signature` header for incoming webhook requests.

The same webhook authentication mechanism applies to both payment and payout webhook events.

You do not need separate webhook secrets such as:

```env
PAYCHANGU_PAYMENT_WEBHOOK_SECRET=...
PAYCHANGU_PAYOUT_WEBHOOK_SECRET=...
```

unless PayChangu specifically provides separate webhook credentials for the account.

The normal configuration can therefore be:

```env
PAYCHANGU_SECRET_KEY=...
PAYCHANGU_WEBHOOK_SECRET=...
```

Both:

```text
api.charge.payment
```

and:

```text
api.payout
```

should be authenticated using the webhook signature.

---

## Payment Webhook Handling

For customer payments, use the following flow:

```text
Webhook received
        ↓
Verify webhook signature
        ↓
Server-to-server PayChangu transaction verification
        ↓
Check transaction reference
        ↓
Check amount
        ↓
Check currency
        ↓
Check payment status
        ↓
Mark payment as PAID
```

The application should **not** mark a payment as successful solely because the webhook was received.

The webhook should trigger a server-to-server verification with PayChangu before the transaction is finalized.

---

## Payout Webhook Handling

For organizer payouts, use the equivalent flow:

```text
Payout webhook received
        ↓
Verify webhook signature
        ↓
Identify payout using charge_id/reference
        ↓
Verify payout status with PayChangu
        ↓
Update internal payout ledger
        ↓
If status = SUCCESS
        ↓
Mark organizer payout as SUCCESS
```

If the payout is still pending:

```text
PENDING / PROCESSING
```

the internal payout should remain pending.

If PayChangu reports a failure:

```text
FAILED
```

the platform should mark the payout as failed and handle the organizer balance appropriately.

---

## Important Rule

For **payments**:

> Webhook → verify signature → server-to-server PayChangu verification → check amount/currency/status → mark payment as paid.

For **payouts**:

> Payout webhook → verify signature → identify `charge_id` → verify payout status → update internal payout ledger → only then mark organizer payout as `SUCCESS`.

This provides a consistent and secure transaction lifecycle for both incoming customer payments and outgoing organizer payouts.

---

## Recommended Implementation

Use one PayChangu webhook endpoint for the platform, for example:

```text
POST /api/payments/webhook
```

The endpoint should determine the event type and route the transaction to the appropriate payment or payout handler.

The important distinction is:

```text
api.charge.payment  → Customer payment
api.payout           → Organizer payout
```

Both should pass through the same webhook-signature verification process, while their transaction processing logic remains separate.

---

## Security Principle

Never treat a webhook notification alone as proof that money has successfully moved.

The webhook should be treated as a **trusted notification that triggers verification and reconciliation**, while the PayChangu transaction status is used to determine the final financial state.

This is especially important for organizer payouts because a payout request can initially be returned as `pending` before the bank transfer is actually completed.
