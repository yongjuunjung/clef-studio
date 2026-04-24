import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

try {
  loadEnvFile(".env.local");
} catch {
  // .env.local is optional; DATABASE_URL may be set externally (e.g. CI)
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Check .env.local or your shell environment.",
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  casing: "snake_case",
});
