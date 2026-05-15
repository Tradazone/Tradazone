// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildCheckoutsListCsv,
  buildCheckoutDetailCsv,
  downloadCsvFile,
} from '../utils/checkoutCsv';

describe('checkoutCsv (Issue #138)', () => {
  const sampleCheckout = {
    id: 'CHK-001',
    title: 'A, B',
    description: 'Say "hello"',
    amount: '10',
    currency: 'STRK',
    status: 'paid',
    views: 1,
    payments: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    paymentLink: 'https://example.com/pay',
  };

  it('buildCheckoutsListCsv escapes commas and quotes', () => {
    const csv = buildCheckoutsListCsv([sampleCheckout]);
    expect(csv).toContain('"A, B"');
    expect(csv).toContain('"Say ""hello"""');
  });

  it('buildCheckoutDetailCsv produces a two-column summary', () => {
    const csv = buildCheckoutDetailCsv(sampleCheckout);
    expect(csv.split('\n')[0]).toBe('Field,Value');
    expect(csv).toContain('Status,paid');
  });

  describe('downloadCsvFile', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();

    beforeEach(() => {
      Object.defineProperty(globalThis.URL, 'createObjectURL', {
        value: createObjectURL,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
        value: revokeObjectURL,
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('creates a blob, triggers download, and revokes the object URL', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadCsvFile('test.csv', 'a,b');

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
      clickSpy.mockRestore();
    });
  });
});
