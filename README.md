# hospitable-skill

A skill for AI coding agents to interact with the [Hospitable.com Public API (v2)](https://developer.hospitable.com/docs/public-api-docs/d862b3ee512e6-introduction).

Provides typed API client, canonical TypeScript types, integration rules, and step-by-step workflow examples — everything an AI agent needs to reliably manage vacation rental properties, reservations, calendars, messaging, reviews, and more.

## Available Skills

### hospitable-api

Full integration skill for the Hospitable Public API v2. Covers all official endpoints with a ready-to-use TypeScript client and type definitions.

**Use when:**

- "Connect to Hospitable"
- "Fetch reservations from Hospitable"
- "Block calendar dates on a property"
- "Send a message to a guest"
- "Get all reviews for my properties"
- "List payouts from Hospitable"
- "Set WiFi password shortcode"
- "Create a manual reservation"
- "Generate a quote for a stay"

**Resources covered:**

| Resource              | Capabilities                                                |
| --------------------- | ----------------------------------------------------------- |
| Properties            | List, search, get, images, tags, quotes, iCal imports       |
| Calendar              | Read days with availability reason, update pricing/blocking |
| Inquiries             | List, get, send messages                                    |
| Reservations          | List, get, create/update/cancel manual, messaging           |
| Conversations         | Inbox listing                                               |
| Transactions          | List and retrieve payment events                            |
| Payouts               | List and retrieve host disbursements                        |
| Reviews               | List, get, respond publicly                                 |
| Enrichable Shortcodes | List, get, set (WiFi, door codes, etc.)                     |
| User & Billing        | Get authenticated user info and plan details                |
| Webhooks              | 11 real-time event topics                                   |

**Key features:**

- Automatic pagination — `listAll()` follows `links.next` transparently
- Rate limit detection — throws with reset timestamp on 429
- Idempotency enforcement — mutating calls require a UUID key
- `calendar_restricted` guard — detects properties that block API updates
- Full TypeScript types generated from the official OpenAPI spec

## Installation

```bash
npx skills add your-username/hospitable-skill
```

Or copy the `hospitable-api/` folder into your project's `.agent/skills/` directory.

## Usage

Once installed, the agent will automatically use this skill when relevant tasks are detected.

**Example prompts:**

```
List all accepted reservations this month with guest details
```

```
Block December 24–25 on property abc-123
```

```
Send a check-in message to reservation xyz-456
```

```
Set the wifi_password shortcode to "BeachHouse2025" for property abc-123
```

```
Get all 5-star reviews and their guests
```

## Skill Structure

```
hospitable-skill/
└── hospitable-api/
    ├── SKILL.md    ← Agent instructions, endpoint reference, workflow examples
    ├── types.ts    ← Canonical TypeScript types (OpenAPI spec ground truth)
    ├── client.ts   ← Typed HTTP client with pagination, rate limits, idempotency
    └── rules.md    ← Coding rules and gotchas for correct API usage
```

Each file has a distinct role:

- **`SKILL.md`** — The agent's primary instruction manual. Read this first. Contains trigger phrases, full endpoint reference, include tables, and copy-paste workflow examples.
- **`types.ts`** — All TypeScript interfaces and enums derived from the official OpenAPI spec. Never define API types inline — always import from here.
- **`client.ts`** — The only place HTTP calls should originate. Handles auth, rate limits, pagination, and idempotency automatically.
- **`rules.md`** — 12 concise rules covering the most common pitfalls: `status.reason` shape, `calendar_restricted` guard, price units, guest count field names, OAuth scopes, and rate limits.

## Setup

Add your Hospitable Personal Access Token to `.env`:

```env
HOSPITABLE_ACCESS_TOKEN=your_token_here
```

Generate a token at [my.hospitable.com](https://my.hospitable.com) → Apps → API access → Access tokens.

Then use the client in your code:

```typescript
import { createClient } from "./hospitable-api/client";
import type { Reservation } from "./hospitable-api/types";
import { randomUUID } from "crypto";

const client = createClient(process.env.HOSPITABLE_ACCESS_TOKEN!);

// List all accepted reservations with guest info
const reservations = await client.reservations.listAll({
  status: "accepted",
  include: "guest,financials",
});

// Block calendar dates
await client.calendar.update(
  "<property-uuid>",
  [
    { date: "2025-12-24", available: false },
    { date: "2025-12-25", available: false },
  ],
  randomUUID(),
);

// Send a message to a guest
await client.reservations.sendMessage(
  "<reservation-uuid>",
  { body: "Your check-in code is 1234!" },
  randomUUID(),
);
```

## Important Notes

- Properties with `calendar_restricted: true` **cannot** have their calendar updated via the API — always check this field before calling `calendar.update()`.
- The `message:write` OAuth scope requires explicit approval from Hospitable. Contact `team-platform@hospitable.com` to request it.
- Calendar prices use **base currency units**: `15000` = $150.00.
- `reservation.reservation_status.current.category` is the correct way to check reservation status — the deprecated `reservation.status` string field should not be used.
- `GET /properties/search` requires a self-hosted Direct booking site and is not available on all plans.

## API Reference

| Base URL                               | Auth                            |
| -------------------------------------- | ------------------------------- |
| `https://public.api.hospitable.com/v2` | `Authorization: Bearer <token>` |

Full endpoint reference is in [`hospitable-api/SKILL.md`](./hospitable-api/SKILL.md).

## Credits

- **[hospitable-python](https://github.com/keithah/hospitable-python)** by [@keithah](https://github.com/keithah) — Python SDK that served as a reference for response schemas, model field names, and endpoint behaviour used in this skill's `types.ts` and `client.ts`.

## References

- [Hospitable Public API — Introduction](https://developer.hospitable.com/docs/public-api-docs/d862b3ee512e6-introduction)
- [Authentication](https://developer.hospitable.com/docs/public-api-docs/xpyjv51qyelmp-authentication)
- [Pagination](https://developer.hospitable.com/docs/public-api-docs/dbc4b7ed7eb1b-pagination)
- [Including Resources](https://developer.hospitable.com/docs/public-api-docs/465fd4d45e4b3-including-resources)
- [Enums & Statuses](https://developer.hospitable.com/docs/public-api-docs/g5sgfn6j7b0aw-reservation-statuses)
- [Calendar Restriction](https://developer.hospitable.com/docs/public-api-docs/hriol5oneuh9u-calendar-restriction)
- [Webhooks](https://developer.hospitable.com/docs/public-api-docs/k4ctofvqu0w8g-hospitable-api-v2-webhooks)
- [OpenAPI Spec (community)](https://github.com/keithah/hospitable-python/blob/main/openapi.yaml)

## License

MIT
