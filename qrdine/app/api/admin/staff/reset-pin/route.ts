export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueSetupCode } from "@/lib/setup-code";
import { auditLog } from "@/lib/audit";
import { captureException } from "@/lib/sentry";
import { z } from "zod";

const schema = z.object({ staffId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { restaurantId } = session.user;

    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const { staffId } = parsed.data;

    const staff = await prisma.user.findFirst({
      where: { id: staffId, restaurant_id: restaurantId, role: { in: ["chef", "waiter"] } },
      select: { id: true, name: true, role: true },
    });
    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff member not found." }, { status: 404 });
    }

    // Revoke the old PIN and deactivate until the staff member redeems a fresh
    // setup code and sets a new PIN. The admin never sees the PIN.
    await prisma.user.update({
      where: { id: staffId },
      data: { pin_hash: null, is_active: false, login_attempts: 0, locked_until: null },
    });

    const setupCode = await issueSetupCode(staffId);

    await auditLog({
      restaurantId,
      userId: session.user.id ?? "",
      action: "staff.pin_reset",
      entityType: "user",
      entityId: staffId,
      newValue: { name: staff.name, role: staff.role },
    });

    return NextResponse.json({
      success: true,
      data: { staffId: staff.id, name: staff.name, role: staff.role, setupCode },
    });
  } catch (err) {
    console.error("[POST /api/admin/staff/reset-pin]", err);
    captureException(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
