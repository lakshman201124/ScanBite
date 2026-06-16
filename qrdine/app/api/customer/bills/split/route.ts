export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { validateCustomerSession } from "@/lib/session";
import { z } from "zod";
import { success, error } from "@/lib/api-response";

const splitSchema = z.object({
  order_id: z.string().min(1),
  mode: z.enum(["equal", "by_item", "custom"]),
  // equal
  people: z.number().int().min(2).max(20).optional(),
  // by_item: array of { person_index, item_ids }
  assignments: z
    .array(z.object({ person_index: z.number().int().min(0), item_ids: z.array(z.string()) }))
    .optional(),
  // custom: array of amounts (must sum to total)
  custom_amounts: z.array(z.number().min(0)).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) return error("Session required", 401);

    const session = await validateCustomerSession(sessionToken);
    if (!session) return error("Session expired", 401);

    const body: unknown = await request.json();
    const parsed = splitSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);

    const { order_id, mode, people, assignments, custom_amounts } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: order_id, restaurant_id: session.restaurantId },
      include: {
        items: { select: { id: true, item_name: true, item_price: true, quantity: true } },
        bill: { select: { total: true, cgst_rate: true, sgst_rate: true } },
      },
    });

    if (!order) return error("Order not found", 404);
    if (!order.bill) return error("Bill not generated yet", 400);

    const totalAmount = Number(order.bill.total);
    const cgstRate = Number(order.bill.cgst_rate);
    const sgstRate = Number(order.bill.sgst_rate);
    const taxMultiplier = 1 + (cgstRate + sgstRate) / 100;

    if (mode === "equal") {
      if (!people || people < 2) return error("People count required for equal split", 400);
      const share = Math.round((totalAmount / people) * 100) / 100;
      const splits = Array.from({ length: people }, (_, i) => ({
        person: i + 1,
        amount: i === people - 1 ? Math.round((totalAmount - share * (people - 1)) * 100) / 100 : share,
        items: null,
      }));
      return success({ mode, total: totalAmount, splits });
    }

    if (mode === "by_item") {
      if (!assignments) return error("Assignments required for by-item split", 400);
      const itemMap = new Map(order.items.map((i) => [i.id, i]));
      const personTotals: Record<number, { items: string[]; subtotal: number }> = {};

      for (const { person_index, item_ids } of assignments) {
        if (!personTotals[person_index]) personTotals[person_index] = { items: [], subtotal: 0 };
        for (const itemId of item_ids) {
          const item = itemMap.get(itemId);
          if (!item) continue;
          personTotals[person_index].items.push(item.item_name);
          personTotals[person_index].subtotal += Number(item.item_price) * item.quantity;
        }
      }

      const splits = Object.entries(personTotals).map(([idx, { items, subtotal }]) => ({
        person: parseInt(idx) + 1,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        amount: Math.round(subtotal * taxMultiplier * 100) / 100,
      }));

      return success({ mode, total: totalAmount, splits });
    }

    if (mode === "custom") {
      if (!custom_amounts) return error("Custom amounts required", 400);
      const sum = custom_amounts.reduce((s, a) => s + a, 0);
      const diff = Math.abs(sum - totalAmount);
      if (diff > 1) return error(`Custom amounts (${sum.toFixed(2)}) must sum to total (${totalAmount.toFixed(2)})`, 400);

      const splits = custom_amounts.map((amount, i) => ({ person: i + 1, amount, items: null }));
      return success({ mode, total: totalAmount, splits });
    }

    return error("Invalid split mode", 400);
  } catch (err) {
    console.error("[POST /api/customer/bills/split]", err);
    return error("Failed to calculate split", 500);
  }
}
