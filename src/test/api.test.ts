// @ts-nocheck
import { describe, it, expect, vi, afterEach } from 'vitest';
import api, { apiFetch, setUnauthorizedHandler, paginate, sanitizeText } from '../services/api';

// ─── sanitizeText ────────────────────────────────────────────────────────────

describe("sanitizeText", () => {
  it("strips HTML tags from a string", () => {
    expect(sanitizeText("<script>alert(1)</script>hello")).toBe("hello");
  });

  it("returns plain strings unchanged", () => {
    expect(sanitizeText("Internal Server Error")).toBe("Internal Server Error");
  });

  it("handles non-string values gracefully", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText(42)).toBe("42");
  });
});

describe("apiFetch XSS sanitization", () => {
  afterEach(() => vi.restoreAllMocks());

  it("strips HTML tags from API error messages before throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "<img src=x onerror=alert(1)>Bad Request" }),
      })
    );
    await expect(apiFetch("/api/items")).rejects.toMatchObject({
      message: "Bad Request",
      status: 400,
    });
  });
});

// ─── apiFetch ────────────────────────────────────────────────────────────────

describe("apiFetch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed JSON on a 2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, name: "Alice" }),
      })
    );
    const data = await apiFetch("/api/customers");
    expect(data).toEqual({ id: 1, name: "Alice" });
  });

  it("includes secure headers (X-Content-Type-Options: nosniff)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/any");
    
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers["X-Content-Type-Options"]).toBe("nosniff");
  });


  it("throws an enriched error on non-401 failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Internal Server Error" }),
      })
    );
    await expect(apiFetch("/api/customers")).rejects.toMatchObject({
      message: "Internal Server Error",
      status: 500,
    });
  });

  // BUG FIX #16: Verify non-JSON error responses are handled gracefully
  it("falls back with status code when error response body is not valid JSON", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => { throw new Error("Unexpected token < in JSON"); },
      })
    );
    await expect(apiFetch("/api/customers")).rejects.toMatchObject({
      message: "API error 502",
      status: 502,
    });
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });

  it("calls the unauthorized handler on 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
    );

    const result = await apiFetch("/api/customers");

    expect(handler).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      ok: false,
      error: "ERR_TOKEN_EXPIRED",
      status: 401,
    });
  });

  it("propagates network-level errors (DNS, CORS, timeout) to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network request failed"))
    );
    await expect(apiFetch("/api/customers")).rejects.toThrow("Network request failed");
  });

  it("returns ERR_TOKEN_EXPIRED code on 401 for machine-readable UI handling", async () => {
    setUnauthorizedHandler(vi.fn());

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
    );

    const result = await apiFetch("/api/protected");
    expect(result.error).toBe("ERR_TOKEN_EXPIRED");
  });
});

// ─── setUnauthorizedHandler ───────────────────────────────────────────────────

describe("setUnauthorizedHandler", () => {
  it("replaces the default 401 callback", async () => {
    const custom = vi.fn();
    setUnauthorizedHandler(custom);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      })
    );

    await apiFetch("/api/anything");
    expect(custom).toHaveBeenCalledOnce();
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

  it("returns the correct slice for page 1", () => {
    const result = paginate(items, 1, 10);
    expect(result.data).toHaveLength(10);
    expect(result.data[0].id).toBe(1);
    expect(result.page).toBe(1);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
  });

  it("clamps page 0 to page 1 — core bug fix", () => {
    const result = paginate(items, 0, 10);
    expect(result.page).toBe(1);
    expect(result.data[0].id).toBe(1);
  });

  it("handles transition from page 1 to page 0 without underflow", () => {
    const pageOne = paginate(items, 1, 10);
    expect(pageOne.page).toBe(1);
    expect(pageOne.data[0].id).toBe(1);

    const nextState = paginate(items, pageOne.page - 1, 10);
    expect(nextState.page).toBe(1);
    expect(nextState.data[0].id).toBe(1);
  });

  it("clamps negative page numbers to page 1", () => {
    const result = paginate(items, -5, 10);
    expect(result.page).toBe(1);
    expect(result.data[0].id).toBe(1);
  });

  it("clamps page beyond totalPages to the last page", () => {
    const result = paginate(items, 99, 10);
    expect(result.page).toBe(3);
    expect(result.data[0].id).toBe(21);
  });

  it("returns correct slice for a middle page", () => {
    const result = paginate(items, 2, 10);
    expect(result.data[0].id).toBe(11);
    expect(result.data).toHaveLength(10);
  });

  it("handles an empty array without throwing", () => {
    const result = paginate([], 1, 10);
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it("uses defaults (page=1, limit=10) when called with no args", () => {
    const result = paginate(items);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});

describe("api object - List methods with pagination", () => {
  it("customers.list returns paginated results", async () => {
    const result = await api.customers.list(1, 2);
    expect(result.data).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.total).toBeGreaterThan(2);
  });

  it("invoices.list returns paginated results", async () => {
    const result = await api.invoices.list(1, 1);
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.total).toBeGreaterThan(1);
  });

  it("checkouts.list returns paginated results", async () => {
    const result = await api.checkouts.list(2, 1);
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.total).toBeGreaterThan(1);
  });

  it("items.list returns paginated results", async () => {
    const result = await api.items.list(1, 3);
    expect(result.data).toHaveLength(3);
    expect(result.page).toBe(1);
    expect(result.total).toBeGreaterThan(3);
  });
});
