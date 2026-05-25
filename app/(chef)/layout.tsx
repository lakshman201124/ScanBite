import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

const CHEF_JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret"
);

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const chefToken = cookieStore.get("chef_token")?.value;

  if (!chefToken) redirect("/chef-login");

  try {
    const { payload } = await jwtVerify(chefToken, CHEF_JWT_SECRET);
    // Both roles use the shared staff portal now; only KDS internals still live here
    if (payload.role !== "chef" && payload.role !== "waiter") redirect("/chef-login");
    if (payload.role === "waiter") redirect("/waiter/orders");
  } catch {
    redirect("/chef-login");
  }

  return <div className="min-h-screen bg-zinc-950">{children}</div>;
}
