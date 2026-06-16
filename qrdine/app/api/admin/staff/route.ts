export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error, unauthorized } from "@/lib/api-response";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { issueSetupCode } from "@/lib/setup-code";
import { auditLog } from "@/lib/audit";
import { captureException } from "@/lib/sentry";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const staff = await prisma.user.findMany({
      where: { restaurant_id: restaurantId, role: { in: [UserRole.chef, UserRole.waiter] } },
      select: {
        id: true, name: true, email: true, role: true, is_active: true, created_at: true,
        pin_hash: true, setup_code_expires_at: true,
      },
      orderBy: { created_at: "desc" },
    });
    // Never leak the hash — expose only whether a PIN is set / setup is pending.
    const shaped = staff.map(({ pin_hash, setup_code_expires_at, ...s }) => ({
      ...s,
      has_pin: pin_hash !== null,
      setup_pending: setup_code_expires_at !== null && setup_code_expires_at > new Date(),
    }));
    return success(shaped);
  } catch (err) {
    console.error("[GET /api/admin/staff]", err);
    return error("Failed to fetch staff", 500);
  }
}

// Onboard staff with name + role only. The admin never sets the PIN — instead we
// issue a one-time setup code the staff member redeems to set their own PIN.
const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  role: z.enum(["chef", "waiter"]).default("chef"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid data", 400);
    const { name, role } = parsed.data;

    const staff = await prisma.user.create({
      data: {
        restaurant_id: restaurantId,
        name,
        // Synthetic, collision-free email — staff identity is name + restaurant, not email.
        email: `staff_${randomUUID()}@scanbite.local`,
        role: role as UserRole,
        is_active: false,
      },
      select: { id: true, name: true, role: true },
    });

    const setupCode = await issueSetupCode(staff.id);

    await auditLog({
      restaurantId,
      userId: session.user.id ?? "",
      action: "staff.created",
      entityType: "user",
      entityId: staff.id,
      newValue: { name: staff.name, role: staff.role },
    });

    return success({ id: staff.id, name: staff.name, role: staff.role, setupCode }, 201);
  } catch (err) {
    console.error("[POST /api/admin/staff]", err);
    captureException(err);
    return error("Failed to create staff member", 500);
  }
}

const updateStaffSchema = z.object({
  id:        z.string().min(1),
  name:      z.string().min(2).max(100).optional(),
  is_active: z.boolean().optional(),
  role:      z.enum(["chef", "waiter"]).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid data", 400);
    const { id, name, is_active, role } = parsed.data;
    const staffMember = await prisma.user.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!staffMember) return error("Staff member not found", 404);
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (is_active !== undefined) data.is_active = is_active;
    if (role !== undefined) data.role = role as UserRole;
    const updated = await prisma.user.update({
      where: { id }, data,
      select: { id: true, name: true, role: true, is_active: true },
    });

    await auditLog({
      restaurantId,
      userId: session.user.id ?? "",
      action: "staff.updated",
      entityType: "user",
      entityId: id,
      oldValue: { name: staffMember.name, role: staffMember.role, is_active: staffMember.is_active },
      newValue: data,
    });

    return success(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/staff]", err);
    captureException(err);
    return error("Failed to update staff member", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return error("Missing ID", 400);
    const staffMember = await prisma.user.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!staffMember) return error("Staff member not found", 404);
    await prisma.user.delete({ where: { id } });

    await auditLog({
      restaurantId,
      userId: session.user.id ?? "",
      action: "staff.deleted",
      entityType: "user",
      entityId: id,
      oldValue: { name: staffMember.name, role: staffMember.role },
    });

    return success({ message: "Staff member deleted successfully" });
  } catch (err) {
    console.error("[DELETE /api/admin/staff]", err);
    captureException(err);
    return error("Failed to delete staff member", 500);
  }
}
