export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { success, error, unauthorized } from "@/lib/api-response";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const onboardingSchema = z.object({
  // Profile
  name: z.string().min(2).max(100),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().optional().nullable(),
  
  // Brand
  logo_url: z.string().optional().nullable(),
  brand_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().nullable(),
  
  // Tax
  gstin: z.string().optional().nullable(),
  cgst_rate: z.number().default(2.5),
  sgst_rate: z.number().default(2.5),
  
  // First Category
  categoryName: z.string().min(2),
  
  // First 3 Items
  menuItems: z.array(z.object({
    name: z.string().min(2),
    price: z.number().min(0),
    description: z.string().optional().nullable(),
    food_type: z.enum(["veg", "non_veg", "egg", "vegan"]).default("veg"),
    image_url: z.string().optional().nullable()
  })).min(1),
  
  // Tables
  tables: z.array(z.object({
    table_number: z.string().min(1),
    capacity: z.number().int().min(1).default(4)
  })).min(1),
  
  // Chef Setup
  chefName: z.string().min(2),
  chefPhone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid chef phone number"),
  chefEmail: z.string().email().optional().or(z.literal("")),
  chefPin: z.string().regex(/^\d{4,6}$/).optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.restaurantId) return unauthorized();
    const restaurantId = session.user.restaurantId;

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);
    
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message || "Invalid onboarding data", 400);
    }

    const data = parsed.data;

    // Pin hash for chef — optional (chef login uses phone OTP, not PIN)
    const pin_hash = data.chefPin ? await bcrypt.hash(data.chefPin, 12) : null;

    // Save everything in a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Restaurant details
      const updatedRestaurant = await tx.restaurant.update({
        where: { id: restaurantId },
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          logo_url: data.logo_url,
          brand_color: data.brand_color || "#FF4D3D",
          gstin: data.gstin,
          cgst_rate: data.cgst_rate,
          sgst_rate: data.sgst_rate,
          onboarded: true
        }
      });

      // 2. Create first category
      const category = await tx.menuCategory.create({
        data: {
          restaurant_id: restaurantId,
          name: data.categoryName,
          is_active: true,
          sort_order: 0
        }
      });

      // 3. Create items
      for (const item of data.menuItems) {
        await tx.menuItem.create({
          data: {
            restaurant_id: restaurantId,
            category_id: category.id,
            name: item.name,
            price: item.price,
            description: item.description,
            food_type: item.food_type,
            image_url: item.image_url,
            is_available: true,
            sort_order: 0
          }
        });
      }

      // 4. Create Tables
      for (const table of data.tables) {
        await tx.restaurantTable.create({
          data: {
            restaurant_id: restaurantId,
            table_number: table.table_number,
            capacity: table.capacity,
            status: "available"
          }
        });
      }

      // 5. Create Chef User — phone is required for OTP-based chef login
      const chef = await tx.user.create({
        data: {
          restaurant_id: restaurantId,
          name: data.chefName,
          phone: data.chefPhone,
          email: data.chefEmail || `${data.chefPhone.replace(/\D/g, "")}@chef.scanbite.app`,
          pin_hash: pin_hash,
          role: UserRole.chef,
          is_active: true
        }
      });

      return {
        restaurant: updatedRestaurant,
        category,
        chefId: chef.id
      };
    });

    return success({ message: "Restaurant successfully onboarded", data: result });
  } catch (err) {
    console.error("[POST /api/admin/onboarding]", err);
    return error("Failed to onboard restaurant. Check logs.", 500);
  }
}
