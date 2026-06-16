import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { getAuthSecretKey } from "@/lib/secret";

const CHEF_JWT_SECRET = getAuthSecretKey();

export default async function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const chefToken = cookieStore.get("chef_token")?.value;

  if (!chefToken) redirect("/staff-login");

  try {
    const { payload } = await jwtVerify(chefToken, CHEF_JWT_SECRET);
    const role = payload.role as string;

    if (role === "chef") redirect("/kds");
    if (role !== "waiter" && role !== "admin" && role !== "super_admin") redirect("/staff-login");

    return <>{children}</>;
  } catch {
    redirect("/staff-login");
  }
}
