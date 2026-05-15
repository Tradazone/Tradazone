// @ts-nocheck
/**
 * src/test/sep38.test.ts
 *
 * Unit tests for the SEP-38 Quotes API client (src/stellar/sep38.ts).
 *
 * Uses the same vi.stubGlobal('fetch', ...) pattern as the existing api.test.js
 * so no extra dependencies are required.
 */

import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import {
  Sep38Client,
  QuoteTTLError,
  Sep38ApiError,
  isExpired,
  buildAuthHeaders,
} from "../stellar/sep38";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://anchor.example.com";
const JWT = "eyJhbGciOiJIUzI1NiJ9.test.jwt";

/** Build a minimal FirmQuote fixture. */
function makeQuote(
  overrides: Partial<import("../stellar/sep38").FirmQuote> = {}
) {
  const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // +5 min
  return {
    id: "de762cda-a193-4961-861e-57b31fed6eb3",
    expires_at: futureDate,
    price: "5.00",
    total_price: "5.42",
    sell_asset: "iso4217:USD",
    sell_amount: "542",
    buy_asset:
      "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    buy_amount: "100",
    fee: {
      total: "42.00",
      asset: "iso4217:USD",
      details: [{ name: "Service fee", amount: "42.00" }],
    },
    ...overrides,
  };
}

/** Stub global fetch to return a successful JSON response. */
function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (_: string) => "application/json" },
      json: async () => body,
    })
  );
}

/** Stub global fetch to return an error JSON response. */
function stubFetchError(status: number, error: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      headers: { get: (_: string) => "application/json" },
      json: async () => ({ error }),
    })
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let client: Sep38Client;

beforeAll(() => {
  client = new Sep38Client(BASE_URL);
});

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// GET /info
// ---------------------------------------------------------------------------

describe("Sep38Client.getInfo()", () => {
  it("returns the assets array on success", async () => {
    const payload = {
      assets: [
        { asset: "iso4217:USD", country_codes: ["US"] },
        {
          asset: "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        },
      ],
    };
    stubFetch(payload);

    const info = await client.getInfo();

    expect(info.assets).toHaveLength(2);
    expect(info.assets[0].asset).toBe("iso4217:USD");
  });

  it("includes Authorization header when JWT is provided", async () => {
    stubFetch({ assets: [] });
    await client.getInfo(JWT);

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers).toMatchObject({ Authorization: `Bearer ${JWT}` });
  });

  it("omits Authorization header when JWT is absent", async () => {
    stubFetch({ assets: [] });
    await client.getInfo();

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers).not.toHaveProperty("Authorization");
  });

  it("throws Sep38ApiError on 400 response", async () => {
    stubFetchError(400, "Bad request");
    await expect(client.getInfo()).rejects.toThrow(Sep38ApiError);
  });
});

// ---------------------------------------------------------------------------
// GET /prices
// ---------------------------------------------------------------------------

describe("Sep38Client.getPrices()", () => {
  it("returns buy_assets when sell_asset is provided", async () => {
    const payload = {
      buy_assets: [
        {
          asset: "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          price: "1.05",
          decimals: 7,
        },
      ],
    };
    stubFetch(payload);

    const result = await client.getPrices({ sell_asset: "iso4217:USD" });

    expect(result.buy_assets).toHaveLength(1);
    expect(result.buy_assets![0].price).toBe("1.05");
  });

  it("appends query params correctly", async () => {
    stubFetch({ buy_assets: [] });

    await client.getPrices({
      sell_asset: "iso4217:USD",
      sell_amount: "100",
      country_code: "US",
    });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("sell_asset=iso4217%3AUSD");
    expect(url).toContain("sell_amount=100");
    expect(url).toContain("country_code=US");
  });

  it("throws Sep38ApiError on 403 forbidden", async () => {
    stubFetchError(403, "Permission denied");
    await expect(
      client.getPrices({ sell_asset: "iso4217:USD" })
    ).rejects.toThrow(Sep38ApiError);
  });
});

// ---------------------------------------------------------------------------
// GET /price
// ---------------------------------------------------------------------------

describe("Sep38Client.getPrice()", () => {
  it("returns price, sell_amount, and buy_amount on success", async () => {
    const payload = {
      price: "5.00",
      total_price: "5.42",
      sell_asset: "iso4217:USD",
      sell_amount: "542",
      buy_asset:
        "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      buy_amount: "100",
      fee: { total: "42.00", asset: "iso4217:USD" },
    };
    stubFetch(payload);

    const result = await client.getPrice({
      sell_asset: "iso4217:USD",
      buy_asset:
        "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      buy_amount: "100",
      context: "sep6",
    });

    expect(result.price).toBe("5.00");
    expect(result.total_price).toBe("5.42");
    expect(result.buy_amount).toBe("100");
  });

  it("throws Sep38ApiError when the asset pair is unsupported (400)", async () => {
    stubFetchError(
      400,
      "The requested asset is not supported. See GET /prices for supported assets."
    );
    await expect(
      client.getPrice({
        sell_asset: "iso4217:ZZZ",
        buy_asset: "iso4217:YYY",
        sell_amount: "100",
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ---------------------------------------------------------------------------
// POST /quote
// ---------------------------------------------------------------------------

describe("Sep38Client.postQuote()", () => {
  it("returns a firm quote with id and expires_at on success", async () => {
    const quote = makeQuote();
    stubFetch(quote, 201);

    const result = await client.postQuote(
      {
        sell_asset: "iso4217:USD",
        buy_asset:
          "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        sell_amount: "542",
        context: "sep6",
      },
      JWT
    );

    expect(result.id).toBe(quote.id);
    expect(result.expires_at).toBe(quote.expires_at);
    expect(result.buy_amount).toBe("100");
  });

  it("sends the JWT in the Authorization header", async () => {
    stubFetch(makeQuote(), 201);
    await client.postQuote(
      {
        sell_asset: "iso4217:USD",
        buy_asset: "stellar:USDC:G...",
        sell_amount: "100",
        context: "sep6",
      },
      JWT
    );

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers).toMatchObject({ Authorization: `Bearer ${JWT}` });
  });

  it("sends the request body as JSON", async () => {
    stubFetch(makeQuote(), 201);
    const requestBody = {
      sell_asset: "iso4217:USD",
      buy_asset: "stellar:USDC:G...",
      sell_amount: "100",
      context: "sep6",
    };
    await client.postQuote(requestBody, JWT);

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject(requestBody);
  });

  it("throws QuoteTTLError when the server returns an already-expired quote", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    stubFetch(makeQuote({ expires_at: pastDate }), 201);

    await expect(
      client.postQuote(
        {
          sell_asset: "iso4217:USD",
          buy_asset: "stellar:USDC:G...",
          sell_amount: "100",
          context: "sep6",
        },
        JWT
      )
    ).rejects.toThrow(QuoteTTLError);
  });

  it("QuoteTTLError carries the expired quote and expiration date", async () => {
    const pastDate = new Date(Date.now() - 5000).toISOString();
    const expiredQuote = makeQuote({ expires_at: pastDate });
    stubFetch(expiredQuote, 201);

    let caught: QuoteTTLError | undefined;
    try {
      await client.postQuote(
        { sell_asset: "iso4217:USD", buy_asset: "stellar:USDC:G...", sell_amount: "1", context: "sep6" },
        JWT
      );
    } catch (e) {
      caught = e as QuoteTTLError;
    }

    expect(caught).toBeInstanceOf(QuoteTTLError);
    expect(caught!.quote.id).toBe(expiredQuote.id);
    expect(caught!.expiredAt).toBeInstanceOf(Date);
  });

  it("throws Sep38ApiError on 403 (missing or invalid JWT)", async () => {
    stubFetchError(403, "No Authorization header has been provided.");
    await expect(
      client.postQuote(
        { sell_asset: "iso4217:USD", buy_asset: "stellar:USDC:G...", sell_amount: "100", context: "sep6" },
        "bad-token"
      )
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws Sep38ApiError on 400 bad request", async () => {
    stubFetchError(400, "sell_amount and buy_amount are mutually exclusive.");
    await expect(
      client.postQuote(
        {
          sell_asset: "iso4217:USD",
          buy_asset: "stellar:USDC:G...",
          sell_amount: "100",
          buy_amount: "50",
          context: "sep6",
        },
        JWT
      )
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ---------------------------------------------------------------------------
// GET /quote/:id
// ---------------------------------------------------------------------------

describe("Sep38Client.getQuote()", () => {
  const QUOTE_ID = "de762cda-a193-4961-861e-57b31fed6eb3";

  it("returns the persisted firm quote on success", async () => {
    const quote = makeQuote({ id: QUOTE_ID });
    stubFetch(quote);

    const result = await client.getQuote(QUOTE_ID, JWT);

    expect(result.id).toBe(QUOTE_ID);
    expect(result.sell_asset).toBe("iso4217:USD");
  });

  it("encodes the quote ID in the URL path", async () => {
    stubFetch(makeQuote({ id: QUOTE_ID }));
    await client.getQuote(QUOTE_ID, JWT);

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain(`/quote/${QUOTE_ID}`);
  });

  it("throws QuoteTTLError when the quote has expired", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    stubFetch(makeQuote({ id: QUOTE_ID, expires_at: pastDate }));

    await expect(client.getQuote(QUOTE_ID, JWT)).rejects.toThrow(QuoteTTLError);
  });

  it("throws Sep38ApiError on 404 (unknown quote ID)", async () => {
    stubFetchError(404, "Quote not found.");
    await expect(client.getQuote("unknown-id", JWT)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws Sep38ApiError on 403 (invalid JWT)", async () => {
    stubFetchError(403, "Permission denied.");
    await expect(client.getQuote(QUOTE_ID, "bad-token")).rejects.toMatchObject({
      status: 403,
    });
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe("isExpired()", () => {
  it("returns false for a quote with a future expires_at", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpired(makeQuote({ expires_at: future }))).toBe(false);
  });

  it("returns true for a quote with a past expires_at", () => {
    const past = new Date(Date.now() - 1).toISOString();
    expect(isExpired(makeQuote({ expires_at: past }))).toBe(true);
  });
});

describe("buildAuthHeaders()", () => {
  it("returns Authorization header when JWT is provided", () => {
    expect(buildAuthHeaders("my.jwt.token")).toStrictEqual({
      Authorization: "Bearer my.jwt.token",
    });
  });

  it("returns an empty object when JWT is absent", () => {
    expect(buildAuthHeaders()).toStrictEqual({});
    expect(buildAuthHeaders(undefined)).toStrictEqual({});
  });
});

// ---------------------------------------------------------------------------
// Sep38Client constructor
// ---------------------------------------------------------------------------

describe("Sep38Client constructor", () => {
  it("throws when baseUrl is empty", () => {
    expect(() => new Sep38Client("")).toThrow(
      "Sep38Client: baseUrl is required"
    );
  });

  it("normalises a trailing slash on baseUrl", async () => {
    const trailing = new Sep38Client(`${BASE_URL}/`);
    stubFetch({ assets: [] });
    await trailing.getInfo();

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    // Should not have a double-slash
    expect(url).not.toContain("//info");
  });
});
