// @ts-nocheck
import { describe, it, expect } from "vitest";
import { toUtcMidnightIso, formatUtcDate } from "../utils/date";

describe("date utils", () => {
  describe("toUtcMidnightIso", () => {
    it("converts YYYY-MM-DD to UTC midnight ISO", () => {
      expect(toUtcMidnightIso("2025-12-31")).toBe("2025-12-31T00:00:00.000Z");
    });

    it("returns empty string for invalid input", () => {
      expect(toUtcMidnightIso("")).toBe("");
      expect(toUtcMidnightIso("2025/12/31")).toBe("");
      expect(toUtcMidnightIso("2025-1-31")).toBe("");
      expect(toUtcMidnightIso(null)).toBe("");
    });
  });

  describe("formatUtcDate", () => {
    // --- Existing behavior (Default) ---
    it("formats legacy YYYY-MM-DD as-is", () => {
      expect(formatUtcDate("2025-12-31")).toBe("2025-12-31");
    });

    it("formats ISO with explicit Z using UTC components", () => {
      expect(formatUtcDate("2025-12-31T23:59:59.000Z")).toBe("2025-12-31");
      expect(formatUtcDate("2026-01-01T00:00:01.000Z")).toBe("2026-01-01");
    });

    it("avoids parsing ISO without timezone designator", () => {
      expect(formatUtcDate("2025-12-31T10:00:00.000")).toBe("2025-12-31");
    });

    // --- New behavior (Localized) ---
    describe("localized formatting", () => {
      it("returns a localized date string when localized flag is true", () => {
        const isoString = "2026-03-27T12:00:00.000Z";
        const formatted = formatUtcDate(isoString, true);

        // We check for the presence of '2026' to verify it parsed correctly.
        // Exact string depends on the test runner's locale (e.g., "Mar 27, 2026").
        expect(formatted).toContain("2026");
        expect(typeof formatted).toBe("string");
      });

      it("returns empty string for invalid inputs when localized", () => {
        expect(formatUtcDate("", true)).toBe("");
        expect(formatUtcDate(null, true)).toBe("");
        expect(formatUtcDate("not-a-date", true)).toBe("");
      });
    });
  });
});
