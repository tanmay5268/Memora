import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authDb } from "@workspace/db/auth-db";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(authDb, {
        provider: "pg", // or "mysql", "sqlite"
    }),
  pages: {
    signIn: "/login",
  },
  emailAndPassword: {
    enabled: true,
  },
  // trustedOrigins: process.env.NODE_ENV === "production" ? [process.env.NEXT_PUBLIC_URL].filter((url): url is string => Boolean(url)) : ["http://localhost:3000"],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});

export type Auth = ReturnType<typeof betterAuth>;
export type Session = Auth["$Infer"]["Session"];