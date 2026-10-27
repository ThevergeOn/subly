import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram";

/**
 * The bot's front door. Telegram POSTs every message here.
 *
 * Anyone on the internet can POST to this URL, so Telegram lets you set a
 * secret when you register the webhook and sends it back in a header. We
 * refuse anything that does not carry it.
 * هرکسی می‌تواند به این آدرس درخواست بفرستد، پس یک رمز مشترک بررسی می‌کنیم.
 */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = request.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const update = await request.json();

  try {
    await handleUpdate(update);
  } catch (err) {
    // Always answer 200: a non-200 makes Telegram retry the same update
    // forever, which turns one bug into an infinite loop.
    // همیشه ۲۰۰ برگردان، وگرنه تلگرام همان پیام را بی‌نهایت بار می‌فرستد.
    console.error("telegram update failed:", err);
  }

  return NextResponse.json({ ok: true });
}
