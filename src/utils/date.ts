// @ts-nocheck
/**
 * Date utilities for timezone-stable date handling.
 *
 * ISSUE (Date parsing inconsistent across timezones):
 * - Storing or parsing ambiguous `YYYY-MM-DD` strings using `new Date(value)`
 * can shift the day depending on the runtime timezone.
 * - This module provides helpers that avoid `new Date(dateOnly)` for
 * date-only values, and standardize display using UTC or local browser settings.
 */

/**
 * Convert a `YYYY-MM-DD` string into a UTC-pinned ISO timestamp string.
 *
 * @param {string} dateOnly - Date-only in `YYYY-MM-DD` format.
 * @returns {string} ISO string pinned to UTC midnight, e.g. `2025-12-31T00:00:00.000Z`.
 */
export function toUtcMidnightIso(dateOnly) {
  if (!dateOnly || typeof dateOnly !== "string") return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly.trim());
  if (!match) return "";
  return `${match[0]}T00:00:00.000Z`;
}

/**
 * Format an ISO timestamp (or legacy `YYYY-MM-DD`) into a stable display string.
 *
 * @param {string|null|undefined} value
 * @param {boolean} localized - If true, converts UTC to user's local timezone.
 * @returns {string}
 */
export function formatUtcDate(value, localized = false) {
  if (!value || typeof value !== "string") return "";

  const trimmed = value.trim();

  // If localized display is requested, use Intl.DateTimeFormat
  if (localized) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  // Fallback/Legacy `YYYY-MM-DD` support (stable, no parsing).
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Fast-path: avoid parsing entirely when timezone is implicit to prevent shifts.
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const hasExplicitTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(trimmed);
    if (!hasExplicitTimezone) return trimmed.slice(0, 10);
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
