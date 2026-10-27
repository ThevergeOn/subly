import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { RowActions } from "@/components/RowActions";
import { Skeleton } from "@/components/Skeleton";
import { db } from "@/lib/db";
import { daysLabel, daysUntil, date, toman } from "@/lib/format";

/**
 * `include` is the Prisma word for a SQL JOIN: one query brings back each
 * subscription together with its customer and its plan, instead of 1 + N
 * separate queries. Watch the terminal — Prisma logs the SQL it runs.
 *
 * include همان JOIN است: یک کوئری به‌جای N+1 کوئری.
 */
export default function SubscriptionsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Subscriptions</h1>
        <Link
          href="/subscriptions/new"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
        >
          New
        </Link>
      </div>
      <Suspense fallback={<Skeleton />}>
        <SubscriptionsTable />
      </Suspense>
    </main>
  );
}

async function SubscriptionsTable() {
  await connection();

  const subs = await db.subscription.findMany({
    orderBy: { expiresAt: "asc" },
    include: {
      customer: true,
      plan: true,
      payments: { orderBy: { paidAt: "desc" }, take: 1 }
    }
  });

  return (
    <>
      <p className="mt-1 text-sm text-neutral-400">{subs.length} total</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {subs.map((sub) => {
              const left = daysUntil(sub.expiresAt);
              const payment = sub.payments[0];
              return (
                <tr key={sub.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {sub.customer.name}
                      {sub.status === "pending" && (
                        <span className="ml-2 rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] uppercase text-amber-400">
                          pending
                        </span>
                      )}
                    </p>
                    {sub.customer.telegram && (
                      <p className="text-xs text-neutral-500">{sub.customer.telegram}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{sub.plan.label}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-400">{sub.months}m</td>
                  <td className="px-4 py-3 text-right tabular-nums">{toman(sub.priceToman)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {payment ? `${payment.method} · ${date(payment.paidAt)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`tabular-nums ${
                        left < 0 ? "text-red-400" : left <= 7 ? "text-amber-400" : "text-neutral-400"
                      }`}
                    >
                      {daysLabel(left)}
                    </span>
                    <p className="text-xs text-neutral-600">{date(sub.expiresAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions id={sub.id} status={sub.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
