# Hospitable API Integration Rules

Rules for any AI agent or developer working with the Hospitable Public API (v2)
in this codebase. These rules override general conventions where applicable.

---

## 1. Always Use the Canonical Files

| Do                                      | Don't                                     |
| --------------------------------------- | ----------------------------------------- |
| Import types from `./types.ts`          | Define inline interfaces for API entities |
| Use `createClient()` from `./client.ts` | Write raw `fetch()` calls                 |
| Use `client.resource.listAll()`         | Write manual `while (nextPage)` loops     |

```ts
// ✅ Correct
import { createClient } from "./client";
import type { Reservation, CalendarDay } from "./types";

// ❌ Wrong
const res = await fetch("https://public.api.hospitable.com/v2/reservations", { ... });
```

---

## 2. Calendar: `status.reason` Is the Source of Truth

Calendar days have a **nested status object**, not a plain string.

```ts
// ✅ Correct
if (day.status.reason === "BLOCKED") { ... }
if (day.status.reason === "AVAILABLE") { ... }

// ❌ Wrong — status is not a string
if (day.status === "unavailable") { ... }
```

| `reason`      | Meaning                               |
| ------------- | ------------------------------------- |
| `"AVAILABLE"` | Open for booking                      |
| `"RESERVED"`  | Has an active reservation             |
| `"BLOCKED"`   | Blocked (check `source_type` for why) |

`source_type` tells you **why** it's blocked:

- `"USER"` — host blocked it manually
- `"RESERVATION"` — occupied by a booking
- `"TURNOVER_DAY"` — gap day between stays
- `"AVAILABILITY_WINDOW"` — outside booking window
- `"PLATFORM"` / `"VENDOR"` — blocked by OTA channel

---

## 3. `calendar_restricted` Must Be Checked Before Updates

If `property.calendar_restricted === true`, the calendar **cannot** be updated
via the API. Always check before calling `client.calendar.update()`.

```ts
const { data: property } = await client.properties.get(propertyId);
if (property.calendar_restricted) {
  throw new Error("Calendar is restricted. Update blocked.");
}
await client.calendar.update(propertyId, days, randomUUID());
```

---

## 4. Reservation Status Is an Object, Not a String

`reservation.reservation_status` is a `ReservationStatusHistory` object.
The deprecated `reservation.status` (plain string) should not be used.

```ts
// ✅ Correct
const { category, sub_category } = reservation.reservation_status.current;
const history = reservation.reservation_status.history; // with changed_at

// ❌ Wrong — deprecated field
const s = reservation.status;
```

| `category`     | `sub_category` examples                                        |
| -------------- | -------------------------------------------------------------- |
| `request`      | `request to book`, `awaiting approval`, `pending verification` |
| `accepted`     | `accepted`                                                     |
| `cancelled`    | `withdrawn`, `expired`, `voided`                               |
| `not accepted` | `declined`                                                     |
| `checkpoint`   | `request for payment`, `checkpoint`                            |

---

## 5. Idempotency Keys Are Mandatory for Writes

Every `POST`, `PATCH`, and `PUT` must pass a unique idempotency key.
The `client.ts` enforces this as a required parameter.

```ts
import { randomUUID } from "crypto";

// ✅ Always generate fresh UUIDs per call
await client.reservations.sendMessage(id, payload, randomUUID());
await client.calendar.update(id, days, randomUUID());
```

---

## 6. OAuth Scopes — Required per Operation

| Scope              | Used for                                         |
| ------------------ | ------------------------------------------------ |
| `property:read`    | List/get properties and calendar                 |
| `calendar:read`    | Read calendar days                               |
| `calendar:write`   | Update calendar availability/pricing             |
| `reservation:read` | List/get reservations                            |
| `message:read`     | Read messages                                    |
| `message:write`    | Send messages (**requires Hospitable approval**) |
| `financials:read`  | Access `financials` include on reservations      |
| `listing:read`     | Access `listings` include on properties          |
| `reviews:read`     | Read reviews                                     |
| `reviews:write`    | Respond to reviews                               |
| `ical:write`       | Create/update iCal imports                       |
| `quote:write`      | Generate price quotes                            |

> Contact `team-platform@hospitable.com` to request `message:write` scope.

---

## 7. API Limits — Know Before You Call

| Operation                   | Limit                                                |
| --------------------------- | ---------------------------------------------------- |
| Calendar update (max dates) | 60 dates per request                                 |
| Calendar update (rate)      | 1,000 requests / minute                              |
| Message sending             | 2 per minute per reservation, 50 per 5 minutes total |
| Pagination max `per_page`   | 100                                                  |
| Calendar future range       | Up to 3 years ahead                                  |
| Property search date range  | Max 90 days                                          |

---

## 8. Guest Counts Field Names

`GuestCounts` uses `_count` suffixed fields (not `adults`, `children`, etc.).

```ts
// ✅ Correct
const { adult_count, child_count, infant_count, pet_count } =
  reservation.guests;

// ❌ Wrong
const { adults, children } = reservation.guests;
```

---

## 9. Price Amounts Are in Base Currency Units

Calendar prices use integer values representing the smallest unit (e.g. cents).

```ts
// $150.00 is stored as:
const price = { amount: 15000, currency: "USD", formatted: "$150.00" };

// When updating:
days: [{ date: "2025-07-01", price: { amount: 15000 } }];
```

---

## 10. iCal Imports Are One-Way and Delayed

- iCal feeds sync **every 20–60 minutes** (not real-time)
- They are **one-way**: Hospitable reads from them, but does NOT write back
- Only available when `?include=listings` is used on property endpoints
- Requires `ical:write` OAuth scope to create/update

---

## 11. Error Response Shape

```ts
// Standard API error (types.ts → HospitableApiError)
{
  status_code: 400,
  reason_phrase: "Invalid pagination parameter supplied.",
  message: "The given data was invalid.",
  errors: {
    "field_name": ["Validation message"]
  }
}
```

The `client.ts` automatically parses and throws these. Catch at the call site.

---

## 12. `Search Properties` Requires a Direct Site

`GET /properties/search` is only available if the account has a
**self-hosted Direct booking site** configured. It is not available on all plans.

---

## Source Files

| File                       | Role                                                  |
| -------------------------- | ----------------------------------------------------- |
| [`types.ts`](./types.ts)   | All TypeScript types — canonical source of truth      |
| [`client.ts`](./client.ts) | All API calls — never bypass this                     |
| [`SKILL.md`](./SKILL.md)   | Full skill guide with examples and endpoint reference |
