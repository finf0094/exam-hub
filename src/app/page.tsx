import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";

export default async function Home() {
  const session = await getSession();
  redirect(session ? roleHome(session.role) : "/login");
}
