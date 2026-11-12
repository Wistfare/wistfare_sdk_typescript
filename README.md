# Wistfare Node.js / TypeScript SDK

The dated collection client uses one merchant endpoint for mobile money and
hosted card checkout: `POST /v1/collections`, with `Wistfare-Version: 2026-11-12`.
Keep API keys and webhook secrets on your server.

```sh
npm install @wistfare/core @wistfare/payments
```

These source changes must be built and released before they are available in a
published package. Runtime requires Node.js 18+; building this repository uses
Node.js 22.12+ and npm workspaces.

## Configure a wallet key

Use the Wistfare business owner/admin key-management flow to create a key bound
to the receiving wallet. Request `payments.collect` to initiate and
`payments.read` to read collections. Use a separate key with
`payments.webhooks.manage` for endpoint management where practical. Key creation
is an authenticated owner/admin operation, not a method provided by this SDK.

Staging uses `wf_test_*` with `https://staging.payments.wistfare.com`; production
uses `wf_live_*` with `https://payments.wistfare.com`. Set `baseUrl` explicitly.
Changing the key prefix does not switch hosts. Staging has its own database and
wallet deployment; these keys do not create test/live sub-balances in one wallet.

```ts
import { Wistfare } from '@wistfare/core';
import { PaymentsClient } from '@wistfare/payments';

const payments = new PaymentsClient(new Wistfare({
  apiKey: process.env.WISTFARE_API_KEY!,
  baseUrl: 'https://staging.payments.wistfare.com',
}));

const collection = await payments.collections.create({
  walletId: process.env.WISTFARE_RWF_WALLET_ID!,
  paymentMethod: 'mtn_momo', // or airtel_money
  amount: '500',
  currency: 'RWF',
  merchantReference: 'order-42',
  payer: { phone: '250780000001' }, // use the provider-approved sandbox number
}, { idempotencyKey: 'order-42:payment-attempt-1' });

console.log(collection.id, collection.status);
```

The API derives the business and environment from the key. `walletId` must match
its bound wallet. Store the idempotency key before sending; reuse it with the
same request after a timeout. A changed request with that key returns HTTP409.
Mobile money phones must use Rwanda international format: MTN `25078…` or
`25079…`, Airtel `25072…` or `25073…`. Payer names allow at most 100 Unicode
characters for mobile money and 150 for card.
Automatic SDK mutation retries require an idempotency key and preserve the
original body bytes. Collection creation uses a 210-second timeout per attempt,
covering the server's 190-second initiation and 200-second gateway budgets;
other requests retain the client's 30-second default. A collection call can
explicitly override this with `{ idempotencyKey, timeout: milliseconds }`.
After any timeout, keep the original idempotency key when recovering. Endpoint
creation/secret rotation are not automatically retried after an ambiguous result. HTTP redirects are rejected.

## Hosted card checkout

```ts
const card = await payments.collections.create({
  walletId: process.env.WISTFARE_USD_WALLET_ID!,
  paymentMethod: 'card',
  amount: '1.00',
  currency: 'USD',
  payer: { name: 'Sandbox Payer', email: 'payer@example.com', phone: '250780000001' },
  // Optional: origin must already be registered for this wallet.
  // returnUrl: 'https://merchant.example/payment-return',
}, { idempotencyKey: 'order-43:payment-attempt-1' });

if (card.nextAction?.type === 'redirect') {
  // Send this hosted URL to the customer's browser; never collect card details.
  console.log(card.nextAction.url);
}
```

Use the key bound to the USD wallet for this request. Current mobile money
supports RWF; current card integration supports USD and is sandbox-gated.
Production card availability requires provider/configuration readiness. A single
business can own both currency wallets. A wallet's currency must match the
collection; Wistfare does not silently convert currencies.

POST may return HTTP202 with `processing` and `nextAction: null` when provider
initiation is uncertain. Keep that collection ID; do not submit another attempt
just because the checkout URL is not ready. A later GET can return the same
collection with its checkout URL. GET reads stored Wistfare state.

```ts
const latest = await payments.collections.get(collection.id);
const page = await payments.collections.list({ status: 'completed', page: 1, perPage: 20 });
```

All monetary fields are decimal strings. Quoted fields such as `feeAmount` and
`amountCharged` may be `null` before pricing is known; null is not zero.
`completed` means wallet credit has completed. `processing` includes uncertain
provider outcomes; `pending` requires customer action. Other states are
`failed`, `cancelled`, `expired` and `requires_review`. Do not initiate a
replacement for an uncertain or review state.

## Register and verify merchant notifications

Configure a publicly reachable HTTPS receiver on port443. One pending/active
endpoint is allowed per wallet and environment; each has its own signing secret.
The following calls need a wallet key with `payments.webhooks.manage`.

```ts
const endpoint = await payments.webhookEndpoints.create({
  url: 'https://merchant.example/wistfare/webhook',
});
// Save endpoint.signingSecret in your secret manager; it is returned once.
// Install the receiver below using that secret, then:
await payments.webhookEndpoints.verify(endpoint.id);
```

Verification sends a signed `webhook.endpoint_verification` event. The receiver
must verify the signature and return HTTP2xx JSON containing the exact challenge.
Until verification succeeds, the endpoint receives no collection notifications.
Register and verify it before taking payments; historical completions are not
backfilled automatically.

Example receiver using Express (install Express separately). `inbox` below is
your durable event store/queue, not an SDK-provided database:

```ts
import express from 'express';
import { verifyCollectionWebhook, type CollectionWebhookEvent } from '@wistfare/payments';

declare const inbox: { storeVerifiedEvent(event: CollectionWebhookEvent): Promise<void> };
const app = express();
// Register this route before any express.json() middleware.
app.post('/wistfare/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  let event;
  try {
    event = verifyCollectionWebhook(req.body, req.headers, process.env.WISTFARE_WEBHOOK_SECRET!, {
      expectedWalletId: process.env.WISTFARE_WALLET_ID!,
      expectedEnvironment: 'test',
      expectedEndpointId: process.env.WISTFARE_ENDPOINT_ID!,
    });
  } catch {
    res.sendStatus(400);
    return;
  }
  if (event.type === 'webhook.endpoint_verification') {
    res.json({ challenge: event.data.challenge });
    return;
  }
  try {
    await inbox.storeVerifiedEvent(event); // Atomic event-ID deduplication, durable commit.
    res.sendStatus(204);
  } catch {
    res.sendStatus(503); // Wistfare retries; never acknowledge an unpersisted event.
  }
});
```

The verifier authenticates the raw body, delivery ID and timestamp with HMAC
SHA256, checks a five-minute clock window, and validates the envelope's dated
contract and scope. Keep the machine clock synchronized. Never reserialize JSON
before checking the signature. Use the secret string as returned, not hex-decoded
bytes. `verifyCollectionWebhook` performs no persistence or business side effects.

Collection events are `collection.completed`, `.failed`, `.cancelled`, `.expired`
and `.requires_review`. Their `data` is the same `Collection` snapshot as GET.
Delivery is at least once: durably deduplicate by `event.id`, and apply
`event.data.version` only if newer than your stored version. Retried events can
arrive after later versions. Make order fulfillment idempotent by collection ID
as well. Refund/dispute merchant notification contracts are not included here.

## Rotation, delivery history and recovery

```ts
const rotated = await payments.webhookEndpoints.rotate(endpoint.id);
// Securely install rotated.signingSecret. Both signatures are sent until
// rotated.previousValidUntil (one hour); another rotation waits for that overlap.

const failed = await payments.webhookEndpoints.deliveries(endpoint.id, { status: 'failed', limit: 25 });
if (failed.nextCursor) {
  await payments.webhookEndpoints.deliveries(endpoint.id, { status: 'failed', limit: 25, before: failed.nextCursor });
}
// After fixing a receiver error, replay a failed delivery with the same IDs/body:
// await payments.webhookEndpoints.replay(endpoint.id, failed.data[0].id);

// Disable cancels queued work. A request already in flight may still arrive.
// await payments.webhookEndpoints.disable(endpoint.id);
```

Automatic retries use exponential backoff and jitter for24hours, capped at one
hour between attempts. Delivery history exposes status/attempts/HTTP status,
without raw receiver responses or secrets. Replay is limited to failed events
at the active endpoint. GET/list never return signing secrets. Endpoint URLs
are immutable: disable and register/verify a replacement to change them.

If a creation response is lost, list endpoints to recover its ID; if the secret
was lost, rotate it. If a rotation response is lost, the old installed secret
continues to work during the one-hour overlap; recover through a later rotation,
or disable/recreate and configure the new endpoint. Disabling cancels queued
events and does not migrate their history to the replacement endpoint.

## Compatibility and development

Existing `initiateCollection`/`listCollections` methods are retained for legacy
unversioned callers. New integrations should use `payments.collections` and the
dated event verifier. Other packages provide their existing wallet/business
read operations and legacy payment helpers.

```sh
npm ci
npm run build
npm test
npm run typecheck
npm audit
```
