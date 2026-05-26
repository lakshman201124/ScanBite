import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkStaffPhoneSchema } from "@/lib/validations/restaurant";
import { error, validationError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = checkStaffPhoneSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { phone } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { phone, role: { in: ["chef", "waiter"] }, is_active: true },
      select: { name: true, role: true, pin_hash: true },
    });

    if (!user) {
      return NextResponse.json({ success: true, data: { registered: false } });
    }

    return NextResponse.json({
      success: true,
      data: {
        registered: true,
        hasPin: !!user.pin_hash,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[check-staff]", err);
    return error("Check failed", 500);
  }
}
