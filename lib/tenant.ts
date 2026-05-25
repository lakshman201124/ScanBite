import { TenantError } from "@/lib/errors";

export function tenantScope(restaurantId: string | null | undefined) {
  if (!restaurantId) {
    throw new TenantError();
  }
  return { restaurant_id: restaurantId };
}

export function getTenantId(request: Request): string {
  const restaurantId = request.headers.get("x-restaurant-id");
  if (!restaurantId) {
    throw new TenantError(
      "CRITICAL: x-restaurant-id header missing — tenant isolation breach"
    );
  }
  return restaurantId;
}
