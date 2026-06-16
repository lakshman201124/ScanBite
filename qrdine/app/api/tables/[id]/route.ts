export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateTableSchema } from "@/lib/validations/menu";
import { success, error, validationError, unauthorized } from "@/lib/api-response";
import { v4 as uuidv4 } from "uuid";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const body: unknown = await request.json();

    if ((body as Record<string, unknown>).regenerate_qr) {
      const table = await prisma.restaurantTable.update({
        where: { id, restaurant_id: restaurantId },
        data: { qr_token: uuidv4() },
      });
      return success(table);
    }

    const parsed = updateTableSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const table = await prisma.restaurantTable.update({
      where: { id, restaurant_id: restaurantId },
      data: {
        ...(parsed.data.table_number && { table_number: parsed.data.table_number }),
        ...(parsed.data.capacity && { capacity: parsed.data.capacity }),
        ...(parsed.data.status && { status: parsed.data.status }),
      },
    });

    return success(table);
  } catch (err) {
    console.error("[PATCH /api/tables/:id]", err);
    return error("Failed to update table", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const table = await prisma.restaurantTable.findFirst({
      where: { id, restaurant_id: restaurantId },
      include: {
        orders: {
          where: { payment_status: "unpaid" },
          select: { id: true },
        },
      },
    });

    if (!table) return error("Table not found", 404);

    if (table.status === "occupied" || table.orders.length > 0) {
      return error("Cannot delete an occupied table", 409);
    }

    await prisma.restaurantTable.delete({ where: { id, restaurant_id: restaurantId } });
    return success({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/tables/:id]", err);
    return error("Failed to delete table", 500);
  }
}
