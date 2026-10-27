"use server";

/**
 * Server Actions.
 *
 * That "use server" at the top is the whole trick: these functions never reach
 * the browser. A <form action={createSubscription}> posts straight to them —
 * no API route, no fetch, no JSON by hand. This IS the backend, living in the
 * same app as the page that calls it.
 * این توابع هرگز به مرورگر نمی‌روند. فرم مستقیم صدایشان می‌زند — بدون API و fetch.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { addMonths } from "@/lib/pricing";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * Validation lives on the server, always. A required attribute in the HTML is
 * a convenience for honest users; it stops nobody who opens dev tools.
 * اعتبارسنجی همیشه سمت سرور — چک‌های HTML فقط برای راحتی کاربرند.
 */
const SubscriptionInput = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  customerName: z.string().trim().min(1).max(80).optional(),
  telegram: z.string().trim().max(60).optional(),
  planId: z.coerce.number().int().positive(),
  months: z.coerce.number().int().min(1).max(24),
  priceToman: z.coerce.number().int().min(0),
  startedAt: z.coerce.date(),
  markPaid: z.coerce.boolean().optional(),
  paymentMethod: z.string().trim().max(20).optional()
});

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function createSubscription(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = SubscriptionInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const input = parsed.data;

  if (!input.customerId && !input.customerName) {
    return { fieldErrors: { customerName: "Pick an existing customer or type a new name" } };
  }

  const plan = await db.plan.findUnique({
    where: { id: input.planId },
    include: { _count: { select: { subscriptions: true } } }
  });
  if (!plan) return { fieldErrors: { planId: "That plan no longer exists" } };

  const free = plan.slotsTotal - plan._count.subscriptions;
  if (free <= 0) return { fieldErrors: { planId: `${plan.label} is full` } };

  /**
   * One transaction: the customer, the subscription and the payment either all
   * land or none of them do. Without this a crash halfway through could leave
   * a subscription with no payment recorded, and you would never notice.
   * یک تراکنش: یا همه‌چیز ثبت می‌شود یا هیچ‌چیز. حالت نیمه‌کاره ممکن نیست.
   */
  await db.$transaction(async (tx) => {
    const customerId =
      input.customerId ??
      (
        await tx.customer.create({
          data: {
            name: input.customerName!,
            telegram: input.telegram || null
          }
        })
      ).id;

    const sub = await tx.subscription.create({
      data: {
        planId: plan.id,
        customerId,
        months: input.months,
        priceToman: input.priceToman,
        startedAt: input.startedAt,
        expiresAt: addMonths(input.startedAt, input.months),
        status: "active"
      }
    });

    if (input.markPaid) {
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          amount: input.priceToman,
          currency: "IRT",
          method: input.paymentMethod || "card",
          paidAt: input.startedAt
        }
      });
    }
  });

  // Tell Next.js the cached pages are stale, or the dashboard would still show
  // the old count. Then send the user back to the list.
  revalidatePath("/");
  revalidatePath("/subscriptions");
  redirect("/subscriptions");
}

/** Confirm an order the bot took: pending → active. */
export async function confirmSubscription(id: number) {
  await db.subscription.update({
    where: { id },
    data: { status: "active" }
  });
  revalidatePath("/");
  revalidatePath("/subscriptions");
}

/** Extend an existing subscription by its own term length. */
export async function renewSubscription(id: number) {
  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub) return;

  // Renew from the later of today and the current expiry, so renewing early
  // adds time instead of throwing days away.
  const base = sub.expiresAt > new Date() ? sub.expiresAt : new Date();

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id },
      data: { expiresAt: addMonths(base, sub.months), status: "active" }
    });
    // Clear the reminder log so the next cycle can message them again.
    await tx.reminderLog.deleteMany({ where: { subscriptionId: id } });
  });

  revalidatePath("/");
  revalidatePath("/subscriptions");
}
