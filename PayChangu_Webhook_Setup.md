# PayChangu Webhook & Financial Marketplace Specification

## Implementation Status

The PayChangu webhook foundation and full financial marketplace engine are **100% production-complete**.

### Completed Functionalities:

1. **HMAC-SHA256 Signature Verification**: Raw body preservation, constant-time comparison, and multi-header fallback (`Signature`, `x-paychangu-signature`, `x-webhook-signature`).
2. **Server-Side PayChangu Verification**: Strict verification against PayChangu API checking transaction status (`success`), currency (`MWK`), and exact amount matching.
3. **Primary Ticket Issuance**: Server-priced checkout, atomic order confirmation, inventory decrement, fee calculations, and seller pending balance credit.
4. **Scheduled Reconciliation Engine**: Automated background worker (`lib/reconciliation.ts` & `/api/cron/reconcile-payments`) checking pending payments aged 10 mins–24 hours and releasing expired resale locks.
5. **Secondary Resale Finalization**: Resale checkout (`/api/resale/initialize-payment`), 15-minute temporary listing reservation, atomic ownership transfer, and seller pending payout credit.
6. **Ticket Ownership History**: Immutable audit log of all ticket transfers (`ticket_ownership_history` & `lib/tickets.ts`) tracking primary issuance and secondary resales.
7. **Configurable Fee Engine**: Multi-tier fee schedule (`financial_fee_schedules` & `lib/fees.ts`) for buyer service fees, organizer commissions, resale fees, payout fees, and refund fees.
8. **Payout Eligibility & Cooling-Off State Machine**: T+2 event completion cooling-off balance release (`lib/payout-eligibility.ts`), account dispute holds, and minimum threshold checks.
9. **PayChangu Settlement Payout Integration**: Mobile Money & Bank transfers (`lib/paychangu-payouts.ts`) and provider settlement webhook callbacks (`/api/payouts/webhook`).
10. **Refunds, Cancellations & Chargebacks**: Double-entry reversal ledgers (`lib/refunds.ts` & `/api/admin/refunds`), ticket status revocations, and inventory restock workflows.
11. **Dual Verification Queues & Dual-Approval Controls**: Separate Ticket Configuration Queue (`/api/admin/ticket-approvals`) and Financial Verification Queue (`/api/admin/financial-verifications`) enforcing Segregation of Duties and dual sign-offs for high-value requests (`lib/security-controls.ts`).
12. **Immutable Financial Audit & Ledger Reports**: Comprehensive audit trails (`financial_audit_logs`, `lib/audit.ts`, `/api/admin/audit-logs`) and double-entry ledger balance integrity checks (`/api/admin/financial-reports`).

---

## Environment Configuration

Configure the PayChangu webhook callback URL in your provider dashboard:

```text
https://YOUR_PUBLIC_DOMAIN/api/payments/webhook
```

Store the credentials securely in `.env.local`:

```env
PAYCHANGU_SECRET_KEY=sec-live-xxxxxxxxxxxx
PAYCHANGU_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
CRON_SECRET=your-secure-cron-secret
```

---

## Webhook Processing & Security Architecture

```text
PayChangu Webhook / Payout Callback
        ↓
Preserve raw request body
        ↓
Extract Signature header
        ↓
Verify HMAC-SHA256 (constant-time timingSafeEqual)
        ↓
Parse JSON payload & extract tx_ref
        ↓
Idempotency check: Return 200 if status = PAID / COMPLETED
        ↓
Server-to-server PayChangu verification API
        ↓
Verify status ('success'), currency ('MWK'), & amount
        ↓
Atomic Database Transaction:
  ├── Primary: Issue tickets, update inventory, record fee splits, credit seller pending balance
  └── Secondary Resale: Mark listing SOLD, update ticket currentOwnerId, record ownership history, credit reseller
        ↓
Return HTTP 200 { received: true }
```

---

## Fee Calculation Rules

Fee calculations are managed dynamically in `financial_fee_schedules` via `lib/fees.ts`:

- **Primary Order Buyer Fee**: `(grossTicketTotal * 5.0%) + MWK 100` per ticket.
- **Organizer Commission**: `grossTicketTotal * 7.0%`.
- **Secondary Resale Platform Fee**: `resalePrice * 10.0%`.
- **Settlement Payout Fee**: `MWK 500` fixed per payout batch.
- **Refund Processing Fee**: `MWK 200` fixed per refunded ticket.

---

## Payout Cooling-Off & Hold Engine

Funds earned from ticket sales are held in `seller_balances.pendingBalance` until the event date + T+2 business days cooling-off period has passed.

Automated background invocation of `releaseEligiblePendingBalances()` moves cleared funds into `seller_balances.availableBalance`.

---

## Segregation of Duties & Dual-Approval System

High-risk financial operations (payouts or refunds $\ge$ MWK 50,000 or full event cancellations) require multi-role sign-off:

1. **Segregation of Duties**: An organizer or admin user **cannot** approve payout requests for their own account.
2. **Dual-Approval Threshold**: Requests $\ge$ MWK 50,000 record a first sign-off in `approval_records` and require a second distinct administrator or accountant to complete execution.

---

## Automated Reconciliation Cron

Execute the backup reconciliation process every 15 minutes:

```text
GET /api/cron/reconcile-payments
Headers: Authorization: Bearer <CRON_SECRET>
```

This checks all pending payments created between 10 minutes and 24 hours ago, verifies their status with PayChangu, and releases expired resale listing reservations.
