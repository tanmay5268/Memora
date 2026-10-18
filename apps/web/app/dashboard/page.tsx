import { headers } from "next/headers"

import { call } from "@orpc/server"
import { listApiKeysHandler } from "@workspace/orpc"

import { ApiKeys, type SerializedApiKey } from "./_ui/api-keys"

/**
 * Keys are read on the server so the table renders on first paint instead of
 * flashing a skeleton. Mutations still go through the oRPC client.
 */
export default async function DashboardPage() {
  const rows = await call(listApiKeysHandler, undefined, {
    context: { headers: await headers() },
  })

  const initialKeys: SerializedApiKey[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revoked: row.revoked,
  }))

  return <ApiKeys initialKeys={initialKeys} />
}