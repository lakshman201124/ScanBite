import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PLAN_LIMITS } from "./plans";

export type PlanFeature = 
  | "tables"
  | "menu_items"
  | "games"
  | "bluetooth_printing"
  | "whatsapp_billing"
  | "analytics";

export async function checkPlanLimit(feature: PlanFeature) {
  const session = await auth();
  if (!session?.user?.restaurantId) return { allowed: false, reason: "unauthorized" };
  const restaurantId = session.user.restaurantId;
  
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { 
      plan: true, 
      _count: { 
        select: { 
          tables: true, 
          menu_items: true 
        } 
      } 
    }
  });
  
  if (!restaurant) return { allowed: false, reason: "restaurant_not_found" };

  const limits = PLAN_LIMITS[restaurant.plan];

  if (feature === "tables") {
    if (restaurant._count.tables >= limits.maxTables) {
      return { allowed: false, reason: "limit_reached", limit: limits.maxTables };
    }
  }
  
  if (feature === "menu_items") {
    if (restaurant._count.menu_items >= limits.maxMenuItems) {
      return { allowed: false, reason: "limit_reached", limit: limits.maxMenuItems };
    }
  }

  if (feature === "games" && !limits.gamesEnabled) {
    return { allowed: false, reason: "requires_upgrade" };
  }

  if (feature === "bluetooth_printing" && !limits.bluetoothPrinting) {
    return { allowed: false, reason: "requires_upgrade" };
  }

  if (feature === "whatsapp_billing" && !limits.whatsappBilling) {
    return { allowed: false, reason: "requires_upgrade" };
  }

  return { allowed: true };
}
