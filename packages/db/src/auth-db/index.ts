import { drizzle } from "drizzle-orm/neon-http"
import type { NeonHttpDatabase } from "drizzle-orm/neon-http"
import * as schema from "./schema"

export { apiKey, user, session, account, verification } from "./schema"

const createDb = () => {
  const connectionString = process.env.AUTH_DB_URL

  if (!connectionString) {
    throw new Error("AUTH_DB_URL is not set")
  }
  console.log("⚡ [authDb] Creating NEW database client instance")
  return drizzle(connectionString, { schema })
}

const globalForDb = globalThis as unknown as {
  authDb: NeonHttpDatabase<typeof schema> | undefined
}

export const authDb = globalForDb.authDb ?? createDb()

if (process.env.NODE_ENV !== "production") {
  globalForDb.authDb = authDb
}
