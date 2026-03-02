---
name: hospitable-api
description: >
  Instructions for integrating with the Hospitable.com Public API (v2).
  Use this skill when the user asks to work with Hospitable properties,
  reservations, calendars, guests, messaging, reviews, payouts, transactions,
  inquiries, enrichable shortcodes, or webhooks.
  Trigger phrases: "connect to Hospitable", "fetch reservations",
  "block calendar dates", "send message to guest", "get reviews",
  "list payouts", "get transactions", "set wifi password shortcode".
---

# Hospitable.com Public API (v2) Skill

## 📁 Source Files — Read These First

Before writing any code, the agent MUST read the following files:

| File                       | Purpose                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| [`types.ts`](./types.ts)   | All TypeScript interfaces and enums for API entities                  |
| [`client.ts`](./client.ts) | Ready-to-use typed HTTP client — always use this, never raw `fetch()` |

**Agent rules**:

- Do NOT redefine types. Import from `types.ts`.
- Do NOT write custom fetch wrappers. Use `client.ts`.
- Do NOT manually implement pagination loops. Use the built-in `listAll()` helpers.
- Always pass `crypto.randomUUID()` as the `idempotencyKey` for all `POST`/`PATCH`/`PUT` calls.

---

## 🔑 Authentication & Setup

- **Base URL**: `https://public.api.hospitable.com/v2`
- **Auth**: OAuth 2.0 or Personal Access Token (PAT)
- **Required headers on every request**:
  ```http
  Authorization: Bearer <ACCESS_TOKEN>
  Accept: application/json
  Content-Type: application/json
  ```
- **Environment variable**: `HOSPITABLE_ACCESS_TOKEN` in `.env`
- **Timezone**: All dates are **UTC** / ISO 8601
- **IDs**: All entity IDs are **UUIDs**, not integers

---

## 📦 Pagination

All list endpoints return:

```json
{
  "data": [...],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 25, "total": 98 },
  "links": { "next": "https://...", "prev": null }
}
```

- Always read from `.data` — never assume a flat array
- Use `listAll()` helpers in `client.ts` to auto-paginate (`per_page=100`)
- Single-resource endpoints return `{ "data": { ... } }`

See `types.ts` → `PaginatedResponse<T>`, `SingleResponse<T>`

---

## 🔗 Including Related Resources (`?include=`)

Embed related entities in one call to avoid N+1 requests.

| Resource        | Available includes                                                                       |
| --------------- | ---------------------------------------------------------------------------------------- |
| `properties`    | `listings`, `images`, `tags`, `user`                                                     |
| `reservations`  | `guest`, `listing`, `property`, `checkins`, `transactions`, `conversation`, `financials` |
| `inquiries`     | `property`, `guest`                                                                      |
| `conversations` | `guest`, `reservation`                                                                   |
| `reviews`       | `reservation`, `guest`                                                                   |

`client.ts` methods accept an `include: string[]` parameter — pass the desired relationships.

---

## 🛑 Rate Limits & Idempotency

**Rate Limiting** — inspect response headers:

- `X-RateLimit-Remaining`: requests left; **stop if 0**
- `X-RateLimit-Reset`: Unix timestamp when window resets
- Client throws automatically on `429`

**Idempotency** — required on all `POST`, `PATCH`, `PUT`:

```typescript
import { randomUUID } from "crypto";
client.reservations.create(payload, randomUUID());
```

---

## 🛠️ Complete Resource Reference

### 1. User

See `types.ts` → `User`, `BillingInfo`

```
GET /v2/user?include=billing    → SingleResponse<User>
```

### 2. Properties

See `types.ts` → `Property`, `Address`, `Capacity`, `PropertyImage`, `Listing`, `Quote`

```
GET  /v2/properties                          → PaginatedResponse<Property>
GET  /v2/properties/search?q=...             → PaginatedResponse<Property>
GET  /v2/properties/{uuid}                   → SingleResponse<Property>
GET  /v2/properties/{uuid}/images            → PaginatedResponse<PropertyImage>
GET  /v2/properties/{uuid}/quote?check_in=...&check_out=...&guests=...
POST /v2/properties/{uuid}/tags              body: { tag: string }
```

### 3. Calendar

See `types.ts` → `CalendarDay`, `CalendarUpdateItem`, `CalendarDayStatus`

```
GET   /v2/properties/{uuid}/calendar?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
PATCH /v2/properties/{uuid}/calendar         body: { days: CalendarUpdateItem[] }
```

Per-day fields: `status` (`available`|`unavailable`|`booked`), `price`, `min_stay`, `check_in_allowed`, `check_out_allowed`

### 4. Inquiries

Pre-booking inquiries. See `types.ts` → `Inquiry`, `InquiryStatus`

```
GET  /v2/inquiries               → PaginatedResponse<Inquiry>
GET  /v2/inquiries/{uuid}        → SingleResponse<Inquiry>
POST /v2/inquiries/{uuid}/messages
```

Statuses: `pending`, `pre_approved`, `declined`, `expired`, `withdrawn`

### 5. Reservations

See `types.ts` → `Reservation`, `ReservationStatus`, `Platform`, `GuestCounts`, `ReservationFinancials`

```
GET    /v2/reservations               → PaginatedResponse<Reservation>
GET    /v2/reservations/{uuid}        → SingleResponse<Reservation>
POST   /v2/reservations               Create manual reservation
PATCH  /v2/reservations/{uuid}        Update manual reservation
POST   /v2/reservations/{uuid}/cancel Cancel manual reservation
```

**Status lifecycle**:
`inquiry` → `request` → `pending verification` → `accepted`
(may also become: `cancelled`, `declined`, `withdrawn`, `expired`, `checkpoint`, `request for payment`)

**Financials** (use `?include=financials`):
`accommodation`, `cleaning_fee`, `linen_fee`, `management_fee`, `resort_fee`, `pet_fee`, `pass_through_taxes`, `other_fees[]{amount,label}`

**Common list filters**: `property_id`, `status`, `check_in_start`, `check_in_end`

### 6. Messaging

See `types.ts` → `Message`, `MessageAttachment`, `SendMessagePayload`

```
GET  /v2/reservations/{uuid}/messages    → PaginatedResponse<Message>
POST /v2/reservations/{uuid}/messages    body: { body: string }
POST /v2/inquiries/{uuid}/messages       body: { body: string }
```

Message fields: `body`, `content_type`, `sender_type` (host/guest/system), `attachments[]{type, url}`

### 7. Conversations (Inbox)

See `types.ts` → `Conversation`

```
GET /v2/conversations    → PaginatedResponse<Conversation>
```

Note: To _send_ messages, use reservation or inquiry messaging endpoints above.

### 8. Transactions

Booking-level payment events. See `types.ts` → `Transaction`

```
GET /v2/transactions          → PaginatedResponse<Transaction>
GET /v2/transactions/{uuid}   → SingleResponse<Transaction>
```

### 9. Payouts

Host disbursements. See `types.ts` → `Payout`

```
GET /v2/payouts          → PaginatedResponse<Payout>
GET /v2/payouts/{uuid}   → SingleResponse<Payout>
```

### 10. Reviews

See `types.ts` → `Review`, `ReviewRatings`, `ReviewPublic`, `ReviewPrivate`, `RespondToReviewPayload`

```
GET  /v2/reviews               → PaginatedResponse<Review>
GET  /v2/reviews/{uuid}        → SingleResponse<Review>
POST /v2/reviews/{uuid}/response   body: { response: string }
```

Ratings (1–5): `cleanliness`, `communication`, `check_in`, `accuracy`, `location`, `value`

### 11. Enrichable Shortcodes

Dynamic placeholders for automated messages (e.g. `{{wifi_password}}`).
See `types.ts` → `EnrichableShortcode`, `SetEnrichableShortcodePayload`

```
GET /v2/shortcodes                 → PaginatedResponse<EnrichableShortcode>
GET /v2/shortcodes/{key}           → SingleResponse<EnrichableShortcode>
PUT /v2/shortcodes/{key}           body: { value: string }
```

Pass `?property_id={uuid}` to scope to a specific property; omit for account-level default.

---

## 🪝 Webhooks

All webhook topics in `WebhookTopic`:

| Topic                        | Triggered when                                  |
| ---------------------------- | ----------------------------------------------- |
| `reservation.created`        | New booking received                            |
| `reservation.changed`        | Booking details updated                         |
| `reservation.status_changed` | Status transition (e.g. `pending` → `accepted`) |
| `message.create`             | New message from host or guest                  |
| `message.updated`            | Message edited                                  |
| `inquiry.created`            | New pre-booking inquiry                         |
| `review.created`             | Guest leaves a review                           |
| `property.created`           | New property added                              |
| `property.deleted`           | Property removed                                |
| `property.merged`            | Two properties merged into one                  |
| `integration.disconnected`   | OTA channel integration broke                   |

**Envelope** (`types.ts` → `WebhookEvent<T>`):

```json
{ "id": "<ULID>", "action": "reservation.status_changed", "data": {...}, "version": "1.0", "created": "..." }
```

**Security** (`types.ts` → `WebhookSecurityInfo`):

- Verify the `Signature` header on every request
- Whitelist inbound IP `38.80.170.0/24`

---

## 👨‍💻 Workflow Examples

### List all accepted reservations with financials

```typescript
import { createClient } from "./client";
const client = createClient(process.env.HOSPITABLE_ACCESS_TOKEN!);

const reservations = await client.reservations.listAll({
  status: "accepted",
  include: "guest,financials",
});
for (const r of reservations) {
  console.log(r.guest?.first_name, r.financials?.total, r.financials?.currency);
}
```

### Create a manual reservation

```typescript
import { createClient } from "./client";
import { randomUUID } from "crypto";
const client = createClient(process.env.HOSPITABLE_ACCESS_TOKEN!);

const { data } = await client.reservations.create(
  {
    property_id: "<uuid>",
    check_in: "2025-07-01",
    check_out: "2025-07-07",
    guests_count: 2,
    guest: { first_name: "Jane", last_name: "Doe", email: "jane@example.com" },
    total_price: 1200,
    currency: "USD",
  },
  randomUUID(),
);
console.log(data.id, data.status); // → "accepted"
```

### Block calendar dates

```typescript
await client.calendar.update(
  "<property-uuid>",
  [
    { date: "2025-12-24", status: "unavailable" },
    { date: "2025-12-25", status: "unavailable" },
  ],
  randomUUID(),
);
```

### Respond to a guest review

```typescript
await client.reviews.respond(
  "<review-uuid>",
  {
    response:
      "Thank you for your kind words! We look forward to hosting you again.",
  },
  randomUUID(),
);
```

### Set a property-level WiFi shortcode

```typescript
await client.shortcodes.set(
  "wifi_password",
  { value: "BeachHouse2025!" },
  randomUUID(),
  "<property-uuid>",
);
```

### Handle incoming webhook

```typescript
import type { WebhookEvent, Reservation } from "./types";

async function handleWebhook(event: WebhookEvent<Reservation>) {
  if (event.action === "reservation.status_changed") {
    console.log("Status changed:", event.data.id, "→", event.data.status);
  }
  if (event.action === "property.merged") {
    // event.data contains the surviving property
  }
}
```

---

## 🔗 Official Documentation

- Introduction: https://developer.hospitable.com/docs/public-api-docs/d862b3ee512e6-introduction
- Authentication: https://developer.hospitable.com/docs/public-api-docs/xpyjv51qyelmp-authentication
- Enums & Statuses: https://developer.hospitable.com/docs/public-api-docs/g5sgfn6j7b0aw-reservation-statuses
- Calendar Restriction: https://developer.hospitable.com/docs/public-api-docs/hriol5oneuh9u-calendar-restriction
- Including Resources: https://developer.hospitable.com/docs/public-api-docs/465fd4d45e4b3-including-resources
- Webhooks: https://developer.hospitable.com/docs/public-api-docs/k4ctofvqu0w8g-hospitable-api-v2-webhooks
