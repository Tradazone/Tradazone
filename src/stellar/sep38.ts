// @ts-nocheck
/**
 * src/stellar/sep38.ts
 *
 * SEP-38 Quote Server client — Stellar Ecosystem Proposal for firm exchange
 * rate quotes between Stellar assets and off-chain assets.
 *
 * Spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md
 *
 * Issue: #186 — Implement SEP-38 Quotes API
 *
 * Endpoints implemented
 *   GET  /info          – list supported asset pairs
 *   GET  /prices        – indicative prices for an asset pair (all counterparts)
 *   GET  /price         – indicative price for a specific asset pair + amount
 *   POST /quote         – create a firm, time-limited quote (requires SEP-10 JWT)
 *   GET  /quote/:id     – retrieve an existing firm quote   (requires SEP-10 JWT)
 *
 * TTL Enforcement
 *   All firm quotes returned by POST /quote and GET /quote/:id are checked
 *   against Date.now(). If expires_at has elapsed a QuoteTTLError is thrown.
 */

// ---------------------------------------------------------------------------
// Asset identification
// ---------------------------------------------------------------------------

/**
 * SEP-38 asset identifier string.
 *
 *   Stellar asset : "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
 *   Fiat currency : "iso4217:USD"
 */
export type AssetIdentifier = string;

// ---------------------------------------------------------------------------
// GET /info types
// ---------------------------------------------------------------------------

export interface DeliveryMethod {
  name: string;
  description: string;
}

export interface AssetInfo {
  asset: AssetIdentifier;
  /** Only for non-Stellar assets */
  sell_delivery_methods?: DeliveryMethod[];
  /** Only for non-Stellar assets */
  buy_delivery_methods?: DeliveryMethod[];
  /** Only for fiat assets — ISO 3166-1 alpha-2 or 3166-2 codes */
  country_codes?: string[];
}

export interface InfoResponse {
  assets: AssetInfo[];
}

// ---------------------------------------------------------------------------
// GET /prices types
// ---------------------------------------------------------------------------

export interface PricesParams {
  /** The asset you want to sell. Mutually exclusive with buy_asset. */
  sell_asset?: AssetIdentifier;
  /** The asset you want to buy. Mutually exclusive with sell_asset. */
  buy_asset?: AssetIdentifier;
  /** Amount of sell_asset to exchange (only when sell_asset is set). */
  sell_amount?: string;
  /** Amount of buy_asset to exchange (only when buy_asset is set). */
  buy_amount?: string;
  sell_delivery_method?: string;
  buy_delivery_method?: string;
  country_code?: string;
}

export interface PriceEntry {
  asset: AssetIdentifier;
  /** Indicative price: 1 buy_asset unit in terms of sell_asset */
  price: string;
  /** Decimals supported for this asset */
  decimals?: number;
}

export interface PricesResponse {
  buy_assets?: PriceEntry[];
  sell_assets?: PriceEntry[];
}

// ---------------------------------------------------------------------------
// GET /price types
// ---------------------------------------------------------------------------

export interface PriceParams {
  sell_asset: AssetIdentifier;
  buy_asset: AssetIdentifier;
  /** Provide exactly one of sell_amount or buy_amount */
  sell_amount?: string;
  buy_amount?: string;
  sell_delivery_method?: string;
  buy_delivery_method?: string;
  country_code?: string;
  /** "sep6" | "sep24" | "sep31" */
  context?: string;
}

export interface FeeDetail {
  name: string;
  description?: string;
  amount: string;
}

export interface Fee {
  total: string;
  asset: AssetIdentifier;
  details?: FeeDetail[];
}

export interface PriceResponse {
  /** Price for 1 unit of buy_asset in terms of sell_asset (excluding fees) */
  price: string;
  /** Total price for 1 unit of buy_asset in terms of sell_asset (including fees) */
  total_price: string;
  sell_asset: AssetIdentifier;
  sell_amount: string;
  buy_asset: AssetIdentifier;
  buy_amount: string;
  fee: Fee;
}

// ---------------------------------------------------------------------------
// POST /quote request and response types (firm quotes)
// ---------------------------------------------------------------------------

export interface QuoteRequest {
  sell_asset: AssetIdentifier;
  buy_asset: AssetIdentifier;
  /** Provide exactly one of sell_amount or buy_amount */
  sell_amount?: string;
  buy_amount?: string;
  /** Optional desired expiry (ISO 8601). Server may use a later time. */
  expire_after?: string;
  sell_delivery_method?: string;
  buy_delivery_method?: string;
  country_code?: string;
  /** "sep6" | "sep24" | "sep31" */
  context?: string;
}

export interface FirmQuote {
  id: string;
  /** ISO 8601 UTC string — the deadline by which the anchor must receive funds */
  expires_at: string;
  /** Price per 1 buy_asset unit in sell_asset terms (excluding fees) */
  price: string;
  /** Price per 1 buy_asset unit in sell_asset terms (including fees) */
  total_price: string;
  sell_asset: AssetIdentifier;
  sell_amount: string;
  sell_delivery_method?: string;
  buy_asset: AssetIdentifier;
  buy_amount: string;
  buy_delivery_method?: string;
  fee: Fee;
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a firm quote has expired (expires_at <= now).
 * Callers should discard the quote and request a new one.
 */
export class QuoteTTLError extends Error {
  public readonly quote: FirmQuote;
  public readonly expiredAt: Date;

  constructor(quote: FirmQuote) {
    super(
      `SEP-38 quote ${quote.id} expired at ${quote.expires_at}. ` +
        `Request a new quote.`
    );
    this.name = "QuoteTTLError";
    this.quote = quote;
    this.expiredAt = new Date(quote.expires_at);
  }
}

/**
 * Thrown when the SEP-38 server returns a 4xx / 5xx response.
 */
export class Sep38ApiError extends Error {
  public readonly status: number;
  public readonly serverError: string;

  constructor(status: number, serverError: string) {
    super(`SEP-38 API error ${status}: ${serverError}`);
    this.name = "Sep38ApiError";
    this.status = status;
    this.serverError = serverError;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a URL with query-string params, skipping undefined values. */
function buildUrl(
  base: string,
  path: string,
  params?: Record<string, string | undefined>
): string {
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}

/** Parse a server response, throwing Sep38ApiError on non-2xx. */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const body = isJson
      ? await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      : { error: `HTTP ${response.status}` };
    throw new Sep38ApiError(
      response.status,
      (body as { error?: string }).error ?? `HTTP ${response.status}`
    );
  }

  return (await response.json()) as T;
}

/** Assert that a firm quote has not yet expired, throwing QuoteTTLError otherwise. */
function assertNotExpired(quote: FirmQuote): void {
  if (Date.now() >= Date.parse(quote.expires_at)) {
    throw new QuoteTTLError(quote);
  }
}

// ---------------------------------------------------------------------------
// Sep38Client
// ---------------------------------------------------------------------------

/**
 * Client for a SEP-38 compliant quote server.
 *
 * @example
 * ```ts
 * const client = new Sep38Client("https://anchor.example.com");
 * const info   = await client.getInfo();
 * const quote  = await client.postQuote(
 *   { sell_asset: "iso4217:USD", buy_asset: "stellar:USDC:G...", sell_amount: "100", context: "sep6" },
 *   jwtToken
 * );
 * ```
 */
export class Sep38Client {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) {
      throw new Error(
        "Sep38Client: baseUrl is required. " +
          "Set VITE_SEP38_URL in your environment."
      );
    }
    // Normalise — strip trailing slash so path joins are predictable.
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  // ─── GET /info ─────────────────────────────────────────────────────────────

  /**
   * Fetch the list of supported assets and their delivery methods.
   *
   * Authentication is optional. Provide a SEP-10 JWT to receive a personalised
   * response if the server supports it.
   */
  async getInfo(jwt?: string): Promise<InfoResponse> {
    const url = `${this.baseUrl}/info`;
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(jwt),
    });
    return parseResponse<InfoResponse>(response);
  }

  // ─── GET /prices ───────────────────────────────────────────────────────────

  /**
   * Fetch indicative prices for all assets tradeable against a base asset.
   *
   * Provide either `sell_asset` or `buy_asset` (not both).
   * Authentication is optional.
   */
  async getPrices(
    params: PricesParams,
    jwt?: string
  ): Promise<PricesResponse> {
    const url = buildUrl(this.baseUrl, "prices", {
      sell_asset: params.sell_asset,
      buy_asset: params.buy_asset,
      sell_amount: params.sell_amount,
      buy_amount: params.buy_amount,
      sell_delivery_method: params.sell_delivery_method,
      buy_delivery_method: params.buy_delivery_method,
      country_code: params.country_code,
    });
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(jwt),
    });
    return parseResponse<PricesResponse>(response);
  }

  // ─── GET /price ────────────────────────────────────────────────────────────

  /**
   * Fetch an indicative price for a specific asset pair and amount.
   *
   * Provide either `sell_amount` or `buy_amount` (not both).
   * Authentication is optional.
   */
  async getPrice(
    params: PriceParams,
    jwt?: string
  ): Promise<PriceResponse> {
    const url = buildUrl(this.baseUrl, "price", {
      sell_asset: params.sell_asset,
      buy_asset: params.buy_asset,
      sell_amount: params.sell_amount,
      buy_amount: params.buy_amount,
      sell_delivery_method: params.sell_delivery_method,
      buy_delivery_method: params.buy_delivery_method,
      country_code: params.country_code,
      context: params.context,
    });
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(jwt),
    });
    return parseResponse<PriceResponse>(response);
  }

  // ─── POST /quote ───────────────────────────────────────────────────────────

  /**
   * Request a firm quote for a Stellar ↔ off-chain asset pair.
   *
   * A firm quote reserves the offered rate until `expires_at`. The amount is
   * not available for other quotes until expiry.
   *
   * Authentication is **required** (SEP-10 JWT).
   *
   * @throws {QuoteTTLError} if the server returns an already-expired quote.
   * @throws {Sep38ApiError} on 4xx / 5xx server responses.
   */
  async postQuote(body: QuoteRequest, jwt: string): Promise<FirmQuote> {
    const url = `${this.baseUrl}/quote`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(jwt),
      },
      body: JSON.stringify(body),
    });

    // POST /quote responds with 201 Created on success; parseResponse handles both.
    const quote = await parseResponse<FirmQuote>(response);
    assertNotExpired(quote);
    return quote;
  }

  // ─── GET /quote/:id ────────────────────────────────────────────────────────

  /**
   * Retrieve a previously issued firm quote by its ID.
   *
   * Authentication is **required** (SEP-10 JWT).
   *
   * @throws {QuoteTTLError} if the quote has expired.
   * @throws {Sep38ApiError} on 4xx / 5xx server responses.
   */
  async getQuote(id: string, jwt: string): Promise<FirmQuote> {
    const url = `${this.baseUrl}/quote/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(jwt),
    });
    const quote = await parseResponse<FirmQuote>(response);
    assertNotExpired(quote);
    return quote;
  }
}

// ---------------------------------------------------------------------------
// Utility helpers (exported for testing and external use)
// ---------------------------------------------------------------------------

/**
 * Build the Authorization header object.
 * Returns an empty object when jwt is not provided (for optional-auth endpoints).
 */
export function buildAuthHeaders(
  jwt?: string
): Record<string, string> {
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

/**
 * Returns true when the firm quote has passed its expiration time.
 */
export function isExpired(quote: FirmQuote): boolean {
  return Date.now() >= Date.parse(quote.expires_at);
}

// ---------------------------------------------------------------------------
// Default singleton (lazy)
// ---------------------------------------------------------------------------

/**
 * Pre-configured Sep38Client using the VITE_SEP38_URL environment variable.
 *
 * The client is created **lazily** on first access so that importing this
 * module in test environments (where VITE_SEP38_URL is unset) does not throw.
 *
 * Import this in components/services that need quote functionality:
 * ```ts
 * import { sep38 } from '@/stellar/sep38';
 * const info = await sep38.getInfo();
 * ```
 */
let _defaultClient: Sep38Client | undefined;

export const sep38: Sep38Client = new Proxy({} as Sep38Client, {
  get(_target, prop, receiver) {
    if (!_defaultClient) {
      const url =
        (import.meta as unknown as { env: Record<string, string> }).env
          .VITE_SEP38_URL ?? "";
      _defaultClient = new Sep38Client(url);
    }
    const value = (_defaultClient as unknown as Record<string | symbol, unknown>)[prop as string | symbol];
    return typeof value === "function"
      ? (value as Function).bind(_defaultClient)
      : value;
  },
});
