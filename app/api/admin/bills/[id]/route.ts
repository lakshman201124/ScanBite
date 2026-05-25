import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return error("Unauthorized", 401);
    const restaurantId = session.user.restaurantId;
    const { id } = await params;

    const bill = await prisma.bill.findFirst({
      where: { id, restaurant_id: restaurantId },
      include: {
        order: {
          include: {
            items: true,
            table: { select: { table_number: true } },
          },
        },
      },
    });

    if (!bill) return error("Bill not found", 404);

    return success(bill);
  } catch (err) {
    console.error("[GET /api/admin/bills/[id]]", err);
    return error("Failed to fetch bill", 500);
  }
}
