/**
 * Prisma 7 moved the connection URL out of schema.prisma and into this file.
 * The schema now describes only the SHAPE of the data; this describes WHERE it
 * lives. Older tutorials still put `url` in the schema — that is the v6 way.
 *
 * از نسخه ۷ آدرس اتصال اینجاست، نه داخل schema.prisma.
 */
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Next.js reads .env by itself, but the Prisma CLI is a separate process and
// since v7 it no longer loads .env for you. Node can do it natively.
// Next خودش .env را می‌خواند، ولی CLI پریزما یک پروسه جداست.
process.loadEnvFile?.(path.join(process.cwd(), ".env"));

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  datasource: {
    url: env("DATABASE_URL")
  },

  migrations: {
    path: path.join("prisma", "migrations"),
    // `npx prisma migrate reset` re-runs this automatically.
    seed: "tsx prisma/seed.ts"
  }
});
