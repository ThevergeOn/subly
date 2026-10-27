# Subly admin

The panel, the API and the Telegram bot — one Next.js app, one database,
one deploy.

```
src/app/page.tsx            dashboard (Server Component → queries the DB directly)
src/app/subscriptions/      list, new-subscription form, server actions
src/app/api/telegram/       the bot's webhook
src/app/api/cron/reminders/ the daily expiry job
src/lib/                    db, telegram, reminders, pricing, formatting
prisma/schema.prisma        the tables and their relations
```

There is no separate backend. A page calls a query function, which calls the
database. A form posts to a Server Action, which writes to the database. The
bot receives a webhook on a route in the same app and writes to the same tables.

## Setup

```bash
npm install
cp .env.example .env     # then fill in BOT_TOKEN and ADMIN_CHAT_ID
npx prisma migrate dev
npx prisma db seed       # sample data — delete this once your real data is in
npm run dev
```

Browse the data with `npx prisma studio`.

## The bot

In production Telegram POSTs to `/api/telegram`. Register that once:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Locally a webhook cannot reach your laptop, so poll instead — same code path:

```bash
npm run bot:dev
```

An order from the bot is saved as a **pending** subscription. Nothing activates
on its own: you press Confirm in the panel once you have seen the money.

## The reminder job

`GET /api/cron/reminders` finds subscriptions 7, 3, 1 and 0 days from expiry,
messages the customer and sends you the list. On Vercel, add:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }
```

It can run twice without double-messaging anyone: every reminder is claimed by
inserting into `ReminderLog`, where `@@unique([subscriptionId, kind])` makes a
duplicate impossible.

Try it locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reminders
```

## Going to Postgres

SQLite is a file, which is fine on a laptop and no good on Vercel. To switch:
set `provider = "postgresql"` in `prisma/schema.prisma`, swap
`PrismaBetterSqlite3` for `PrismaPg` in `src/lib/db.ts`, point `DATABASE_URL` at
the new database and re-run `npx prisma migrate dev`. No query changes.
