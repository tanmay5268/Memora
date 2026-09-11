import { auth } from "@workspace/auth/server";
import DashboardPageContents from "@/app/dashboard/_ui/dashboard";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers:await headers()
  });
  if(!session) redirect("/login");
  return <DashboardPageContents user={session.user} />;
}