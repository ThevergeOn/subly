#!/usr/bin/env node
/**
 * Telegram order bot — zero dependencies, Node 18+.
 *
 * It reads the plans straight out of ../config.js so the site and the bot can
 * never disagree about a price. Start it with:
 *
 *   BOT_TOKEN=... ADMIN_CHAT_ID=... node bot.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.BOT_TOKEN;
const ADMIN = process.env.ADMIN_CHAT_ID;

if (!TOKEN) {
  console.error("Missing BOT_TOKEN. See .env.example.");
  process.exit(1);
}

/* ---------- load the site config (single source of truth) ---------- */

function loadConfig() {
  const src = fs.readFileSync(path.join(HERE, "..", "config.js"), "utf8");
  const shim = {};
  new Function("window", src)(shim);
  return shim.SITE_CONFIG;
}

const CFG = loadConfig();
const API = `https://api.telegram.org/bot${TOKEN}`;

/* ---------- telegram helpers ---------- */

async function call(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!json.ok) console.error(`${method} failed:`, json.description);
  return json.result;
}

const send = (chat_id, text, extra = {}) =>
  call("sendMessage", { chat_id, text, parse_mode: "HTML", ...extra });

/* ---------- copy ---------- */

const T = {
  en: {
    welcome:
      "<b>Spotify Premium — your own account.</b>\n\n" +
      "A private slot on a real Family plan. Pick a term and I will send you the payment details.",
    pick: "Choose a plan:",
    chosen: (p) =>
      `<b>${p.months} month${p.months > 1 ? "s" : ""}</b>\n` +
      `Price: <b>$${p.usd}</b> (or ${p.toman.toLocaleString("en-US")} toman)\n\n` +
      `Pay with the button below, then tap “I have paid”. ` +
      `Your invite arrives within minutes.`,
    payPaypal: "Pay with PayPal",
    paid: "I have paid",
    thanks:
      "Thanks — your order is in. We are checking the payment and your invite " +
      "will arrive here shortly.",
    months: "months",
    back: "← Back to plans"
  },
  fa: {
    welcome:
      "<b>اسپاتیفای پرمیوم — اکانت شخصی خودت.</b>\n\n" +
      "یک اسلات اختصاصی روی پلن فمیلی واقعی. یک دوره انتخاب کن تا اطلاعات پرداخت را برایت بفرستم.",
    pick: "یک پلن انتخاب کن:",
    chosen: (p) =>
      `<b>${p.months} ماهه</b>\n` +
      `قیمت: <b>${p.toman.toLocaleString("fa-IR")} تومان</b> (یا $${p.usd})\n\n` +
      `از دکمه زیر پرداخت کن و بعد «پرداخت کردم» را بزن. ` +
      `دعوت‌نامه ظرف چند دقیقه برایت می‌آید.`,
    payPaypal: "پرداخت با پی‌پل",
    paid: "پرداخت کردم",
    thanks:
      "ممنون — سفارشت ثبت شد. پرداخت را بررسی می‌کنیم و دعوت‌نامه به‌زودی " +
      "همین‌جا برایت ارسال می‌شود.",
    months: "ماهه",
    back: "← برگشت به پلن‌ها"
  }
};

const pick = (user) => ((user?.language_code || "").startsWith("fa") ? T.fa : T.en);

/* ---------- keyboards ---------- */

function planKeyboard(t, lang) {
  return {
    inline_keyboard: CFG.plans.map((p) => [
      {
        text:
          lang === "fa"
            ? `${p.months} ${t.months} — ${p.toman.toLocaleString("fa-IR")} تومان`
            : `${p.months} ${t.months} — $${p.usd}`,
        callback_data: `plan_${p.id}`
      }
    ])
  };
}

function payKeyboard(t, plan) {
  const rows = [];
  if (CFG.paypal.enabled) {
    rows.push([
      { text: t.payPaypal, url: `https://paypal.me/${CFG.paypal.me}/${plan.usd}USD` }
    ]);
  }
  rows.push([{ text: t.paid, callback_data: `paid_${plan.id}` }]);
  rows.push([{ text: t.back, callback_data: "menu" }]);
  return { inline_keyboard: rows };
}

/* ---------- handlers ---------- */

const findPlan = (id) => CFG.plans.find((p) => p.id === id);

async function showPlan(chatId, user, planId) {
  const t = pick(user);
  const plan = findPlan(planId);
  if (!plan) return showMenu(chatId, user);
  await send(chatId, t.chosen(plan), { reply_markup: payKeyboard(t, plan) });
}

async function showMenu(chatId, user) {
  const t = pick(user);
  const lang = t === T.fa ? "fa" : "en";
  await send(chatId, `${t.welcome}\n\n${t.pick}`, {
    reply_markup: planKeyboard(t, lang)
  });
}

async function onMessage(msg) {
  const text = msg.text || "";
  if (!text.startsWith("/start")) return showMenu(msg.chat.id, msg.from);

  // Deep link from the website: https://t.me/bot?start=plan_3m
  const payload = text.split(" ")[1];
  if (payload && payload.startsWith("plan_")) {
    return showPlan(msg.chat.id, msg.from, payload.slice(5));
  }
  return showMenu(msg.chat.id, msg.from);
}

async function onCallback(cb) {
  const chatId = cb.message.chat.id;
  const data = cb.data || "";
  await call("answerCallbackQuery", { callback_query_id: cb.id });

  if (data === "menu") return showMenu(chatId, cb.from);
  if (data.startsWith("plan_")) return showPlan(chatId, cb.from, data.slice(5));

  if (data.startsWith("paid_")) {
    const t = pick(cb.from);
    const plan = findPlan(data.slice(5));
    await send(chatId, t.thanks);

    if (ADMIN) {
      const who = cb.from.username ? `@${cb.from.username}` : cb.from.first_name;
      await send(
        ADMIN,
        `🟢 <b>New order</b>\n` +
          `Plan: ${plan ? plan.months + "m — $" + plan.usd : data}\n` +
          `From: ${who} (id <code>${cb.from.id}</code>)`
      );
    }
  }
}

/* ---------- long polling ---------- */

let offset = 0;

async function poll() {
  try {
    const res = await fetch(`${API}/getUpdates?timeout=50&offset=${offset}`);
    const json = await res.json();

    for (const update of json.result || []) {
      offset = update.update_id + 1;
      if (update.message) await onMessage(update.message);
      else if (update.callback_query) await onCallback(update.callback_query);
    }
  } catch (err) {
    console.error("poll error:", err.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
  poll();
}

const me = await call("getMe", {});
console.log(`Bot running as @${me?.username ?? "unknown"} — ${CFG.plans.length} plans loaded.`);
if (!ADMIN) console.warn("ADMIN_CHAT_ID not set — you will not be notified of new orders.");
poll();
