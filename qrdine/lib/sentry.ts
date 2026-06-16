import * as Sentry from "@sentry/nextjs";

/**
 * Capture an exception tagged with the tenant's restaurant_id so
 * Sentry issues can be filtered per restaurant. Never put PII here —
 * tags are indexed and visible in the dashboard.
 */
export function captureWithRestaurant(
  err: unknown,
  restaurantId: string,
  extra?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    scope.setTag("restaurant_id", restaurantId);
    if (extra) scope.setExtras(extra);
    Sentry.captureException(err);
  });
}

export function captureException(err: unknown): void {
  Sentry.captureException(err);
}
