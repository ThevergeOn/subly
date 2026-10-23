import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

/**
 * One shared database connection for the whole app.
 *
 * Since Prisma 7 the client needs a "driver adapter" — the piece that actually
 * speaks to this particular database. Swapping SQLite for Postgres later means
 * changing these two lines and the `provider` in schema.prisma; every query we
 * write stays exactly the same.
 * از نسخه ۷، کلاینت به یک آداپتور درایور نیاز دارد. برای رفتن روی پستگرس فقط
 * همین دو خط عوض می‌شود و کوئری‌ها دست‌نخورده می‌مانند.
 */
function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db"
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

/**
 * Why the globalThis dance: in development Next.js reloads your code on every
 * file save, and a plain `createClient()` would open a NEW connection each time
 * until the database refuses more. Stashing it on globalThis — which survives
 * reloads — keeps exactly one.
 * بدون این کار، با هر ذخیره فایل یک اتصال تازه باز می‌شود.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
