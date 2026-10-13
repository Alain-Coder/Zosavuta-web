# PayChangu Bank Codes, Bank Payouts & Get Banks API Reference

## Purpose

This document defines how the application should handle PayChangu bank
identifiers and bank payouts for organizer settlements.

The recommended implementation uses **PayChangu bank UUIDs returned by
the Get Banks API** rather than hard-coded traditional bank codes.

> **Important:** PayChangu's payout API expects `bank_uuid`, not a
> conventional bank code such as `NBM`, `STD`, or a locally assigned
> numeric bank code.

Official references: - PayChangu Get Banks API:
https://developer.paychangu.com/reference/get-banks - PayChangu Bank
Payout API: https://developer.paychangu.com/reference/bank-payout -
PayChangu Bank Account / Payout Guide:
https://developer.paychangu.com/docs/bank-account

------------------------------------------------------------------------

# 1. PayChangu Bank Identifier

For bank payouts, PayChangu requires:

``` text
bank_uuid
```

The UUID identifies the bank or supported payout provider.

The correct UUID should be obtained from PayChangu's **Get Banks**
endpoint rather than being guessed or manually assigned.

The current endpoint is:

``` http
GET https://api.paychangu.com/direct-charge/payouts/supported-banks?currency=MWK
```

PayChangu's response contains objects with:

``` json
{
  "uuid": "bank-uuid",
  "name": "Bank Name"
}
```

The application should use the returned `uuid` as `bank_uuid` when
creating a payout.

------------------------------------------------------------------------

# 2. Get Banks HTTP Request

## Request

``` http
GET /direct-charge/payouts/supported-banks?currency=MWK HTTP/1.1
Host: api.paychangu.com
Authorization: Bearer YOUR_PAYCHANGU_SECRET_KEY
Accept: application/json
```

### cURL

``` bash
curl --request GET \
  --url 'https://api.paychangu.com/direct-charge/payouts/supported-banks?currency=MWK' \
  --header 'Authorization: Bearer YOUR_PAYCHANGU_SECRET_KEY' \
  --header 'Accept: application/json'
```

The endpoint is specifically intended to retrieve the banks currently
supported for processing payouts/payments.

------------------------------------------------------------------------

# 3. Example Get Banks Response

A current example from PayChangu's documentation includes:

``` json
{
  "status": "success",
  "message": "Retrieved successfully.",
  "data": [
    {
      "uuid": "82310dd1-ec9b-4fe7-a32c-2f262ef08681",
      "name": "National Bank of Malawi"
    },
    {
      "uuid": "87e62436-0553-4fb5-a76d-f27d28420c5b",
      "name": "Ecobank Malawi Limited"
    },
    {
      "uuid": "b064172a-8a1b-4f7f-aad7-81b036c46c57",
      "name": "FDH Bank Limited"
    },
    {
      "uuid": "e7447c2c-c147-4907-b194-e087fe8d8585",
      "name": "Standard Bank Limited"
    },
    {
      "uuid": "236760c9-3045-4a01-990e-497b28d115bb",
      "name": "Centenary Bank"
    },
    {
      "uuid": "968ac588-3b1f-4d89-81ff-a3d43a599003",
      "name": "First Capital Limited"
    },
    {
      "uuid": "c759d7b6-ae5c-4a95-814a-79171271897a",
      "name": "CDH Investment Bank"
    },
    {
      "uuid": "5e9946ae-76ed-43f5-ad59-63e09096006a",
      "name": "TNM Mpamba"
    },
    {
      "uuid": "e8d5fca0-e5ac-4714-a518-484be9011326",
      "name": "Airtel Money"
    },
    {
      "uuid": "86007bf5-1b04-49ba-84c1-9758bbf5c996",
      "name": "NBS Bank Limited"
    }
  ]
}
```

**Important:** This is a current example/list from PayChangu's
documentation. Do not treat the list as a permanent hard-coded master
list. Query PayChangu's endpoint when the application needs the
supported-bank list.

------------------------------------------------------------------------

# 4. Current Bank UUID Examples

  Institution               PayChangu `bank_uuid`
  ------------------------- ----------------------------------------
  National Bank of Malawi   `82310dd1-ec9b-4fe7-a32c-2f262ef08681`
  Ecobank Malawi Limited    `87e62436-0553-4fb5-a76d-f27d28420c5b`
  FDH Bank Limited          `b064172a-8a1b-4f7f-aad7-81b036c46c57`
  Standard Bank Limited     `e7447c2c-c147-4907-b194-e087fe8d8585`
  Centenary Bank            `236760c9-3045-4a01-990e-497b28d115bb`
  First Capital Limited     `968ac588-3b1f-4d89-81ff-a3d43a599003`
  CDH Investment Bank       `c759d7b6-ae5c-4a95-814a-79171271897a`
  NBS Bank Limited          `86007bf5-1b04-49ba-84c1-9758bbf5c996`

### Important implementation rule

The application should **not permanently hard-code these UUIDs as the
source of truth**.

Recommended approach:

1.  Call Get Banks.
2.  Display the returned supported institutions.
3.  Let the organizer select their bank.
4.  Save the selected PayChangu `bank_uuid` with the organizer's payout
    account.
5.  Use that UUID when making the payout.
6.  Refresh/revalidate supported banks periodically or when configuring
    payout accounts.

This prevents the application from becoming dependent on a potentially
outdated bank list.

------------------------------------------------------------------------

# 5. Zosavuta Payout Policy

For Zosavuta, organizer payouts should be:

``` text
BANK TRANSFER ONLY
```

Airtel Money and TNM Mpamba should not be offered as organizer payout
options in the application.

Although PayChangu supports mobile-money withdrawals/payouts, the
platform's approved business model uses bank transfer for organizer
settlement.

Therefore, the organizer payout form should contain:

-   Bank
-   Bank account name
-   Bank account number
-   Optional verification/contact information required by the platform
-   Payout amount

It should not contain:

-   Airtel Money payout
-   TNM Mpamba payout

The backend must enforce this rule as well; hiding mobile-money options
in the frontend is not sufficient.

------------------------------------------------------------------------

# 6. Bank Payout Prerequisites

According to PayChangu's bank payout documentation, before using bank
payouts:

1.  The PayChangu account must complete KYC.
2.  The PayChangu account must be approved for transactions.
3.  The bank payout feature must be activated with PayChangu.

The platform should confirm that bank payouts are enabled on the
production PayChangu merchant account before going live.

------------------------------------------------------------------------

# 7. Bank Payout HTTP Request

PayChangu's bank payout endpoint is:

``` http
POST https://api.paychangu.com/direct-charge/payouts/initialize
```

The request uses:

``` http
Content-Type: application/json
Accept: application/json
Authorization: Bearer YOUR_PAYCHANGU_SECRET_KEY
```

### cURL

``` bash
curl --request POST \
  --url 'https://api.paychangu.com/direct-charge/payouts/initialize' \
  --header 'Authorization: Bearer YOUR_PAYCHANGU_SECRET_KEY' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
    "payout_method": "bank_transfer",
    "bank_uuid": "82310dd1-ec9b-4fe7-a32c-2f262ef08681",
    "amount": "89736",
    "charge_id": "ZOS-PAYOUT-UNIQUE-REFERENCE",
    "bank_account_name": "Organizer Name",
    "bank_account_number": "1001000010"
  }'
```

------------------------------------------------------------------------

# 8. Bank Payout Request Fields

  Field                   Required   Description
  ----------------------- ---------- --------------------------------------
  `payout_method`         Yes        Must be `bank_transfer`
  `bank_uuid`             Yes        PayChangu UUID returned by Get Banks
  `amount`                Yes        Amount to transfer
  `charge_id`             Yes        Unique payout reference
  `bank_account_name`     Yes        Recipient's bank account name
  `bank_account_number`   Yes        Recipient's bank account number
  `email`                 No         Recipient notification email
  `first_name`            No         Recipient first name
  `last_name`             No         Recipient last name

The `charge_id` **must be unique for every payout transaction**.

Recommended format:

``` text
ZOS-PAYOUT-20261008-000001
```

or a UUID-based reference generated by the backend.

------------------------------------------------------------------------

# 9. Example Successful Payout Response

PayChangu may initially return the payout as `pending`.

Example:

``` json
{
  "status": "success",
  "message": "Payout request submitted successfully.",
  "data": {
    "transaction": {
      "charge_id": "ZOS-PAYOUT-UNIQUE-REFERENCE",
      "ref_id": "97073812876",
      "trans_id": null,
      "currency": "MK",
      "amount": 89736,
      "type": "API Payout",
      "status": "pending",
      "event_type": "api.payout",
      "transaction_charges": {
        "currency": "MK",
        "amount": "0"
      },
      "recipient_account_details": {
        "bank_uuid": "82310dd1-ec9b-4fe7-a32c-2f262ef08681",
        "bank_name": "National Bank of Malawi",
        "account_name": "Organizer Name",
        "account_number": "1001000010"
      }
    }
  }
}
```

### Important

A successful HTTP/API submission does **not necessarily mean the bank
payout has completed**.

The returned transaction can initially have:

``` text
status: pending
```

The application must subsequently determine whether the payout becomes:

``` text
success
```

or fails.

------------------------------------------------------------------------

# 10. Payout Status Verification

PayChangu provides a payout details endpoint:

``` http
GET https://api.paychangu.com/direct-charge/payouts/{charge_id}/details
```

### cURL

``` bash
curl --request GET \
  --url 'https://api.paychangu.com/direct-charge/payouts/ZOS-PAYOUT-UNIQUE-REFERENCE/details' \
  --header 'Authorization: Bearer YOUR_PAYCHANGU_SECRET_KEY' \
  --header 'Accept: application/json'
```

The platform should use the payout `charge_id` to retrieve the
transaction details and determine the current payout status.

------------------------------------------------------------------------

# 11. Webhooks

PayChangu also supports payout webhooks.

The platform should configure a secure webhook endpoint for payout
events.

Example application endpoint:

``` text
POST /api/payments/paychangu/payout-webhook
```

The webhook should:

1.  Receive the PayChangu payout event.
2.  Validate the webhook signature.
3.  Locate the internal payout using the PayChangu `charge_id` or
    relevant reference.
4.  Verify the event status.
5.  Update the internal payout record.
6.  Record the PayChangu reference and completion time.
7.  Never credit the organizer twice.

Webhook processing must be idempotent.

------------------------------------------------------------------------

# 12. Recommended Organizer Payout Flow

The complete Zosavuta payout process should be:

``` text
Customer buys ticket
        ↓
Payment processed by PayChangu
        ↓
Payment verified server-to-server
        ↓
Ticket marked as paid/confirmed
        ↓
Organizer balance credited
        ↓
Event reaches payout eligibility
        ↓
Organizer requests payout
        ↓
Backend calculates payout fee
        ↓
Backend validates bank payout details
        ↓
PayChangu Bank Payout API
        ↓
Payout initially pending
        ↓
PayChangu status/webhook
        ↓
Payout successful
        ↓
Organizer balance/ledger updated
```

------------------------------------------------------------------------

# 13. Fee Calculation

The approved Zosavuta payout model is:

``` text
Bank payout fee = (payout amount × 1.7%) + MWK 700
```

Example:

``` text
Organizer balance = MWK 92,000

Percentage fee:
92,000 × 1.7% = MWK 1,564

Fixed fee:
MWK 700

Total payout fee:
MWK 2,264

Organizer receives:
92,000 - 2,264 = MWK 89,736
```

The payout fee is the organizer's responsibility.

------------------------------------------------------------------------

# 14. Important Separation of Fees

The platform must keep these financial concepts separate.

### Customer ticket price

The advertised amount paid by the customer.

### Platform Fee

``` text
8%
```

This is charged to the organizer's transaction economics.

### PayChangu Collection Fee

The cost of collecting the customer's payment.

This is absorbed within the platform's 8% economics under the approved
model.

### Organizer Balance

The organizer's balance after the platform fee.

### Organizer Payout Fee

``` text
1.7% + MWK 700
```

This is deducted when the organizer withdraws funds through bank payout.

### Net Organizer Payout

The amount actually sent to the organizer's bank account.

------------------------------------------------------------------------

# 15. Recommended Database Fields

The organizer payout account should contain fields similar to:

``` text
organizerId
bankUuid
bankName
bankAccountName
bankAccountNumber
isVerified
createdAt
updatedAt
```

The payout transaction should contain:

``` text
id
organizerId
eventId
amount
payoutMethod
bankUuid
bankName
bankAccountName
bankAccountNumber
payoutFeePercentage
payoutFixedFee
payoutFeeAmount
netPayoutAmount
paychanguChargeId
paychanguReferenceId
status
failureReason
requestedAt
processedAt
completedAt
```

------------------------------------------------------------------------

# 16. Do Not Trust Frontend Calculations

All payout calculations must happen on the server.

The frontend may display an estimated payout, but the backend must
recalculate:

``` text
available organizer balance
platform deductions
payout fee
net payout
```

before creating the PayChangu payout.

The backend must also verify:

``` text
payoutMethod === "bank_transfer"
```

and reject any unsupported payout method.

------------------------------------------------------------------------

# 17. Do Not Hard-Code the Bank List

Avoid code such as:

``` javascript
const banks = [
  {
    name: "National Bank of Malawi",
    uuid: "..."
  },
  {
    name: "Standard Bank",
    uuid: "..."
  }
];
```

as the permanent source of truth.

Instead:

``` text
PayChangu Get Banks API
        ↓
Supported bank list
        ↓
Organizer selects bank
        ↓
Store selected bank_uuid
        ↓
Use bank_uuid for payout
```

The application may cache the supported-bank list for performance, but
it should be possible to refresh it from PayChangu.

------------------------------------------------------------------------

# 18. Bank Account Validation

Before allowing an organizer to request a payout, the platform should
validate:

-   Bank is currently supported by PayChangu.
-   `bank_uuid` exists.
-   Account name is provided.
-   Account number is provided.
-   Payout amount is greater than zero.
-   Organizer has sufficient available balance.
-   Organizer is eligible for payout.
-   No existing payout is already processing for the same funds.
-   Payout method is `bank_transfer`.

Where PayChangu provides additional account validation functionality, it
should be used rather than relying solely on frontend validation.

------------------------------------------------------------------------

# 19. Security Requirements

The PayChangu secret key must never be exposed in:

-   Browser JavaScript
-   React components
-   Next.js client components
-   Public API responses
-   Git repositories
-   `.env` files committed to source control

Use a server-side environment variable:

``` env
PAYCHANGU_SECRET_KEY=your_secret_key
```

All payout requests must originate from the server.

Recommended architecture:

``` text
Browser
   ↓
Zosavuta Server/API
   ↓
PayChangu API
```

Not:

``` text
Browser
   ↓
PayChangu API
```

------------------------------------------------------------------------

# 20. Idempotency and Duplicate Payout Protection

Payouts are financial transactions.

The platform must prevent duplicate payout requests.

Before submitting a payout:

``` text
Check organizer balance
        ↓
Create internal payout record
        ↓
Lock/reserve payout amount
        ↓
Generate unique charge_id
        ↓
Submit to PayChangu
        ↓
Store PayChangu response
```

If a request times out, do not immediately submit another payout.

First check the status of the original `charge_id`.

This prevents a situation where an organizer receives two bank transfers
for the same balance.

------------------------------------------------------------------------

# 21. Recommended Internal Payout Statuses

Use internal statuses such as:

``` text
REQUESTED
PROCESSING
PENDING
SUCCESS
FAILED
CANCELLED
```

A typical lifecycle is:

``` text
REQUESTED
    ↓
PROCESSING
    ↓
PENDING
    ↓
SUCCESS
```

or:

``` text
PENDING
    ↓
FAILED
```

The exact mapping should be based on PayChangu's returned payout status
values.

------------------------------------------------------------------------

# 22. Production Checklist

Before enabling organizer payouts in production:

-   [ ] PayChangu KYC completed.
-   [ ] PayChangu merchant account approved.
-   [ ] Bank payout feature activated.
-   [ ] Production secret key configured server-side.
-   [ ] Get Banks API working.
-   [ ] Organizer bank selection implemented.
-   [ ] `bank_uuid` stored correctly.
-   [ ] Bank account details secured.
-   [ ] Bank payout API implemented.
-   [ ] Unique `charge_id` generation implemented.
-   [ ] Payout status verification implemented.
-   [ ] Payout webhooks configured.
-   [ ] Webhook signature verification implemented.
-   [ ] Duplicate payout protection implemented.
-   [ ] Organizer balance locking/reservation implemented.
-   [ ] 1.7% + MWK 700 payout calculation implemented.
-   [ ] Bank-only payout enforced server-side.
-   [ ] Failed payout handling implemented.
-   [ ] Reconciliation/reporting implemented.
-   [ ] Production test payout completed successfully.

------------------------------------------------------------------------

# 23. Recommended Implementation Rule for Zosavuta

The final implementation should follow this rule:

> **Zosavuta organizers can only withdraw through bank transfer. The
> bank selected by the organizer must come from PayChangu's Get Banks
> API, and the PayChangu `uuid` returned for that bank must be used as
> `bank_uuid` when creating the payout.**

Do not use a manually invented bank code.

Do not assume that a bank's name is sufficient.

Do not hard-code the supported-bank list as the permanent source of
truth.

------------------------------------------------------------------------

# 24. Official PayChangu API Endpoints

## Get supported banks

``` http
GET https://api.paychangu.com/direct-charge/payouts/supported-banks?currency=MWK
```

## Create bank payout

``` http
POST https://api.paychangu.com/direct-charge/payouts/initialize
```

## Get payout details

``` http
GET https://api.paychangu.com/direct-charge/payouts/{charge_id}/details
```

------------------------------------------------------------------------

# 25. Final Architecture

The recommended implementation is:

``` text
                    PAYCHANGU
                       │
             ┌─────────┴─────────┐
             │                   │
       Get Banks API       Bank Payout API
             │                   │
             ▼                   ▲
      Supported Banks             │
             │                   │
             ▼                   │
       Organizer selects          │
       bank + account             │
             │                   │
             ▼                   │
       Save bank_uuid             │
             │                   │
             └───────┐   ┌───────┘
                     ▼   │
               ZOSAVUTA BACKEND
                     │
              Calculate payout
              fee: 1.7% + MWK 700
                     │
                     ▼
              Submit payout
                     │
                     ▼
              PayChangu Bank
                     │
                     ▼
              Organizer Bank
```

------------------------------------------------------------------------

# 26. Important Note on API Documentation

PayChangu may change supported banks, UUIDs, payout requirements, API
fields, fees, or endpoint behavior.

Therefore, before production deployment, the implementation should be
checked against the current PayChangu developer documentation and the
platform's current merchant agreement.

The application's configuration should be designed so that PayChangu
changes can be accommodated without rewriting the entire payout system.

**Official PayChangu documentation:**

-   Get Banks: https://developer.paychangu.com/reference/get-banks
-   Bank Payout: https://developer.paychangu.com/reference/bank-payout
-   Bank Account / Payout Guide:
    https://developer.paychangu.com/docs/bank-account
-   Payout Details:
    https://developer.paychangu.com/reference/single-bank-payout-details
-   Webhooks: https://developer.paychangu.com/docs/webhooks
