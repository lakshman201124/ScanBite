import { redirect } from "next/navigation";

export default function StaffSignupRedirect() {
  redirect("/staff-login");
}
