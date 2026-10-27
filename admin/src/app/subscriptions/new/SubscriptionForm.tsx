"use client";

/**
 * "use client" because this form has state: picking a term fills in the price,
 * and the price stays editable afterwards. Everything else stays on the server.
 * اینجا «کلاینت» است چون فرم حالت دارد؛ بقیه کد سمت سرور می‌ماند.
 */
import { useActionState, useState } from "react";
import type { Term } from "@/lib/pricing";
import { type FormState, createSubscription } from "../actions";

type Option = { id: number; name: string };
type PlanOption = { id: number; label: string; free: number };

const field =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-white/30";
const label = "block text-xs uppercase tracking-wide text-neutral-500";

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

export function SubscriptionForm({
  today,
  customers,
  plans,
  terms
}: {
  /** Today's date as YYYY-MM-DD, computed on the server.
   *  Calling `new Date()` here instead would render one date on the server and
   *  possibly another in the browser — React calls that a hydration mismatch.
   *  تاریخ از سرور می‌آید؛ ساختنش اینجا باعث اختلاف سرور و مرورگر می‌شود. */
  today: string;
  customers: Option[];
  plans: PlanOption[];
  terms: Term[];
}) {
  // useActionState wires the form to the server action and hands back whatever
  // the action returned, plus a pending flag while it is in flight.
  const [state, action, pending] = useActionState<FormState, FormData>(createSubscription, {});

  const [months, setMonths] = useState(terms[1]?.months ?? 3);
  const [price, setPrice] = useState(terms[1]?.toman ?? 0);
  const [existing, setExisting] = useState(customers.length > 0);

  const errors = state.fieldErrors ?? {};

  function pickTerm(value: number) {
    setMonths(value);
    const term = terms.find((t) => t.months === value);
    if (term) setPrice(term.toman);
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      {state.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className={label}>Customer</legend>

        {customers.length > 0 && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={existing}
                onChange={() => setExisting(true)}
                className="accent-emerald-500"
              />
              Existing
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!existing}
                onChange={() => setExisting(false)}
                className="accent-emerald-500"
              />
              New
            </label>
          </div>
        )}

        {existing && customers.length > 0 ? (
          <select name="customerId" className={field} defaultValue={customers[0]?.id}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <input name="customerName" placeholder="Name" className={field} />
              <Error message={errors.customerName} />
            </div>
            <input name="telegram" placeholder="@telegram (optional)" className={field} />
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="planId">
            Plan
          </label>
          <select id="planId" name="planId" className={`${field} mt-1`}>
            {plans.map((p) => (
              <option key={p.id} value={p.id} disabled={p.free <= 0}>
                {p.label} — {p.free} free
              </option>
            ))}
          </select>
          <Error message={errors.planId} />
        </div>

        <div>
          <label className={label} htmlFor="months">
            Term
          </label>
          <select
            id="months"
            name="months"
            className={`${field} mt-1`}
            value={months}
            onChange={(e) => pickTerm(Number(e.target.value))}
          >
            {terms.map((t) => (
              <option key={t.months} value={t.months}>
                {t.months} months
              </option>
            ))}
          </select>
          <Error message={errors.months} />
        </div>

        <div>
          <label className={label} htmlFor="priceToman">
            Price (toman)
          </label>
          <input
            id="priceToman"
            name="priceToman"
            inputMode="numeric"
            className={`${field} mt-1 tabular-nums`}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "")) || 0)}
          />
          <p className="mt-1 text-xs text-neutral-500">
            {months > 0 ? `${Math.round(price / months).toLocaleString("en-US")} / month` : ""}
          </p>
          <Error message={errors.priceToman} />
        </div>

        <div>
          <label className={label} htmlFor="startedAt">
            Starts
          </label>
          <input
            id="startedAt"
            name="startedAt"
            type="date"
            className={`${field} mt-1`}
            defaultValue={today}
          />
          <Error message={errors.startedAt} />
        </div>
      </div>

      <fieldset className="space-y-2 rounded-lg border border-white/10 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="markPaid"
            value="true"
            defaultChecked
            className="accent-emerald-500"
          />
          Record a payment for this amount
        </label>
        <select name="paymentMethod" className={field} defaultValue="card">
          <option value="card">card</option>
          <option value="paypal">paypal</option>
          <option value="crypto">crypto</option>
          <option value="cash">cash</option>
        </select>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create subscription"}
      </button>
    </form>
  );
}
