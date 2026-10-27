import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

/**
 * Runs once a day. On Vercel, add this to vercel.json:
 *
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }
 *
 * The URL is public, so a shared secret guards it — otherwise anyone could
 * hammer it and burn through your Telegram rate limit.
 * آدرس عمومی است، پس با یک رمز مشترک محافظت می‌شود.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "forbidden" }, { status: 401 });
    }
  }

  const result = await runReminders();
  return NextResponse.json(result);
}
