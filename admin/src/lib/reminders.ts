/**
 * The daily expiry job.
 *
 * For each active subscription it works out how many days are left and, if that
 * matches one of the milestones below, messages the customer and tells you.
 *
 * It never checks "did I already send this?" in code. Instead it INSERTS into
 * ReminderLog first, where `@@unique([subscriptionId, kind])` makes a duplicate
 * impossible — the insert simply fails and we skip. The database is the guard,
 * so two jobs running at once still cannot double-message anyone.
 * کد هیچ‌وقت نمی‌پرسد «قبلاً فرستادم؟»؛ قید یکتای دیتابیس این را تضمین می‌کند.
 */
import { db } from "@/lib/db";
import { daysUntil } from "@/lib/format";
import { notifyAdmin, sendMessage } from "@/lib/telegram";

/** Days-left values that trigger a message, and the log key for each. */
const MILESTONES: Array<{ days: number; kind: string }> = [
  { days: 7, kind: "d7" },
  { days: 3, kind: "d3" },
  { days: 1, kind: "d1" },
  { days: 0, kind: "expired" }
];

function customerText(name: string, days: number, fa: boolean) {
  if (fa) {
    if (days === 0) return `${name} عزیز، اشتراک اسپاتیفای شما امروز تمام می‌شود. برای تمدید همین‌جا پیام بدهید.`;
    return `${name} عزیز، ${days} روز تا پایان اشتراک اسپاتیفای شما مانده. برای تمدید همین‌جا پیام بدهید.`;
  }
  if (days === 0) return `Hi ${name} — your Spotify subscription ends today. Message here to renew.`;
  return `Hi ${name} — your Spotify subscription ends in ${days} day${days > 1 ? "s" : ""}. Message here to renew.`;
}

export async function runReminders() {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 8);

  const due = await db.subscription.findMany({
    where: { status: "active", expiresAt: { lte: horizon } },
    include: { customer: true, plan: true },
    orderBy: { expiresAt: "asc" }
  });

  const sent: string[] = [];
  const skipped: string[] = [];
  const forYou: string[] = [];

  for (const sub of due) {
    const left = daysUntil(sub.expiresAt);
    const milestone = MILESTONES.find((m) => m.days === left);
    if (!milestone) continue;

    // Claim the reminder BEFORE sending it. If this throws, someone already
    // claimed it and there is nothing to do.
    try {
      await db.reminderLog.create({
        data: { subscriptionId: sub.id, kind: milestone.kind }
      });
    } catch {
      skipped.push(`${sub.customer.name} (${milestone.kind})`);
      continue;
    }

    forYou.push(
      `• ${sub.customer.name} — ${sub.plan.label} — ${left === 0 ? "expires today" : `${left}d left`}`
    );

    if (sub.customer.telegramChatId) {
      await sendMessage(
        sub.customer.telegramChatId,
        customerText(sub.customer.name, left, true)
      );
      sent.push(`${sub.customer.name} (${milestone.kind})`);
    } else {
      // No chat id means the person has never messaged the bot, so Telegram
      // will not let us write to them. You have to reach out yourself.
      sent.push(`${sub.customer.name} (${milestone.kind}, no chat id — contact manually)`);
    }
  }

  if (forYou.length > 0) {
    await notifyAdmin(`⏰ <b>Expiring soon</b>\n${forYou.join("\n")}`);
  }

  return { checked: due.length, sent, skipped };
}
