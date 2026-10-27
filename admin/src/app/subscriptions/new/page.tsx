import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/Skeleton";
import { db } from "@/lib/db";
import { TERMS } from "@/lib/pricing";
import { SubscriptionForm } from "./SubscriptionForm";

export default function NewSubscriptionPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">New subscription</h1>
      <p className="mt-1 text-sm text-neutral-400">Sell a slot to a customer.</p>

      <Suspense fallback={<Skeleton />}>
        <FormLoader />
      </Suspense>
    </main>
  );
}

async function FormLoader() {
  // Needed because we read today's date below. Same rule as the dashboard:
  // anything that depends on "now" cannot be baked in at build time.
  // چون پایین تاریخ امروز را می‌خوانیم، این صفحه باید با درخواست ساخته شود.
  await connection();

  const [customers, plans] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.plan.findMany({
      where: { status: "active" },
      orderBy: { label: "asc" },
      include: { _count: { select: { subscriptions: true } } }
    })
  ]);

  // The page (a Server Component) fetches; the form (a Client Component) only
  // receives plain data. Keep the database on this side of the line.
  // صفحه داده را می‌گیرد، فرم فقط داده ساده می‌گیرد — دیتابیس این طرف خط می‌ماند.
  return (
    <SubscriptionForm
      today={new Date().toISOString().slice(0, 10)}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      plans={plans.map((p) => ({
        id: p.id,
        label: p.label,
        free: p.slotsTotal - p._count.subscriptions
      }))}
      terms={TERMS}
    />
  );
}
