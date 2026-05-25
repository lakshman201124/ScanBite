import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error, unauthorized } from "@/lib/api-response";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number");

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const staff = await prisma.user.findMany({
      where: { restaurant_id: restaurantId, role: { in: [UserRole.chef, UserRole.waiter] } },
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true, created_at: true },
      orderBy: { created_at: "desc" },
    });
    return success(staff);
  } catch (err) {
    console.error("[GET /api/admin/staff]", err);
    return error("Failed to fetch staff", 500);
  }
}

const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  role: z.enum(["chef", "waiter"]).default("chef"),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid data", 400);
    const { name, phone, role, email } = parsed.data;

    const existingPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingPhone) return error("A staff member with this phone number already exists", 400);

    const newStaff = await prisma.user.create({
      data: {
        restaurant_id: restaurantId,
        name,
        phone,
        email: email || `${phone.replace(/\D/g, "")}@staff.scanbite.app`,
        role: role as UserRole,
        is_active: true,
      },
      select: { id: true, name: true, phone: true, role: true, is_active: true },
    });
    return success(newStaff, 201);
  } catch (err) {
    console.error("[POST /api/admin/staff]", err);
    return error("Failed to create staff member", 500);
  }
}

const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  is_active: z.boolean().optional(),
  role: z.enum(["chef", "waiter"]).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;
    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid data", 400);
    const { id, name, phone, is_active, role } = parsed.data;
    const staffMember = await prisma.user.findFirst({ where: { id, restaurant_id: restaurantId } });
    if (!staffMember) return error("Staff member not found", 404);
    if (phone && phone !== staffMember.phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone } });
      if (existingPhone) return error("Phone number already in use", 400);
    }
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (is_active !== undefined) data.is_active = is_active;
    if (role !== undefined) data.role = role as UserRole;
    const updated = await prisma.user.update({
      where: { id }, data,
      select: { id: true, name: true, phone: true, role: true, is_active: true },
    });
    return success(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/staff]", err);
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
    await prisma.user.update({ where: { id }, data: { is_active: false } });
    return success({ message: "Staff member deactivated successfully" });
  } catch (err) {
    console.error("[DELETE /api/admin/staff]", err);
    return error("Failed to delete staff member", 500);
  }
}
