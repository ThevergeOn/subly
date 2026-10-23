/**
 * Sample data so the panel is not empty while we build it.
 *
 *   npx prisma db seed
 *
 * It wipes the tables first, so it is safe to run again — and safe to DELETE
 * once your real data is in. The customers are made up; the four plans and the
 * 169 TRY cost are yours.
 *
 * مشتری‌ها ساختگی‌اند؛ چهار پلن و هزینه ۱۶۹ لیر واقعی است.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile?.(".env");

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" })
});

/** Date helper: n days from today, at noon so timezones cannot shift the day. */
function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

const SAMPLE_NAMES = [
  "Ali R.",
  "Sara M.",
  "Nima K.",
  "Maryam T.",
  "Hossein A.",
  "Niloofar S.",
  "Amir B.",
  "Shirin D.",
  "Reza P.",
  "Elham Gh.",
  "Kaveh N.",
  "Parisa V.",
  "Omid F.",
  "Leila Z.",
  "Babak H.",
  "Mina Y."
];

async function main() {
  // Order matters: children first, because of the foreign keys.
  // ترتیب مهم است: اول جدول‌های وابسته، به‌خاطر کلید خارجی.
  await db.reminderLog.deleteMany();
  await db.payment.deleteMany();
  await db.subscription.deleteMany();
  await db.customer.deleteMany();
  await db.plan.deleteMany();

  const plans = [];
  for (let i = 1; i <= 4; i++) {
    plans.push(
      await db.plan.create({
        data: {
          label: `Family #${i}`,
          provider: "spotify",
          costTry: 169,
          slotsTotal: 5,
          purchasedAt: inDays(-60 - i * 5),
          expiresAt: inDays(30 - i * 5),
          status: "active"
        }
      })
    );
  }

  // 16 sold slots — 4 per plan — with expiry dates spread out so the reminder
  // job has something to find: a couple are due in 3 and 7 days.
  const terms = [3, 3, 6, 12];
  const priceByTerm: Record<number, number> = {
    1: 550_000,
    3: 1_350_000,
    6: 2_520_000,
    12: 4_680_000
  };

  for (let i = 0; i < 16; i++) {
    const plan = plans[i % 4];
    const months = terms[i % 4];
    const daysLeft = [3, 7, 19, 44, 61, 88][i % 6];

    const customer = await db.customer.create({
      data: {
        name: SAMPLE_NAMES[i],
        telegram: `@user${i + 1}`,
        note: i % 5 === 0 ? "Found us through a referral" : null
      }
    });

    const sub = await db.subscription.create({
      data: {
        planId: plan.id,
        customerId: customer.id,
        months,
        priceToman: priceByTerm[months],
        startedAt: inDays(daysLeft - months * 30),
        expiresAt: inDays(daysLeft),
        status: "active"
      }
    });

    await db.payment.create({
      data: {
        subscriptionId: sub.id,
        amount: priceByTerm[months],
        currency: "IRT",
        method: i % 4 === 0 ? "paypal" : "card",
        paidAt: inDays(daysLeft - months * 30),
        reference: i % 4 === 0 ? `PP-${1000 + i}` : `****${4000 + i}`
      }
    });
  }

  const counts = {
    plans: await db.plan.count(),
    customers: await db.customer.count(),
    subscriptions: await db.subscription.count(),
    payments: await db.payment.count()
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
