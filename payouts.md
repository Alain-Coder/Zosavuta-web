# Payment Fees and Organizer Payout Policy

## 1. Purpose

This document defines the mandatory payment, platform-fee, settlement, and organizer-payout rules for the ticket marketplace.

---

# 2. Platform Fee

The platform charges an:

```text
PLATFORM_FEE_PERCENT = 8%
```

The platform fee is deducted from the ticket sale amount.


```

### Example

```text
ticketPrice = MWK 100,000
platformFee = MWK 8,000
organizerBalance = MWK 92,000
```

Therefore:

```text
organizerBalance =
    ticketPrice - platformFee
```

The organizer receives 92% of the ticket price BEFORE the organizer payout fee.

---

# 3. PayChangu Collection Fees

PayChangu collection/transaction fees are a cost of the platform.

They must NOT be charged separately to the customer.

Configured collection rates:

```text
MOBILE_MONEY = 3%
CARD = 3%
BANK_TRANSFER = 2%
```

These rates are used for platform accounting and reconciliation.

### Example: Mobile Money

```text
ticketPrice = MWK 100,000

platformFee = MWK 8,000

paychanguCollectionFee = MWK 3,000

platformGrossRemaining =
    MWK 8,000 - MWK 3,000

platformGrossRemaining = MWK 5,000
```

The organizer's balance remains:

```text
MWK 92,000
```

The PayChangu collection fee must NOT be deducted again from the organizer.

---

# 5. ORGANIZER PAYOUT METHOD — STRICT RULE

## BANK TRANSFER ONLY

The application must support ONLY:

```text
BANK_TRANSFER
```

for organizer payouts using the Payout bank details entered in the organizer verifications.

The application must NOT offer:

```text
AIRTEL_MONEY
TNM_MPAMBA
```

as organizer payout methods.

Do not display mobile-money payout options in:

* Organizer dashboard
* Organizer payout settings
* Payout request forms
* Admin payout screens
* API payloads
* Payout service logic

The organizer payout method is always:

```text
BANK_TRANSFER
```

---

# 6. Organizer Bank Details

Use the Bank details which were entered in the organizer verification process.

Required information should include the bank details required by PayChangu for a bank payout.

---

# 7. PayChangu Bank Payout Fee

The configured PayChangu bank payout fee is:

```text
BANK_PAYOUT_PERCENT = 1.7%
BANK_PAYOUT_FIXED_FEE = MWK 700
```

The organizer bears this fee.

The platform does NOT absorb the organizer bank payout fee.

---

# 8. Bank Payout Fee Formula

The payout fee must be calculated as:

```text
payoutFee =
    (payoutAmount * 0.017) + 700
```

The organizer's net payout is:

```text
netPayout =
    payoutAmount - payoutFee
```

---

# 9. Bank Payout Example

Given:

```text
ticketPrice = MWK 100,000
```

Platform fee:

```text
100,000 * 8%
= MWK 8,000
```

Organizer balance:

```text
100,000 - 8,000
= MWK 92,000
```

Bank payout fee:

```text
92,000 * 1.7%
= MWK 1,564
```

Add fixed fee:

```text
1,564 + 700
= MWK 2,264
```

Organizer net payout:

```text
92,000 - 2,264
= MWK 89,736
```

---

# 10. Organizer Balance Rule

The organizer balance must NOT be reduced by the PayChangu collection fee.

Correct:

```text
Ticket Price             100,000
Platform Fee              -8,000
--------------------------------
Organizer Balance         92,000
```

Then, only when the organizer requests a payout:

```text
Organizer Balance          92,000
Bank Payout Fee             -2,264
----------------------------------
Net Bank Payout             89,736
```

---

# 11. Payout Fee Ownership

The payout fee belongs to the organizer's settlement costs.

Therefore:

```text
Platform Fee = Platform's responsibility
PayChangu Collection Fee = Platform's responsibility
Bank Payout Fee = Organizer's responsibility
```

The platform must not deduct the bank payout fee from its 8% platform revenue.

---


---

# 13. Payout Eligibility

A successful PayChangu customer payment does not automatically trigger an organizer payout.

Recommended lifecycle:

```text
PAYMENT_INITIATED
        ↓
PAYMENT_SUCCESS
        ↓
PAYMENT_VERIFIED
        ↓
TICKET_CONFIRMED
        ↓
ORGANIZER_BALANCE_CREDITED
        ↓
PAYOUT_ELIGIBLE
        ↓
ORGANIZER_REQUESTS_PAYOUT
        ↓
BANK_PAYOUT_INITIATED
        ↓
BANK_PAYOUT_SUCCESS
        ↓
ORGANIZER_PAID
```

Payout eligibility must respect the platform's:

* Event completion rules
* Cancellation rules
* Refund policy
* Dispute rules
* Fraud controls
* Administrative holds

---

# 14. Organizer Dashboard

The organizer should be able to see:

```text
Gross Ticket Sales             MWK 100,000
Platform Fee (8%)             -MWK   8,000
-------------------------------------------
Organizer Balance               MWK 92,000
```

When requesting payout:

```text
Payout Amount                   MWK 92,000
Bank Payout Fee                 MWK  2,264
-------------------------------------------
Net Bank Payout                 MWK 89,736
```

The organizer must see the payout fee before confirming the payout.

---

# 22. Admin Accounting

Administrators/accountants must be able to distinguish:

```text
Gross Sales
Platform Fees
PayChangu Collection Fees
Organizer Balances
Organizer Payout Fees
Organizer Net Payouts
```

Do not combine these into a single generic "fee" field.

---

# 23. Refund Safety

Before allowing an organizer payout, the platform must account for:

* Refunds
* Cancelled events
* Failed payments
* Disputes
* Ticket reversals

The platform must not release funds that may be required to satisfy a valid refund or reversal etc.

---

# 24. Important Business Rule

The platform's business model is:

```text
CUSTOMER
Pays 100% of advertised ticket price
        ↓
PLATFORM
Charges organizer 8%
        ↓
PAYCHANGU
Collection fee is paid from platform economics
        ↓
ORGANIZER
Receives 92% balance
        ↓
PAYCHANGU BANK PAYOUT
1.7% + MWK 700 deducted from organizer balance
        ↓
ORGANIZER BANK ACCOUNT
```

---

# 25. Final Fee Summary

| Component                          |           Rate | Responsible Party |
| ---------------------------------- | -------------: | ----------------- |
| Ticket price                       |           100% | Customer          |
| Platform Fee                       |             8% | Organizer         |
| PayChangu Mobile Money collection  |             3% | Platform          |
| PayChangu Card collection          |             3% | Platform          |
| PayChangu Bank Transfer collection |             2% | Platform          |
| PayChangu Bank payout              | 1.7% + MWK 700 | Organizer         |

---

