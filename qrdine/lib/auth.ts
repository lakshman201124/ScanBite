import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { supabaseAdmin } from "@/lib/supabase";
import { loginSchema } from "@/lib/validations/restaurant";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id, restaurant_id, name, email, password_hash, role, is_active")
          .eq("email", email)
          .in("role", ["admin", "super_admin"])
          .eq("is_active", true)
          .maybeSingle();

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return null;

        return {
          id: user.id,
          restaurantId: user.restaurant_id,
          role: user.role as UserRole,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
});
