/**
 * Local bot runner. Telegram webhooks need a public HTTPS address, which your
 * laptop does not have — so for development this polls Telegram and posts each
 * update to your local webhook route. Exactly the same code path runs.
 *
 *   npm run bot:dev        (with `npm run dev` already running)
 *
 * وب‌هوک به آدرس عمومی نیاز دارد که لپ‌تاپ ندارد؛ این اسکریپت همان مسیر کد را
 * به‌صورت محلی اجرا می‌کند.
 */
export {}; // makes this a module, so top-level await is allowed

process.loadEnvFile?.(".env");

const TOKEN = process.env.BOT_TOKEN;
const TARGET = process.env.DEV_WEBHOOK_URL ?? "http://localhost:3000/api/telegram";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!TOKEN) {
  console.error("BOT_TOKEN missing from .env");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
let offset = 0;

async function tick() {
  const res = await fetch(`${API}/getUpdates?timeout=50&offset=${offset}`);
  const json = await res.json();

  for (const update of json.result ?? []) {
    offset = update.update_id + 1;
    console.log("→", JSON.stringify(update).slice(0, 120));

    await fetch(TARGET, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(SECRET ? { "x-telegram-bot-api-secret-token": SECRET } : {})
      },
      body: JSON.stringify(update)
    }).catch((e) => console.error("forward failed:", e.message));
  }
}

async function loop() {
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error("poll error:", (err as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// A webhook and polling cannot both be active. Drop any webhook first.
await fetch(`${API}/deleteWebhook`);
const me = await (await fetch(`${API}/getMe`)).json();
console.log(`Polling as @${me.result?.username} → ${TARGET}`);
loop();
