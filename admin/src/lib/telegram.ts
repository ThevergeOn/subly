/**
 * Everything that talks to Telegram.
 *
 * The bot used to be a separate Node process that polled Telegram and had no
 * idea the database existed. Now it lives inside this app, so an order placed
 * in a chat lands in the same `Subscription` table the dashboard reads.
 * قبلاً بات پروسه جدایی بود و دیتابیس را نمی‌دید؛ حالا داخل همین اپ است.
 */
import { db } from "@/lib/db";
import { TERMS, addMonths, findTerm } from "@/lib/pricing";

const API = () => `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

type InlineKeyboard = { inline_keyboard: Array<Array<Record<string, string>>> };

export async function callTelegram(method: string, payload: unknown) {
  const res = await fetch(`${API()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!json.ok) console.error(`telegram ${method} failed:`, json.description);
  return json;
}

export function sendMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: InlineKeyboard
) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

/** Tell the admin something happened. Silently does nothing if unconfigured. */
export function notifyAdmin(text: string) {
  const admin = process.env.ADMIN_CHAT_ID;
  if (!admin) return Promise.resolve(null);
  return sendMessage(admin, text);
}

/* -------------------------------------------------------------------------
   Copy
---------------------------------------------------------------------------*/

const isFa = (code?: string) => (code ?? "").startsWith("fa");

const T = {
  en: {
    welcome:
      "<b>Spotify Premium — your own account.</b>\n\nA private slot on a real Family plan. Pick a term:",
    quote: (m: number, toman: number, usd: number) =>
      `<b>${m} month${m > 1 ? "s" : ""}</b>\nPrice: <b>${toman.toLocaleString("en-US")} toman</b> (or $${usd})\n\nPay, then tap “I have paid”. Your invite arrives within minutes.`,
    pay: "Pay with PayPal",
    paid: "I have paid",
    back: "← Back",
    recorded:
      "Thanks — your order is recorded. We are checking the payment and your invite will arrive here shortly.",
    already: "You already have an order waiting. We will message you as soon as it is confirmed.",
    noSlots:
      "All slots are full right now. We have noted your request and will message you the moment one frees up."
  },
  fa: {
    welcome:
      "<b>اسپاتیفای پرمیوم — اکانت شخصی خودت.</b>\n\nیک اسلات اختصاصی روی پلن فمیلی واقعی. یک دوره انتخاب کن:",
    quote: (m: number, toman: number, usd: number) =>
      `<b>${m} ماهه</b>\nقیمت: <b>${toman.toLocaleString("fa-IR")} تومان</b> (یا $${usd})\n\nپرداخت کن و بعد «پرداخت کردم» را بزن. دعوت‌نامه ظرف چند دقیقه می‌آید.`,
    pay: "پرداخت با پی‌پل",
    paid: "پرداخت کردم",
    back: "← برگشت",
    recorded:
      "ممنون — سفارشت ثبت شد. پرداخت را بررسی می‌کنیم و دعوت‌نامه به‌زودی همین‌جا ارسال می‌شود.",
    already: "یک سفارش در انتظار تأیید داری. به‌محض تأیید بهت پیام می‌دهیم.",
    noSlots:
      "در حال حاضر همه اسلات‌ها پر است. درخواستت ثبت شد و به‌محض خالی شدن جا خبرت می‌کنیم."
  }
};

const copy = (lang?: string) => (isFa(lang) ? T.fa : T.en);

/* -------------------------------------------------------------------------
   Keyboards
---------------------------------------------------------------------------*/

function termKeyboard(lang?: string): InlineKeyboard {
  return {
    inline_keyboard: TERMS.map((t) => [
      {
        text: isFa(lang)
          ? `${t.months} ماهه — ${t.toman.toLocaleString("fa-IR")} تومان`
          : `${t.months} months — $${t.usd}`,
        callback_data: `plan_${t.months}`
      }
    ])
  };
}

function payKeyboard(months: number, usd: number, lang?: string): InlineKeyboard {
  const c = copy(lang);
  const rows: Array<Array<Record<string, string>>> = [];

  const paypal = process.env.PAYPAL_ME;
  if (paypal) rows.push([{ text: c.pay, url: `https://paypal.me/${paypal}/${usd}USD` }]);

  rows.push([{ text: c.paid, callback_data: `paid_${months}` }]);
  rows.push([{ text: c.back, callback_data: "menu" }]);
  return { inline_keyboard: rows };
}

/* -------------------------------------------------------------------------
   The brain
---------------------------------------------------------------------------*/

type TgUser = { id: number; first_name?: string; username?: string; language_code?: string };

/** Find the customer behind a chat, or create one. */
async function upsertCustomer(from: TgUser) {
  const chatId = String(from.id);
  const existing = await db.customer.findFirst({ where: { telegramChatId: chatId } });
  if (existing) return existing;

  return db.customer.create({
    data: {
      name: from.first_name ?? from.username ?? `Telegram ${chatId}`,
      telegram: from.username ? `@${from.username}` : null,
      telegramChatId: chatId,
      note: "Created by the Telegram bot"
    }
  });
}

/** The plan with the most room left, or null when everything is full. */
async function planWithFreeSlot() {
  const plans = await db.plan.findMany({
    where: { status: "active" },
    include: { _count: { select: { subscriptions: true } } }
  });

  const withRoom = plans
    .map((p) => ({ plan: p, free: p.slotsTotal - p._count.subscriptions }))
    .filter((p) => p.free > 0)
    .sort((a, b) => b.free - a.free);

  return withRoom[0]?.plan ?? null;
}

async function showMenu(chatId: number, from: TgUser) {
  const c = copy(from.language_code);
  await sendMessage(chatId, c.welcome, termKeyboard(from.language_code));
}

async function showTerm(chatId: number, from: TgUser, months: number) {
  const term = findTerm(months);
  if (!term) return showMenu(chatId, from);

  const c = copy(from.language_code);
  await sendMessage(
    chatId,
    c.quote(term.months, term.toman, term.usd),
    payKeyboard(term.months, term.usd, from.language_code)
  );
}

/**
 * Someone says they paid. Record a PENDING subscription so it shows up in the
 * panel — nothing is ever activated automatically, you confirm it yourself.
 * اشتراک با وضعیت «در انتظار» ثبت می‌شود؛ فعال‌سازی همیشه دستی و با تأیید توست.
 */
async function recordOrder(chatId: number, from: TgUser, months: number) {
  const c = copy(from.language_code);
  const term = findTerm(months);
  if (!term) return showMenu(chatId, from);

  const customer = await upsertCustomer(from);

  const pending = await db.subscription.findFirst({
    where: { customerId: customer.id, status: "pending" }
  });
  if (pending) {
    await sendMessage(chatId, c.already);
    return;
  }

  const plan = await planWithFreeSlot();
  if (!plan) {
    await sendMessage(chatId, c.noSlots);
    await notifyAdmin(
      `⚠️ <b>No free slots</b>\n${customer.name} wanted ${months}m but every plan is full.`
    );
    return;
  }

  const startedAt = new Date();
  await db.subscription.create({
    data: {
      planId: plan.id,
      customerId: customer.id,
      months: term.months,
      priceToman: term.toman,
      priceUsd: term.usd,
      startedAt,
      expiresAt: addMonths(startedAt, term.months),
      status: "pending",
      note: "Ordered through the bot — payment not verified"
    }
  });

  await sendMessage(chatId, c.recorded);
  await notifyAdmin(
    `🟢 <b>New order</b>\n` +
      `${customer.name}${customer.telegram ? ` (${customer.telegram})` : ""}\n` +
      `${term.months}m · ${term.toman.toLocaleString("en-US")} T · ${plan.label}\n` +
      `Confirm it in the panel.`
  );
}

/** One Telegram update. Called by the webhook route and by the dev poller. */
export async function handleUpdate(update: Record<string, any>) {
  if (update.message) {
    const msg = update.message;
    const text: string = msg.text ?? "";
    const from: TgUser = msg.from;

    // Deep link from the website: https://t.me/bot?start=plan_3m
    const payload = text.startsWith("/start") ? text.split(" ")[1] : undefined;
    if (payload?.startsWith("plan_")) {
      const months = Number(payload.slice(5).replace("m", ""));
      if (Number.isFinite(months)) return showTerm(msg.chat.id, from, months);
    }
    return showMenu(msg.chat.id, from);
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const from: TgUser = cb.from;
    const chatId: number = cb.message.chat.id;
    const data: string = cb.data ?? "";

    await callTelegram("answerCallbackQuery", { callback_query_id: cb.id });

    if (data === "menu") return showMenu(chatId, from);
    if (data.startsWith("plan_")) return showTerm(chatId, from, Number(data.slice(5)));
    if (data.startsWith("paid_")) return recordOrder(chatId, from, Number(data.slice(5)));
  }
}
