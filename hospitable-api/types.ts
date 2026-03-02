// Hospitable Public API v2 — Type Definitions
// Reference: https://developer.hospitable.com/docs/public-api-docs/d862b3ee512e6-introduction
//
// Agent: When working with the Hospitable API, import from this file.
// Do NOT define inline types — always reference these canonical definitions.

// ─── Shared Response Wrappers ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number; // max 100
    to: number;
    total: number;
  };
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

export interface SingleResponse<T> {
  data: T;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Distribution channel / platform a listing or reservation came from */
export type Platform =
  | "airbnb"
  | "homeaway" // VRBO
  | "booking" // Booking.com
  | "direct"
  | "manual"
  | string; // forward-compatible with future platforms

/** All possible reservation status categories */
export type ReservationStatusCategory =
  | "request"
  | "accepted"
  | "cancelled"
  | "not accepted"
  | "checkpoint"
  | "unknown";

/** Sub-category within a status category (platform-specific granularity) */
export type ReservationStatusSubCategory =
  | "pending verification"
  | "awaiting approval"
  | "request to book"
  | "request for payment"
  | "declined"
  | "withdrawn"
  | "expired"
  | "checkpoint"
  | "voided"
  | string; // platform may return additional values

/** Calendar day availability reason */
export type AvailabilityReason = "AVAILABLE" | "RESERVED" | "BLOCKED";

/** What caused the calendar day to be unavailable/blocked */
export type AvailabilitySourceType =
  | "USER" // Manually blocked by the host
  | "VENDOR" // Blocked by a 3rd party
  | "PLATFORM" // Blocked by the booking platform
  | "AVAILABILITY_WINDOW" // Outside the booking window
  | "TURNOVER_DAY" // Maintenance/turnover between stays
  | "ADVANCED_NOTICE" // Advance notice restriction
  | "UPSELL" // Held for upsell
  | "RESERVATION"; // Has an active reservation

/** Message source (how the message was sent) */
export type MessageSource =
  | "public_api"
  | "platform"
  | "automated"
  | "hospitable"
  | "AI";

/** Per-day calendar status string (used in update payloads) */
export type CalendarDayStatus = "available" | "unavailable" | "booked";

// ─── Address & Location ───────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  number?: string;
  street?: string;
  line1?: string;
  line2: string | null;
  city: string;
  state: string | null;
  zip: string | null;
  postcode?: string | null;
  country: string; // ISO 3166-1 alpha-2
  display?: string; // Human-readable full address
  coordinates: Coordinates | null;
}

// ─── Capacity ─────────────────────────────────────────────────────────────────

export interface Capacity {
  max: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
}

export interface RoomDetail {
  type: string; // e.g. "bedroom", "bathroom"
  quantity: number;
}

export interface HouseRules {
  pets_allowed: boolean;
  smoking_allowed: boolean;
  events_allowed: boolean | null;
}

export interface ParentChild {
  type: "parent" | "child";
  parent: string | null; // UUID of parent property
  children: string[] | null;
  siblings: string[] | null;
}

// ─── Guest Counts (per reservation) ──────────────────────────────────────────

export interface GuestCounts {
  total: number;
  adult_count: number;
  child_count: number;
  infant_count: number;
  pet_count: number;
}

// ─── Property Image ───────────────────────────────────────────────────────────

export interface PropertyImage {
  id: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

// ─── Property ─────────────────────────────────────────────────────────────────

export interface Property {
  id: string; // UUID
  name: string;
  public_name: string | null;
  picture: string | null; // Cover image URL
  type: string; // e.g. "entire_home", "private_room"
  property_type: string;
  room_type: string;
  timezone: string; // IANA tz, e.g. "America/New_York"
  listed: boolean;
  calendar_restricted: boolean; // If true, calendar CANNOT be updated via API
  address: Address;
  amenities: string[];
  capacity: Capacity;
  room_details: RoomDetail[];
  house_rules: HouseRules;
  description: string | null;
  summary: string | null;
  check_in: string | null; // Default check-in time, e.g. "15:00"
  check_out: string | null;
  currency: string; // ISO 4217
  tags: string[];
  parent_child: ParentChild | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Included relations (only present when ?include=... is used)
  listings?: Listing[];
  images?: PropertyImage[];
  ical_imports?: ICalImport[];
  user?: User;
}

// ─── Listing (channel-level) ───────────────────────────────────────────────────

export interface Listing {
  id: string;
  channel: Platform;
  channel_listing_id: string;
  name: string;
  active: boolean;
}

// ─── iCal Import ──────────────────────────────────────────────────────────────

/**
 * External iCal feed imported into a property's calendar.
 * Syncs one-way from platforms like Expedia, HipCamp, etc.
 * Hospitable auto-fetches every 20–60 minutes.
 * Requires `ical:write` OAuth scope to create/update.
 */
export interface ICalImport {
  id: string;
  url: string;
  name: string | null;
  last_sync_at: string | null; // ISO 8601 — null if never synced
  disconnected_at: string | null; // ISO 8601 — null if still connected
  created_at: string;
}

export interface CreateICalImportPayload {
  url: string; // Must be a valid iCal (.ics) feed URL
  name?: string;
}

export interface UpdateICalImportPayload {
  url?: string;
  name?: string;
  resync?: boolean; // Force re-fetch even if URL unchanged
}

// ─── User / Account ────────────────────────────────────────────────────────────

export interface BillingInfo {
  plan: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  properties_limit: number;
}

export interface User {
  id: string; // UUID
  first_name: string;
  last_name: string;
  email: string;
  billing?: BillingInfo;
}

// ─── Guest ────────────────────────────────────────────────────────────────────

export interface Guest {
  id: string; // UUID
  first_name: string;
  last_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  locale: string | null; // BCP 47, e.g. "en-US"
  location: string | null; // Guest's self-reported location
  picture_url: string | null;
  thumbnail_url: string | null;
}

// ─── Inquiry ──────────────────────────────────────────────────────────────────

export type InquiryStatus =
  | "pending"
  | "pre_approved"
  | "declined"
  | "expired"
  | "withdrawn";

export interface Inquiry {
  id: string; // UUID
  status: InquiryStatus;
  channel: Platform;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  nights: number;
  guests_count: number;
  guest_counts?: GuestCounts;
  created_at: string;
  updated_at: string;
  // Included relations
  property?: Property;
  guest?: Guest;
}

// ─── Financials ───────────────────────────────────────────────────────────────

export interface OtherFee {
  amount: number;
  label: string;
}

/** Detailed financial breakdown of a reservation.
 *  Present when ?include=financials is passed to a reservation endpoint. */
export interface ReservationFinancials {
  accommodation: number;
  cleaning_fee: number;
  linen_fee: number;
  management_fee: number;
  resort_fee: number;
  pet_fee: number;
  pass_through_taxes: number;
  other_fees: OtherFee[];
  total: number;
  currency: string; // ISO 4217, e.g. "USD"
}

/** Status of a reservation — represented as a category object, not a plain string */
export interface ReservationStatus {
  category: ReservationStatusCategory;
  sub_category: ReservationStatusSubCategory;
}

export interface ReservationStatusHistoryEntry extends ReservationStatus {
  changed_at: string; // ISO 8601 — when this status was set
}

export interface ReservationStatusHistory {
  current: ReservationStatus;
  history: ReservationStatusHistoryEntry[];
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export interface Quote {
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  nights: number;
  guests: number;
  currency: string;
  total: number;
  breakdown: ReservationFinancials;
  available: boolean;
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export interface Reservation {
  id: string; // UUID
  conversation_id: string;
  platform: Platform;
  platform_id: string; // Reservation code on the originating platform
  booking_date: string; // ISO 8601
  arrival_date: string; // YYYY-MM-DD
  departure_date: string; // YYYY-MM-DD
  nights: number;
  check_in: string; // Exact check-in datetime ISO 8601
  check_out: string; // Exact check-out datetime ISO 8601
  last_message_at: string;
  reservation_status: ReservationStatusHistory;
  guests: GuestCounts;
  stay_type: string | null;
  issue_alert: string | null;
  created_at: string;
  updated_at: string;
  // Included relations (only present when ?include=... is used)
  property?: Property;
  guest?: Guest;
  listing?: Listing;
  financials?: ReservationFinancials;
  conversation?: Conversation;
  transactions?: Transaction[];
  checkins?: Checkin[];
}

// ─── Manual Reservation Payloads ─────────────────────────────────────────────

export interface CreateManualReservationPayload {
  property_id: string; // UUID
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  guests_count: number;
  guest?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  total_price?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateManualReservationPayload {
  check_in?: string;
  check_out?: string;
  guests_count?: number;
  total_price?: number;
  notes?: string;
}

// ─── Transaction & Payout ─────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: string; // e.g. "payment", "refund", "payout"
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
  // Included relations
  reservation?: Reservation;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string; // e.g. "pending", "paid", "failed"
  paid_at: string | null;
  created_at: string;
  transactions?: Transaction[];
}

// ─── Checkin ──────────────────────────────────────────────────────────────────

export interface Checkin {
  id: string;
  check_in_at: string; // ISO 8601
  check_out_at: string | null;
  guests_count: number;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

/** Calendar day availability status object (nested inside CalendarDay) */
export interface AvailabilityStatus {
  reason: AvailabilityReason; // "AVAILABLE" | "RESERVED" | "BLOCKED"
  source_type: AvailabilitySourceType | null;
  source: string | null; // Name of the source (e.g. "Airbnb")
  available: boolean;
}

/** Price object as returned by the API (amount in base currency units) */
export interface CalendarPrice {
  amount: number; // e.g. 15000 = $150.00
  currency: string; // ISO 4217
  formatted: string; // e.g. "$150.00"
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: string; // e.g. "FRIDAY"
  min_stay: number;
  status: AvailabilityStatus; // Use status.reason to check availability
  price: CalendarPrice;
  closed_for_checkin: boolean;
  closed_for_checkout: boolean;
}

/** Used in PATCH /calendar update payloads */
export interface CalendarUpdateItem {
  date: string; // YYYY-MM-DD
  available?: boolean;
  price?: { amount: number }; // Amount in base units (e.g. 15000 = $150.00)
  min_stay?: number;
  closed_for_checkin?: boolean;
  closed_for_checkout?: boolean;
}

// ─── Conversation & Messaging ─────────────────────────────────────────────────

export interface Conversation {
  id: string; // UUID
  status: "open" | "closed";
  unread_count: number;
  last_message_at: string;
  // Included relations
  reservation?: Reservation;
  guest?: Guest;
}

/** Sender profile embedded in each Message (may be host or guest) */
export interface Sender {
  first_name: string;
  full_name: string;
  locale: string | null;
  picture_url: string | null;
  thumbnail_url: string | null;
  location: string | null;
}

export interface MessageAttachment {
  type: "image" | string;
  url: string;
}

export interface Message {
  id: string;
  platform: string;
  platform_id: string | number | null;
  conversation_id: string;
  reservation_id: string | null;
  body: string;
  content_type: "text" | "html" | string;
  sender_type: "host" | "guest" | "system";
  sender_role: string; // e.g. "owner", "guest"
  source: MessageSource; // How the message was sent
  sender: Sender;
  attachments: MessageAttachment[];
  sent_reference_id: string | null; // Idempotency reference
  integration: string | null;
  created_at: string;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface DetailedRating {
  type:
    | "cleanliness"
    | "communication"
    | "location"
    | "checkin"
    | "accuracy"
    | "value";
  rating: number; // 1–5
  comment: string;
}

export interface ReviewPublic {
  rating: number; // 1–5
  review: string | null;
  response: string | null; // host's public reply
}

export interface ReviewPrivate {
  feedback: string | null;
  detailed_ratings: DetailedRating[] | null;
}

export interface Review {
  id: string;
  platform: Platform;
  public: ReviewPublic;
  private: ReviewPrivate;
  can_respond: boolean;
  responded_at: string | null; // ISO 8601
  reviewed_at: string | null; // ISO 8601
  // Included relations
  reservation?: Reservation;
  guest?: Guest;
}

export interface RespondToReviewPayload {
  response: string;
}

// ─── Enrichable Shortcodes ────────────────────────────────────────────────────

/** Dynamic placeholders used in automated messages (e.g. {{guest_name}}) */
export interface EnrichableShortcode {
  key: string; // e.g. "wifi_password"
  value: string;
  description: string | null;
  property_id: string | null; // null = account-level default
}

export interface SetEnrichableShortcodePayload {
  value: string;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

/** All webhook event topics emitted by Hospitable */
export type WebhookTopic =
  | "reservation.created"
  | "reservation.changed"
  | "reservation.status_changed"
  | "message.create"
  | "message.updated"
  | "inquiry.created"
  | "review.created"
  | "property.created"
  | "property.deleted"
  | "property.merged"
  | "integration.disconnected";

/** Webhook event envelope delivered to your endpoint */
export interface WebhookEvent<T = unknown> {
  id: string; // ULID
  action: WebhookTopic;
  data: T;
  version: string; // e.g. "1.0"
  created: string; // ISO 8601
}

/** Security configuration for verifying incoming webhooks */
export interface WebhookSecurityInfo {
  /** Header to verify on every incoming request */
  signatureHeader: "Signature";
  /** Whitelist this IP CIDR range in your firewall */
  allowedIpCidr: "38.80.170.0/24";
}

// ─── HTTP Error ────────────────────────────────────────────────────────────────

export interface HospitableApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface SendMessagePayload {
  body: string;
}
