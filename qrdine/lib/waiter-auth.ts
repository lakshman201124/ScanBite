import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth";
import { getAuthSecretKey } from "@/lib/secret";

const JWT_SECRET = getAuthSecretKey();

export type StaffContext = {
  restaurantId: string;
  userId: string;
  role: string;
};

/**
 * Resolves auth context from either a NextAuth session (admin/super_admin)
 * or a waiter/chef chef_token JWT cookie. Returns null if unauthenticated.
 */
export async function resolveStaffAuth(req: NextRequest): Promise<StaffContext | null> {
  // Try NextAuth session first (admin dashboard flows)
  const session = await auth();
  if (session?.user?.restaurantId) {
    return {
      restaurantId: session.user.restaurantId,
      userId: session.user.id ?? "",
      role: session.user.role ?? "admin",
    };
  }

  // Fall back to chef_token JWT (waiter / chef OTP login)
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)chef_token=([^;]+)/);
  const token = match?.[1];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const restaurantId = payload.restaurantId as string | undefined;
    const userId = payload.sub as string | undefined;
    const role = payload.role as string | undefined;
    if (!restaurantId || !userId || !role) return null;
    return { restaurantId, userId, role };
  } catch {
    return null;
  }
}
