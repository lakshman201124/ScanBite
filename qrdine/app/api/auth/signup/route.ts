import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { signupSchema } from "@/lib/validations/restaurant";
import { success, error, validationError } from "@/lib/api-response";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const { data } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { restaurantName, email, password } = parsed.data;
    const phone = parsed.data.phone || null;

    // Check duplicate email
    const { data: existingEmail } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      return error("An account with this email already exists", 409);
    }

    // Check duplicate phone only when one was supplied
    if (phone) {
      const { data: existingPhone } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (existingPhone) {
        return error("An account with this phone number already exists", 409);
      }
    }

    const password_hash = await bcrypt.hash(password, 12);
    const slug = await uniqueSlug(toSlug(restaurantName));
    const restaurantId = uuidv4();
    const now = new Date().toISOString();

    const { data: restaurant, error: restaurantErr } = await supabaseAdmin
      .from("restaurants")
      .insert({
        id: restaurantId,
        name: restaurantName,
        slug,
        phone,
        updated_at: now,
      })
      .select()
      .single();

    if (restaurantErr) throw restaurantErr;

    const { error: userErr } = await supabaseAdmin.from("users").insert({
      id: uuidv4(),
      restaurant_id: restaurantId,
      name: restaurantName,
      email,
      password_hash,
      phone,
      role: "admin",
      updated_at: now,
    });

    if (userErr) throw userErr;

    return success({ restaurantId: restaurant.id, slug: restaurant.slug }, 201);
  } catch (err) {
    console.error("[signup]", JSON.stringify(err));
    return error("Account creation failed. Please try again.", 500);
  }
}
