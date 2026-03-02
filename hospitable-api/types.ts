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

/** All possible reservation lifecycle statuses */
export type ReservationStatus =
  | "inquiry"
  | "request"
  | "pending verification"
  | "request for payment"
  | "checkpoint"
  | "accepted"
  | "cancelled"
  | "declined"
  | "withdrawn"
  | "expired";

/** Per-day calendar status */
export type CalendarDayStatus = "available" | "unavailable" | "booked";

// ─── Address & Location ───────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  zip: string | null;
  country: string; // ISO 3166-1 alpha-2
  coordinates: Coordinates | null;
}

// ─── Capacity ─────────────────────────────────────────────────────────────────

export interface Capacity {
  max: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
}

// ─── Guest Counts (per reservation) ──────────────────────────────────────────

export interface GuestCounts {
  total: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
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
  type: string; // e.g. "entire_home", "private_room"
  room_type: string;
  timezone: string; // IANA tz, e.g. "America/New_York"
  listed: boolean;
  address: Address;
  amenities: string[];
  capacity: Capacity;
  house_rules: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Included relations (only present when ?include=... is used)
  listings?: Listing[];
  images?: PropertyImage[];
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

// ─── Quote ────────────────────────────────────────────────────────────────────

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
  status: ReservationStatus;
  channel: Platform;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  nights: number;
  guests_count: number;
  guest_counts?: GuestCounts;
  total_price: number;
  currency: string; // ISO 4217
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

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  status: CalendarDayStatus;
  price: number | null;
  min_stay: number | null;
  check_in_allowed: boolean;
  check_out_allowed: boolean;
}

export interface CalendarUpdateItem {
  date: string; // YYYY-MM-DD
  status?: CalendarDayStatus;
  price?: number;
  min_stay?: number;
  check_in_allowed?: boolean;
  check_out_allowed?: boolean;
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

export interface MessageAttachment {
  type: "image" | string;
  url: string;
}

export interface Message {
  id: string;
  body: string;
  content_type: "text" | "html" | string;
  sender_type: "host" | "guest" | "system";
  attachments: MessageAttachment[];
  created_at: string;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface ReviewRatings {
  overall: number; // 1–5
  cleanliness?: number;
  communication?: number;
  check_in?: number;
  accuracy?: number;
  location?: number;
  value?: number;
}

export interface ReviewPublic {
  review: string | null;
  response: string | null; // host's public reply
}

export interface ReviewPrivate {
  feedback: string | null;
  ratings: ReviewRatings;
}

export interface Review {
  id: string;
  public: ReviewPublic;
  private: ReviewPrivate;
  created_at: string;
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
