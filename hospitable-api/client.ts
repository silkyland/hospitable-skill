// Hospitable Public API v2 — HTTP Client
// Reference: https://developer.hospitable.com/docs/public-api-docs/d862b3ee512e6-introduction
//
// Agent: This is the canonical API client. Use and extend this file.
// Do NOT write raw fetch() calls scattered throughout the codebase.

import type {
  PaginatedResponse,
  SingleResponse,
  Property,
  PropertyImage,
  ICalImport,
  CreateICalImportPayload,
  UpdateICalImportPayload,
  Inquiry,
  Reservation,
  CreateManualReservationPayload,
  UpdateManualReservationPayload,
  CalendarDay,
  CalendarUpdateItem,
  Quote,
  Conversation,
  Message,
  SendMessagePayload,
  Transaction,
  Payout,
  Review,
  RespondToReviewPayload,
  EnrichableShortcode,
  SetEnrichableShortcodePayload,
  User,
  HospitableApiError,
} from "./types";

const BASE_URL = "https://public.api.hospitable.com/v2";

// ─── Client Factory ───────────────────────────────────────────────────────────

function createClient(accessToken: string) {
  /**
   * Core fetch wrapper. Handles:
   * - Authorization header injection
   * - Rate limit detection (throws with reset time on 429)
   * - JSON error parsing on non-2xx responses
   * - Full URL passthrough (used internally by fetchAllPages for links.next)
   */
  async function request<T>(
    path: string,
    options: RequestInit = {},
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const res = await fetch(url, { ...options, headers });

    if (res.status === 429) {
      const resetAt = res.headers.get("X-RateLimit-Reset");
      throw new Error(
        `[Hospitable] Rate limit exceeded. Resets at: ${resetAt ?? "unknown"}`,
      );
    }

    if (!res.ok) {
      const body: HospitableApiError = await res.json();
      throw new Error(
        `[Hospitable] API error ${res.status}: ${body.message}${
          body.errors ? ` — ${JSON.stringify(body.errors)}` : ""
        }`,
      );
    }

    return res.json() as Promise<T>;
  }

  /**
   * Fetch ALL pages of a paginated endpoint automatically.
   * Follows links.next until null, using per_page=100 (API maximum).
   *
   * Agent rule: Call this when the user asks for "all" records.
   * Do NOT manually loop over pages.
   */
  async function fetchAllPages<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T[]> {
    const searchParams = new URLSearchParams({ per_page: "100", ...params });
    let cursor: string | null = `${path}?${searchParams.toString()}`;
    const results: T[] = [];

    while (cursor) {
      const page = await request<PaginatedResponse<T>>(cursor);
      results.push(...page.data);
      cursor = page.links.next;
    }

    return results;
  }

  // Helper: build query string from params + include array
  function buildQuery(
    params: Record<string, string> = {},
    include: string[] = [],
  ): string {
    const merged: Record<string, string> = { ...params };
    if (include.length) merged["include"] = include.join(",");
    const qs = new URLSearchParams(merged).toString();
    return qs ? `?${qs}` : "";
  }

  // ─── User ────────────────────────────────────────────────────────────────────

  const user = {
    /** Get the authenticated user and their billing information */
    get() {
      return request<SingleResponse<User>>("/user?include=billing");
    },
  };

  // ─── Properties ─────────────────────────────────────────────────────────────

  const properties = {
    /**
     * List properties (paginated).
     * @param include e.g. ["listings", "images", "tags", "user"]
     */
    list(params: Record<string, string> = {}, include: string[] = []) {
      return request<PaginatedResponse<Property>>(
        `/properties${buildQuery(params, include)}`,
      );
    },
    /** Search properties by keyword */
    search(query: string, params: Record<string, string> = {}) {
      return request<PaginatedResponse<Property>>(
        `/properties/search${buildQuery({ ...params, q: query })}`,
      );
    },
    get(id: string, include: string[] = []) {
      return request<SingleResponse<Property>>(
        `/properties/${id}${buildQuery({}, include)}`,
      );
    },
    /** Get images for a property */
    getImages(propertyId: string) {
      return request<PaginatedResponse<PropertyImage>>(
        `/properties/${propertyId}/images`,
      );
    },
    /** Generate a price quote for a stay */
    generateQuote(
      propertyId: string,
      params: { check_in: string; check_out: string; guests: number },
    ) {
      const q = new URLSearchParams({
        check_in: params.check_in,
        check_out: params.check_out,
        guests: String(params.guests),
      }).toString();
      return request<SingleResponse<Quote>>(
        `/properties/${propertyId}/quote?${q}`,
      );
    },
    /** Tag a property with a label */
    tag(propertyId: string, tag: string, idempotencyKey: string) {
      return request<SingleResponse<Property>>(
        `/properties/${propertyId}/tags`,
        { method: "POST", body: JSON.stringify({ tag }) },
        idempotencyKey,
      );
    },
    /** Fetch every property across all pages */
    listAll(params: Record<string, string> = {}) {
      return fetchAllPages<Property>("/properties", params);
    },
    /** Create a new iCal import feed for a property.
     *  Requires `ical:write` OAuth scope.
     *  @param idempotencyKey Required — use crypto.randomUUID()
     */
    createICalImport(
      propertyId: string,
      payload: CreateICalImportPayload,
      idempotencyKey: string,
    ) {
      return request<SingleResponse<ICalImport>>(
        `/properties/${propertyId}/ical-imports`,
        { method: "POST", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
    /** Update an existing iCal import (e.g. change URL or force resync).
     *  Pass `resync: true` in payload to force re-fetch even if URL unchanged.
     *  @param idempotencyKey Required — use crypto.randomUUID()
     */
    updateICalImport(
      propertyId: string,
      icalImportId: string,
      payload: UpdateICalImportPayload,
      idempotencyKey: string,
    ) {
      return request<SingleResponse<ICalImport>>(
        `/properties/${propertyId}/ical-imports/${icalImportId}`,
        { method: "PUT", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
  };

  // ─── Inquiries ───────────────────────────────────────────────────────────────

  const inquiries = {
    /**
     * List inquiries (paginated).
     * Available includes: property, guest
     */
    list(params: Record<string, string> = {}, include: string[] = []) {
      return request<PaginatedResponse<Inquiry>>(
        `/inquiries${buildQuery(params, include)}`,
      );
    },
    get(id: string, include: string[] = []) {
      return request<SingleResponse<Inquiry>>(
        `/inquiries/${id}${buildQuery({}, include)}`,
      );
    },
    listAll(params: Record<string, string> = {}) {
      return fetchAllPages<Inquiry>("/inquiries", params);
    },
    /**
     * Send a message via an inquiry thread.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    sendMessage(
      inquiryId: string,
      payload: SendMessagePayload,
      idempotencyKey: string,
    ) {
      return request<SingleResponse<Message>>(
        `/inquiries/${inquiryId}/messages`,
        { method: "POST", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
  };

  // ─── Reservations ────────────────────────────────────────────────────────────

  const reservations = {
    /**
     * List reservations (paginated).
     * Common filters: property_id, status, check_in_start, check_in_end
     * Available includes: guest, listing, property, checkins, transactions,
     *                     conversation, financials
     */
    list(params: Record<string, string> = {}, include: string[] = []) {
      return request<PaginatedResponse<Reservation>>(
        `/reservations${buildQuery(params, include)}`,
      );
    },
    get(id: string, include: string[] = []) {
      return request<SingleResponse<Reservation>>(
        `/reservations/${id}${buildQuery({}, include)}`,
      );
    },
    listAll(params: Record<string, string> = {}) {
      return fetchAllPages<Reservation>("/reservations", params);
    },
    /**
     * Create a manual (direct) reservation.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    create(payload: CreateManualReservationPayload, idempotencyKey: string) {
      return request<SingleResponse<Reservation>>(
        "/reservations",
        { method: "POST", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
    /**
     * Update a manual reservation.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    update(
      id: string,
      payload: UpdateManualReservationPayload,
      idempotencyKey: string,
    ) {
      return request<SingleResponse<Reservation>>(
        `/reservations/${id}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
    /**
     * Cancel a manual reservation.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    cancel(id: string, idempotencyKey: string) {
      return request<SingleResponse<Reservation>>(
        `/reservations/${id}/cancel`,
        { method: "POST" },
        idempotencyKey,
      );
    },
    /** List messages for a reservation */
    listMessages(reservationId: string) {
      return request<PaginatedResponse<Message>>(
        `/reservations/${reservationId}/messages`,
      );
    },
    /**
     * Send a message via a reservation thread.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    sendMessage(
      reservationId: string,
      payload: SendMessagePayload,
      idempotencyKey: string,
    ) {
      return request<SingleResponse<Message>>(
        `/reservations/${reservationId}/messages`,
        { method: "POST", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
  };

  // ─── Calendar ────────────────────────────────────────────────────────────────

  const calendar = {
    /** Get calendar days for a property within a date range (YYYY-MM-DD). */
    get(propertyId: string, startDate: string, endDate: string) {
      return request<PaginatedResponse<CalendarDay>>(
        `/properties/${propertyId}/calendar?start_date=${startDate}&end_date=${endDate}`,
      );
    },
    /**
     * Update availability / pricing / min-stay for specific dates.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    update(
      propertyId: string,
      days: CalendarUpdateItem[],
      idempotencyKey: string,
    ) {
      return request<{ data: CalendarDay[] }>(
        `/properties/${propertyId}/calendar`,
        { method: "PATCH", body: JSON.stringify({ days }) },
        idempotencyKey,
      );
    },
  };

  // ─── Conversations ───────────────────────────────────────────────────────────

  const conversations = {
    /**
     * List all inbox conversations.
     * Available includes: guest, reservation
     */
    list(params: Record<string, string> = {}, include: string[] = []) {
      return request<PaginatedResponse<Conversation>>(
        `/conversations${buildQuery(params, include)}`,
      );
    },
  };

  // ─── Transactions ────────────────────────────────────────────────────────────

  const transactions = {
    /** List all transactions */
    list(params: Record<string, string> = {}) {
      return request<PaginatedResponse<Transaction>>(
        `/transactions${buildQuery(params)}`,
      );
    },
    get(id: string) {
      return request<SingleResponse<Transaction>>(`/transactions/${id}`);
    },
    listAll(params: Record<string, string> = {}) {
      return fetchAllPages<Transaction>("/transactions", params);
    },
  };

  // ─── Payouts ─────────────────────────────────────────────────────────────────

  const payouts = {
    /** List all payouts */
    list(params: Record<string, string> = {}) {
      return request<PaginatedResponse<Payout>>(
        `/payouts${buildQuery(params)}`,
      );
    },
    get(id: string) {
      return request<SingleResponse<Payout>>(`/payouts/${id}`);
    },
    listAll(params: Record<string, string> = {}) {
      return fetchAllPages<Payout>("/payouts", params);
    },
  };

  // ─── Reviews ─────────────────────────────────────────────────────────────────

  const reviews = {
    /**
     * List reviews. Available includes: reservation, guest
     */
    list(params: Record<string, string> = {}, include: string[] = []) {
      return request<PaginatedResponse<Review>>(
        `/reviews${buildQuery(params, include)}`,
      );
    },
    get(id: string, include: string[] = []) {
      return request<SingleResponse<Review>>(
        `/reviews/${id}${buildQuery({}, include)}`,
      );
    },
    listAll(params: Record<string, string> = {}) {
      return fetchAllPages<Review>("/reviews", params);
    },
    /**
     * Submit a public response to a guest review.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    respond(
      reviewId: string,
      payload: RespondToReviewPayload,
      idempotencyKey: string,
    ) {
      return request<SingleResponse<Review>>(
        `/reviews/${reviewId}/response`,
        { method: "POST", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
  };

  // ─── Enrichable Shortcodes ────────────────────────────────────────────────────

  const shortcodes = {
    /** List all enrichable shortcodes (property-level + account-level) */
    list(propertyId?: string) {
      const q = propertyId ? `?property_id=${propertyId}` : "";
      return request<PaginatedResponse<EnrichableShortcode>>(`/shortcodes${q}`);
    },
    get(key: string, propertyId?: string) {
      const q = propertyId ? `?property_id=${propertyId}` : "";
      return request<SingleResponse<EnrichableShortcode>>(
        `/shortcodes/${key}${q}`,
      );
    },
    /**
     * Create or update a shortcode value.
     * @param idempotencyKey Required — use crypto.randomUUID()
     */
    set(
      key: string,
      payload: SetEnrichableShortcodePayload,
      idempotencyKey: string,
      propertyId?: string,
    ) {
      const q = propertyId ? `?property_id=${propertyId}` : "";
      return request<SingleResponse<EnrichableShortcode>>(
        `/shortcodes/${key}${q}`,
        { method: "PUT", body: JSON.stringify(payload) },
        idempotencyKey,
      );
    },
  };

  return {
    user,
    properties,
    inquiries,
    reservations,
    calendar,
    conversations,
    transactions,
    payouts,
    reviews,
    shortcodes,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { createClient };
export type HospitableClient = ReturnType<typeof createClient>;
