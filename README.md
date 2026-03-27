# Wistfare Node.js / TypeScript SDK

Official TypeScript SDK for the [Wistfare](https://wistfare.com) API. Build payments, wallets, and business management into your application.

## Installation

Install only the packages you need:

```bash
npm install @wistfare/core @wistfare/payments @wistfare/wallet @wistfare/business
```

| Package | Description |
|---------|-------------|
| `@wistfare/core` | HTTP client, authentication, error handling, pagination |
| `@wistfare/payments` | Collections, disbursements, fee management, payment requests |
| `@wistfare/wallet` | Balances, transfers, deposits, withdrawals, wallet members |
| `@wistfare/business` | Business management, staff, teams, API keys |

## Quick Start

```typescript
import { Wistfare } from "@wistfare/core";
import { PaymentsClient } from "@wistfare/payments";

const wf = new Wistfare({ apiKey: "wf_live_xxx" });
const payments = new PaymentsClient(wf);

// Collect a payment via MTN Mobile Money
const collection = await payments.initiateCollection({
  businessId: "biz_123",
  walletId: "wal_456",
  customerPhone: "250788000000",
  amount: "10000",
  paymentMethod: "mtn",
  currency: "RWF",
  description: "Invoice #1234",
});

console.log(collection.transactionId, collection.status);
```

## Configuration

```typescript
const wf = new Wistfare({
  apiKey: "wf_live_xxx",       // Required — wf_live_* or wf_test_*
  baseUrl: "https://...",       // Optional — defaults to https://api-production.wistfare.com
  timeout: 30000,               // Optional — request timeout in ms (default: 30s)
  maxRetries: 2,                // Optional — automatic retries on 5xx/network errors
});
```

### Test Mode

Use a `wf_test_*` API key for sandbox testing. Check with `wf.isTestMode`.

## Payments

```typescript
import { PaymentsClient } from "@wistfare/payments";

const payments = new PaymentsClient(wf);

// Initiate a mobile money collection
const result = await payments.initiateCollection({
  businessId: "biz_123",
  walletId: "wal_456",
  customerPhone: "250788000000",
  amount: "5000",
  paymentMethod: "mtn",  // "mtn" or "airtel_Rw"
  currency: "RWF",
});

// Create a payment request (QR code / payment link)
const paymentRequest = await payments.createPaymentRequest({
  businessId: "biz_123",
  walletId: "wal_456",
  requestType: "one_time",
  amount: "5000",
  currency: "RWF",
  description: "Table 4 — Lunch",
});
console.log(paymentRequest.shortCode); // "PAY-A1B2C3"
console.log(paymentRequest.qrData);    // QR data string

// Calculate fees
const fee = await payments.calculateFee({
  businessId: "biz_123",
  amount: "10000",
  transactionType: "collection",
});
console.log(fee.feeAmount);  // "250"
console.log(fee.netAmount);  // "9750"

// Initiate a disbursement (payout)
const payout = await payments.initiateDisbursement({
  businessId: "biz_123",
  walletId: "wal_456",
  amount: "5000",
  destinationType: "mobile_money",
  destinationRef: "250788000000",
  idempotencyKey: "disb_unique_123",
});

// List transactions
const txns = await payments.listTransactions("biz_123", { page: 1, perPage: 20 });
```

### All Payments Methods

| Method | Description |
|--------|-------------|
| `setFeeConfig(params)` | Configure fees for a business |
| `getFeeConfig(businessId, transactionType)` | Get fee configuration |
| `listFeeConfigs(businessId, pagination?)` | List all fee configs |
| `deleteFeeConfig(feeConfigId)` | Delete a fee config |
| `calculateFee(params)` | Calculate fee for an amount |
| `createPaymentRequest(params)` | Create a QR / payment link |
| `getPaymentRequest(requestId)` | Get a payment request |
| `listPaymentRequests(businessId, pagination?)` | List payment requests |
| `cancelPaymentRequest(requestId)` | Cancel a payment request |
| `initiateCollection(params)` | Charge a customer via mobile money |
| `getTransaction(transactionId)` | Get a transaction |
| `listTransactions(businessId, filters?)` | List transactions |
| `initiateDisbursement(params)` | Payout to mobile money |
| `getDisbursement(disbursementId)` | Get a disbursement |
| `listDisbursements(businessId, pagination?)` | List disbursements |

## Wallet

```typescript
import { WalletClient } from "@wistfare/wallet";

const wallet = new WalletClient(wf);

// Create a wallet
const w = await wallet.create({ userId: "usr_123", walletType: "personal" });

// Check balance
const balance = await wallet.getBalance("wal_456");
console.log(balance.availableBalance, balance.currency); // "15000" "RWF"

// Transfer between wallets
const transfer = await wallet.transfer({
  fromWalletId: "wal_456",
  toWalletId: "wal_789",
  amount: "5000",
  description: "Split dinner",
  idempotencyKey: "txn_unique_123",
});

// Deposit (fund wallet via mobile money)
const deposit = await wallet.initiateDeposit({
  walletId: "wal_456",
  amount: "10000",
  paymentMethod: "mtn",
  phoneNumber: "250788000000",
});

// Withdraw (cash out to mobile money)
const withdrawal = await wallet.initiateWithdrawal({
  walletId: "wal_456",
  amount: "5000",
  destinationType: "mobile_money",
  destinationRef: "250788000000",
});
```

### Shared Wallet RBAC

```typescript
// Create a role
const role = await wallet.createRole({
  walletId: "wal_456",
  name: "viewer",
  permissions: ["balance:read", "transactions:read"],
});

// Add a member
await wallet.addMember({ walletId: "wal_456", userId: "usr_789", roleId: role.id });

// List members
const members = await wallet.listMembers("wal_456");
```

## Business

```typescript
import { BusinessClient } from "@wistfare/business";

const business = new BusinessClient(wf);

// Create a business
const biz = await business.create({
  name: "Kigali Coffee House",
  businessType: "restaurant",
  category: "food_beverage",
});

// Invite staff
const invitation = await business.inviteStaff({
  businessId: biz.id,
  email: "manager@example.com",
  role: "manager",
});

// Create a team
const team = await business.createTeam({
  businessId: biz.id,
  name: "Kitchen Staff",
});

// Create an API key
const apiKey = await business.createAPIKey({
  businessId: biz.id,
  name: "Production Key",
  environment: "live",
});
console.log(apiKey.rawKey); // Only shown once!
```

## Error Handling

All SDK errors extend `WistfareError`:

```typescript
import { WistfareError, AuthenticationError, NotFoundError } from "@wistfare/core";

try {
  await payments.getTransaction("txn_nonexistent");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Transaction not found");
  } else if (err instanceof AuthenticationError) {
    console.log("Bad API key");
  } else if (err instanceof WistfareError) {
    console.log(err.message, err.status, err.code, err.requestId);
  }
}
```

| Error Class | HTTP Status | Code |
|-------------|-------------|------|
| `AuthenticationError` | 401 | `authentication_error` |
| `PermissionError` | 403 | `permission_error` |
| `NotFoundError` | 404 | `not_found` |
| `ValidationError` | 400/422 | `validation_error` |
| `RateLimitError` | 429 | `rate_limit` |
| `InternalError` | 500 | `internal_error` |

## Pagination

List methods return a standard paginated response:

```typescript
const result = await payments.listTransactions("biz_123", { page: 1, perPage: 20 });

console.log(result.data);    // Array of items
console.log(result.total);   // Total count
console.log(result.page);    // Current page
console.log(result.perPage); // Items per page
console.log(result.hasMore); // More pages available?
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5.0+ (optional but recommended)

## License

MIT
