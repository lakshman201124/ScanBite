import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { WaiterSidebar } from "@/components/layout/WaiterSidebar";

const CHEF_JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret"
);

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const chefToken = cookieStore.get("chef_token")?.value;

  if (!chefToken) redirect("/chef-login");

  try {
    const { payload } = await jwtVerify(chefToken, CHEF_JWT_SECRET);
    const role = payload.role as string;

    if (role !== "waiter" && role !== "chef") redirect("/chef-login");

    const userName = (payload.name as string | undefined) ?? "Staff";
    const userRole = role as "chef" | "waiter";

    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg, var(--bg))" }}>
        <div className="hidden lg:block">
          <WaiterSidebar userName={userName} userRole={userRole} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    );
  } catch {
    redirect("/chef-login");
  }
}
