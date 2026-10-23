import { connection } from "next/server";
import { db } from "@/lib/db";
import { RATES } from "@/lib/rates";

/**
 * Everything the dashboard shows, in one place.
 *
 * Note what the database does versus what we do: counting and summing happens
 * in SQL (`aggregate`, `count`) because the database is far better at it, and
 * only the business arithmetic happens in TypeScript.
 * شمردن و جمع‌زدن کار دیتابیس است؛ محاسبه سود کار ماست.
 */
export async function getDashboard() {
  // `connection()` tells Next.js "this needs a real request" — because we are
  // about to read the clock, and a page built at deploy time would freeze it.
  // Without this, Next refuses to prerender and warns.
  // این خط یعنی: برای ساختن این صفحه منتظر درخواست واقعی بمان.
  await connection();

  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const [plans, activeSubs, expiringSoon, revenueAgg] = await Promise.all([
    db.plan.findMany({
      where: { status: "active" },
      include: { _count: { select: { subscriptions: true } } }
    }),

    db.subscription.count({ where: { status: "active" } }),

    db.subscription.findMany({
      where: { status: "active", expiresAt: { lte: in7Days } },
      orderBy: { expiresAt: "asc" },
      include: { customer: true, plan: true }
    }),

    // Sum what customers pay, and how many months that covers, so we can turn
    // mixed 1/3/6/12-month terms into one comparable monthly number.
    db.subscription.aggregate({
      where: { status: "active" },
      _sum: { priceToman: true, months: true }
    })
  ]);

  const slotsTotal = plans.reduce((sum, p) => sum + p.slotsTotal, 0);
  const slotsTaken = plans.reduce((sum, p) => sum + p._count.subscriptions, 0);

  // A 12-month subscription at 4,680,000 is 390,000 per month. Summing the
  // prices and dividing by the summed months gives the blended monthly figure.
  const totalPaid = revenueAgg._sum.priceToman ?? 0;
  const totalMonths = revenueAgg._sum.months ?? 0;
  const monthlyRevenue = totalMonths > 0 ? Math.round(totalPaid / totalMonths) * activeSubs : 0;

  const subscriptionCost = plans.reduce((sum, p) => sum + p.costTry * RATES.tryToToman, 0);
  const feePerMonth =
    (RATES.liraPurchaseFeeEur * RATES.eurToToman * RATES.liraPurchasesPerYear) / 12;
  const monthlyCost = Math.round(subscriptionCost + feePerMonth);

  const monthlyProfit = monthlyRevenue - monthlyCost;

  // How many slots must be sold before you stop losing money.
  const avgSlotPrice = totalMonths > 0 ? totalPaid / totalMonths : 0;
  const breakEvenSlots = avgSlotPrice > 0 ? Math.ceil(monthlyCost / avgSlotPrice) : 0;

  return {
    plans,
    slotsTotal,
    slotsTaken,
    slotsFree: slotsTotal - slotsTaken,
    activeSubs,
    monthlyRevenue,
    monthlyCost,
    monthlyProfit,
    yearlyProfit: monthlyProfit * 12,
    breakEvenSlots,
    expiringSoon
  };
}
