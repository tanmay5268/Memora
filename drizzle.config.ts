import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");

import { defineConfig } from "drizzle-kit"

// export default defineConfig({
//   dialect: "postgresql",
//   schema: "./packages/db/src/auth-db/schema.ts",
//   out: "./drizzle/auth-db",
//   dbCredentials: {
//     url: process.env.AUTH_DB_URL!,
//   },
// })
export default defineConfig({
  out: "./drizzle/auth-db",
  dialect: "postgresql",
  schema: "./packages/db/src/auth-db/schema.ts",
  dbCredentials: {
    url: process.env.AUTH_DB_URL!,
  },

  extensionsFilters: ["postgis"],
  schemaFilter: "public",
  tablesFilter: "*",

  introspect: {
    casing: "camel",
  },

  migrations: {
    table: "__drizzle_migrations__",
    schema: "drizzle",
  },

  entities: {
    roles: {
      provider: '',
      exclude: [],
      include: []
    }
  },

  breakpoints: true,
  verbose: true,
});
