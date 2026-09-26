import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export { user, session, account, verification, apiKey } from "./schema";

class AuthDatabase {
  private static instance: AuthDatabase | null = null;

  public readonly db: NeonHttpDatabase<typeof schema>;

  private constructor() {
    const connectionString = process.env.AUTH_DB_URL;

    if (!connectionString) {
      throw new Error("AUTH_DB_URL not set");
    }

    this.db = drizzle(connectionString, { schema });
    console.log("AuthDatabase connected");
  }

  public static getInstance(): AuthDatabase {
    if (!AuthDatabase.instance) {
      AuthDatabase.instance = new AuthDatabase();
    }

    return AuthDatabase.instance;
  }
}

export const authDb = AuthDatabase.getInstance().db;
