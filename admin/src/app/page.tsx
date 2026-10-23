import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/Skeleton";
import { Stat } from "@/components/Stat";
import { daysLabel, daysUntil, date, toman } from "@/lib/format";
import { getDashboard } from "@/lib/stats";

/**
 * A Server Component: this function runs on the server, talks to the database
 * directly, and ships only HTML to the browser. There is no API call here and
 * no loading spinner — that is the whole point of the App Router.
 *
 * این تابع روی سرور اجرا می‌شود و مستقیم با دیتابیس حرف می‌زند؛ به مرورگر فقط
 * HTML می‌رسد. نه فراخوانی API لازم است نه اسپینر.
 */
export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      {/* The shell above renders instantly; everything that needs the database
          streams in underneath. Without this boundary Next.js refuses to
          prerender the page at all.
          پوسته بالا فوری می‌آید و بخش وابسته به دیتابیس بعداً جریان پیدا می‌کند. */}
      <Suspense fallback={<Skeleton />}>
        <DashboardBody />
      </Suspense>
    </main>
  );
}

async function DashboardBody() {
  const s = await getDashboard();

  const occupancy = s.slotsTotal > 0 ? Math.round((s.slotsTaken / s.slotsTotal) * 100) : 0;

  return (
    <>
      <p className="mt-1 text-sm text-neutral-400">
        {s.plans.length} active plans · {s.slotsTaken}/{s.slotsTotal} slots sold
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Monthly profit"
          value={toman(s.monthlyProfit)}
          hint={`${toman(s.yearlyProfit)} per year`}
          tone={s.monthlyProfit > 0 ? "good" : "warn"}
        />
        <Stat label="Monthly revenue" value={toman(s.monthlyRevenue)} hint="blended across terms" />
        <Stat label="Monthly cost" value={toman(s.monthlyCost)} hint="plans + lira purchase fee" />
        <Stat
          label="Occupancy"
          value={`${occupancy}%`}
          hint={`${s.slotsFree} slots free · break-even at ${s.breakEvenSlots}`}
          tone={s.slotsFree > 0 ? "warn" : "good"}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Expiring within 7 days
        </h2>

        {s.expiringSoon.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">
            Nothing expiring this week.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            {s.expiringSoon.map((sub) => {
              const left = daysUntil(sub.expiresAt);
              return (
                <li key={sub.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{sub.customer.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {sub.plan.label} · {sub.months}m · {toman(sub.priceToman)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm tabular-nums ${
                        left <= 3 ? "text-amber-400" : "text-neutral-300"
                      }`}
                    >
                      {daysLabel(left)}
                    </p>
                    <p className="text-xs text-neutral-500">{date(sub.expiresAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Plans</h2>
          <Link href="/subscriptions" className="text-xs text-neutral-400 hover:text-white">
            All subscriptions →
          </Link>
        </div>

        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {s.plans.map((plan) => {
            const free = plan.slotsTotal - plan._count.subscriptions;
            return (
              <li
                key={plan.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{plan.label}</p>
                  <p className="text-xs tabular-nums text-neutral-400">
                    {plan._count.subscriptions}/{plan.slotsTotal}
                  </p>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {plan.costTry} TRY/mo · renews {date(plan.expiresAt)}
                  {free > 0 && <span className="text-amber-400"> · {free} free</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
