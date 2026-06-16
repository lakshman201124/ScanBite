export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createCustomerSession } from "@/lib/session";
import { error } from "@/lib/api-response";

function SESSION_COOKIE_OPTIONS(_req: NextRequest) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 2 * 60 * 60,
    path: "/",
  };
}

async function resolveTableAndRestaurant(slug: string, qrToken: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, is_active: true },
  });
  if (!restaurant) return { restaurant: null, table: null };

  const table = await prisma.restaurantTable.findFirst({
    where: { qr_token: qrToken, restaurant_id: restaurant.id },
  });
  return { restaurant, table };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const qrToken = searchParams.get("t");

    if (!slug || !qrToken) {
      return NextResponse.redirect(
        new URL(`/?error=missing-params`, request.url)
      );
    }

    // Default redirect to the customer menu page for this restaurant
    const returnTo = searchParams.get("return") ?? `/m/${slug}`;

    const { restaurant, table } = await resolveTableAndRestaurant(slug, qrToken);

    if (!restaurant) {
      return NextResponse.redirect(
        new URL(`/?error=not-found`, request.url)
      );
    }
    if (!table) {
      return NextResponse.redirect(
        new URL(`/m/${slug}?error=invalid-qr`, request.url)
      );
    }

    const sessionToken = await createCustomerSession(restaurant.id, table.id);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set("session_token", sessionToken, SESSION_COOKIE_OPTIONS(request));
    return response;
  } catch (err) {
    console.error("[session/create GET]", err);
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const qrToken = searchParams.get("t");

    if (!slug || !qrToken) {
      return error("Missing slug or token", 400);
    }

    const { restaurant, table } = await resolveTableAndRestaurant(slug, qrToken);
    if (!restaurant) return error("Restaurant not found", 404);
    if (!table) return error("Invalid QR code", 401);

    const sessionToken = await createCustomerSession(restaurant.id, table.id);

    const response = NextResponse.json(
      { success: true, data: { restaurantId: restaurant.id, tableId: table.id } },
      { status: 201 }
    );
    response.cookies.set("session_token", sessionToken, SESSION_COOKIE_OPTIONS(request));
    return response;
  } catch (err) {
    console.error("[session/create POST]", err);
    return error("Failed to create session", 500);
  }
}
