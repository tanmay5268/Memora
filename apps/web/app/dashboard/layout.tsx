import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@workspace/auth/server"

import { ConsoleShell } from "./_ui/console-shell"

/**
 * Session gate for the whole console. Every dashboard route reads the user
 * from here rather than re-fetching a session per page.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  return <ConsoleShell user={session.user}>{children}</ConsoleShell>
}