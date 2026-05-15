// @ts-nocheck
/**
 * Checkout CSV export (Issue #138)
 *
 * Problem: The checkout flow had no way to export checkout data for reporting,
 * accounting handoffs, or offline analysis.
 * Resolution: Shared CSV escaping, list/detail builders, and a small download helper
 * used by CheckoutList and CheckoutDetail.
 */
import { formatUtcDate } from './date';

export function escapeCsvField(value) {
  const normalized = value == null ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function buildCheckoutsListCsv(checkouts) {
  const headers = [
    'ID',
    'Title',
    'Description',
    'Amount',
    'Currency',
    'Status',
    'Views',
    'Payments',
    'Created (UTC)',
    'Payment Link',
  ];
  const dataRows = checkouts.map((c) => [
    c.id,
    c.title,
    c.description ?? '',
    c.amount,
    c.currency,
    c.status,
    c.views,
    c.payments,
    formatUtcDate(c.createdAt),
    c.paymentLink ?? '',
  ]);
  return [headers, ...dataRows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

export function buildCheckoutDetailCsv(checkout) {
  const rows = [
    ['Field', 'Value'],
    ['ID', checkout.id],
    ['Title', checkout.title],
    ['Description', checkout.description ?? ''],
    ['Amount', checkout.amount],
    ['Currency', checkout.currency],
    ['Status', checkout.status],
    ['Views', String(checkout.views)],
    ['Payments', String(checkout.payments)],
    ['Created (UTC)', formatUtcDate(checkout.createdAt)],
    ['Payment Link', checkout.paymentLink ?? ''],
  ];
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

export function downloadCsvFile(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
