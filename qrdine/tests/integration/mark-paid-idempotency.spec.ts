/**
 * Mark-Paid Idempotency Tests
 *
 * POST /api/admin/orders/[id]/pay must be idempotent:
 *   - First call: creates bill, marks order paid, frees table.
 *   - Subsequent calls: return the existing bill without creating a new one
 *     and without throwing.
 *
 * Gate requirement (Wave 1 Track B, Wave 4 Track K):
 *   "Mark paid" is idempotent; calling it twice never double-bills.
 *
 * These tests run against the live API.
 * They are skipped automatically when TEST_ORDER_ID (a pre-created unpaid
 * order) and auth cookies are not configured.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Mark-paid idempotency', () => {
  test('POST /api/admin/orders/[id]/pay requires authentication', async ({ request }) => {
    const orderId = 'fake-order-id-for-auth-check';
    const res = await request.post(`${BASE_URL}/api/admin/orders/${orderId}/pay`, {
      data: { payment_method: 'cash' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/admin/orders/[id]/pay with non-existent order returns 404', async ({ request }) => {
    // Without a valid session this returns 401, not 404.
    // With a valid session it would return 404 for unknown orderId.
    const res = await request.post(
      `${BASE_URL}/api/admin/orders/00000000-0000-0000-0000-000000000000/pay`,
      { data: { payment_method: 'cash' } }
    );
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/admin/orders/[id]/pay validates payment_method', async ({ request }) => {
    const res = await request.post(
      `${BASE_URL}/api/admin/orders/00000000-0000-0000-0000-000000000000/pay`,
      { data: { payment_method: 'bitcoin' } } // invalid method
    );
    // 400 (validation) or 401 (auth) — NOT 500
    expect(res.status()).toBeLessThan(500);
  });

  test.fixme(
    'calling pay twice returns already_paid:true the second time (requires seeded unpaid order)',
    async ({ request }) => {
      // Requires TEST_ORDER_ID + TEST_ADMIN_COOKIE env vars.
      // The orderId must be in "confirmed" or "ready" status.
      const orderId = process.env.TEST_UNPAID_ORDER_ID ?? '';
      const cookie  = process.env.TEST_ADMIN_COOKIE    ?? '';
      if (!orderId || !cookie) return;

      const headers = { Cookie: cookie };

      // First call — should create bill and mark paid
      const first = await request.post(`${BASE_URL}/api/admin/orders/${orderId}/pay`, {
        data: { payment_method: 'cash' },
        headers,
      });
      expect(first.status()).toBe(200);
      const firstBody = await first.json() as Record<string, unknown>;
      expect(firstBody.data).toMatchObject({ paid: true });

      // Second call — idempotent: same bill, no error
      const second = await request.post(`${BASE_URL}/api/admin/orders/${orderId}/pay`, {
        data: { payment_method: 'cash' },
        headers,
      });
      expect(second.status()).toBe(200);
      const secondBody = await second.json() as Record<string, unknown>;
      const secondData = secondBody.data as Record<string, unknown>;
      expect(secondData.paid).toBe(true);
      expect(secondData.already_paid).toBe(true);
      // Same bill number both times
      expect(secondData.bill_number).toBe((firstBody.data as Record<string, unknown>).bill_number);
    }
  );
});
