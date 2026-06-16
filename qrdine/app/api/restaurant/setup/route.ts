export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { restaurantSetupSchema } from "@/lib/validations/restaurant";
import { success, error, validationError, unauthorized } from "@/lib/api-response";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();

    const body: unknown = await request.json();
    const parsed = restaurantSetupSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const data = parsed.data;

    const restaurant = await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.gstin !== undefined && { gstin: data.gstin || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.logo_url !== undefined && { logo_url: data.logo_url || null }),
        onboarded: true,
      },
    });

    return success({ restaurant });
  } catch (err) {
    console.error("[restaurant/setup]", err);
    return error("Failed to update restaurant", 500);
  }
}
