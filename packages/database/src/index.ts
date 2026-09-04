import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
export * from "./db/schema";
export { eq } from "drizzle-orm";
config({ path: ".env" });
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
