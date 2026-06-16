export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { captureException } from "@/lib/sentry";

function generateCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await prisma.restaurant.findFirst({
      where: { staff_login_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return generateCode(8);
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const code = await uniqueCode();

    const restaurantId = session.user.restaurantId;

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { staff_login_code: code },
    });

    await auditLog({
      restaurantId,
      userId: session.user.id ?? "",
      action: "restaurant.login_code_regenerated",
      entityType: "restaurant",
      entityId: restaurantId,
    });

    return NextResponse.json({ success: true, data: { staff_login_code: code } });
  } catch (err) {
    console.error("[POST /api/admin/settings/login-code]", err);
    captureException(err);
    return NextResponse.json({ success: false, error: "Failed to generate code" }, { status: 500 });
  }
}
