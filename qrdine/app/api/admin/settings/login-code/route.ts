import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data: { staff_login_code: code },
    });

    return NextResponse.json({ success: true, data: { staff_login_code: code } });
  } catch (err) {
    console.error("[POST /api/admin/settings/login-code]", err);
    return NextResponse.json({ success: false, error: "Failed to generate code" }, { status: 500 });
  }
}
