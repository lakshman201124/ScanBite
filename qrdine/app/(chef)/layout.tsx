import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { getAuthSecretKey } from "@/lib/secret";

const CHEF_JWT_SECRET = getAuthSecretKey();

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const chefToken = cookieStore.get("chef_token")?.value;

  if (!chefToken) redirect("/staff-login");

  try {
    const { payload } = await jwtVerify(chefToken, CHEF_JWT_SECRET);
    // Strict: only chef (or admin) may access KDS
    if (payload.role === "waiter") redirect("/waiter");
    if (payload.role !== "chef" && payload.role !== "admin" && payload.role !== "super_admin") redirect("/staff-login");
  } catch {
    redirect("/staff-login");
  }

  return <div className="min-h-screen bg-zinc-950">{children}</div>;
}
