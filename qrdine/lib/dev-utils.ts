import { TenantError } from "@/lib/errors";

export function logTenant(context: { restaurantId?: string; route?: string }) {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[TENANT] ${context.route ?? "unknown"} → restaurant_id: ${context.restaurantId ?? "MISSING"}`
    );
  }
}

export function assertTenant(restaurantId: string | null | undefined): asserts restaurantId is string {
  if (!restaurantId) {
    throw new TenantError();
  }
}
