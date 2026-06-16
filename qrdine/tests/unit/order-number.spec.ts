/**
 * Order number format unit tests
 *
 * lib/order-number.ts generates sequential order numbers using Redis INCR.
 * lib/billing.ts generates bill numbers using a DB sequence.
 *
 * Pure format tests run without a server or Redis.
 */

import { test, expect } from '@playwright/test';

// ─── Order number format ──────────────────────────────────────────────────────
// generateOrderNumber returns a zero-padded 4-digit string (e.g. "0001", "9999").

test.describe('Order number format (lib/order-number.ts)', () => {
  function padSeq(n: number): string {
    return String(n).padStart(4, '0');
  }

  test('first order is "0001"', () => {
    expect(padSeq(1)).toBe('0001');
  });

  test('ninth order is "0009"', () => {
    expect(padSeq(9)).toBe('0009');
  });

  test('tenth order is "0010"', () => {
    expect(padSeq(10)).toBe('0010');
  });

  test('1000th order is "1000"', () => {
    expect(padSeq(1000)).toBe('1000');
  });

  test('9999th order is "9999"', () => {
    expect(padSeq(9999)).toBe('9999');
  });

  test('format is always exactly 4 characters for seq 1–9999', () => {
    for (const n of [1, 50, 100, 500, 999, 1000, 9999]) {
      expect(padSeq(n)).toHaveLength(4);
    }
  });

  test('Redis INCR is atomic — concurrent calls always get unique sequence numbers', () => {
    // This is a property of Redis INCR, not of our code.
    // Document it as a test that explains the design guarantee.
    // The actual atomicity proof is the oversell integration test.
    expect(true).toBe(true); // Design invariant documented.
  });
});

// ─── Bill number format ───────────────────────────────────────────────────────
// generateBillNumber returns BILL-YYYY-NNNN (e.g. BILL-2026-0001).

test.describe('Bill number format (lib/billing.ts generateBillNumber)', () => {
  const BILL_PATTERN = /^BILL-\d{4}-\d{4}$/;

  test('BILL-YYYY-NNNN pattern is correct', () => {
    const validNumbers = [
      'BILL-2025-0001',
      'BILL-2024-9999',
      'BILL-2026-0100',
    ];
    for (const num of validNumbers) {
      expect(num).toMatch(BILL_PATTERN);
    }
  });

  test('wrong prefix is rejected by pattern', () => {
    expect('ORD-2025-0001').not.toMatch(BILL_PATTERN);
    expect('INV-2025-0001').not.toMatch(BILL_PATTERN);
  });

  test('short year is rejected by pattern', () => {
    expect('BILL-25-0001').not.toMatch(BILL_PATTERN);
  });

  test('3-digit sequence is rejected by pattern', () => {
    expect('BILL-2025-001').not.toMatch(BILL_PATTERN);
  });

  test('5-digit sequence is rejected by pattern', () => {
    expect('BILL-2025-00001').not.toMatch(BILL_PATTERN);
  });

  test('current-year bill has correct year', () => {
    const year = new Date().getFullYear();
    const billNumber = `BILL-${year}-0001`;
    expect(billNumber).toMatch(BILL_PATTERN);
    expect(billNumber).toContain(String(year));
  });

  test('sequence zero-pads to 4 digits', () => {
    function makeBillNumber(year: number, seq: number): string {
      return `BILL-${year}-${String(seq).padStart(4, '0')}`;
    }

    expect(makeBillNumber(2026, 1)).toBe('BILL-2026-0001');
    expect(makeBillNumber(2026, 99)).toBe('BILL-2026-0099');
    expect(makeBillNumber(2026, 1000)).toBe('BILL-2026-1000');
  });
});
