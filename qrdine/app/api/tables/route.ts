import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { tenantScope } from "@/lib/tenant";
import { createTableSchema } from "@/lib/validations/menu";
import { success, error, validationError, unauthorized } from "@/lib/api-response";
import { resolveStaffAuth } from "@/lib/waiter-auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return unauthorized();
    const restaurantId = ctx.restaurantId;

    const tables = await prisma.restaurantTable.findMany({
      where: { ...tenantScope(restaurantId) },
      orderBy: { table_number: "asc" },
    });

    return success(tables);
  } catch (err) {
    console.error("[GET /api/tables]", err);
    return error("Failed to fetch tables", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveStaffAuth(request);
    if (!ctx) return unauthorized();
    const restaurantId = ctx.restaurantId;

    const body: unknown = await request.json();
    const parsed = createTableSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const exists = await prisma.restaurantTable.findFirst({
      where: { restaurant_id: restaurantId, table_number: parsed.data.table_number },
    });
    if (exists) return error("Table number already exists", 409);

    const table = await prisma.restaurantTable.create({
      data: {
        ...tenantScope(restaurantId),
        table_number: parsed.data.table_number,
        capacity: parsed.data.capacity,
        qr_token: uuidv4(),
      },
    });

    return success(table, 201);
  } catch (err) {
    console.error("[POST /api/tables]", err);
    return error("Failed to create table", 500);
  }
}
