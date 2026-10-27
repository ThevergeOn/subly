# Subly

A small bilingual (English / فارسی) landing page for selling shared-subscription
slots — currently Spotify Premium Family — wired to a Telegram order bot and PayPal.

- Static site — no build step, no framework, no dependencies.
- Language toggle with full RTL support; the choice is remembered.
- Every plan button deep-links into your Telegram bot with the chosen plan attached.
- The Telegram bot lives in the admin app (`admin/`), so an order placed in a chat
  lands straight in the database.

---

## 1. Configure

Everything you need to change lives in [`config.js`](config.js):

| Field | What to put there |
| --- | --- |
| `brand.telegramBot` | Your bot's username, **without** the `@` |
| `brand.telegramSupport` | Your personal Telegram username, without the `@` |
| `paypal.me` | Your PayPal.me handle (`paypal.me/THIS_PART`) |
| `plans[]` | Price per term, in toman and in USD |
| `capacity` | The little "slots left" bar in the hero — set to `null` to hide it |

Persian visitors see toman prices, English visitors see USD. They are separate
numbers on purpose: PayPal takes a fee and international buyers are a different
market from local ones.

> **Note:** PayPal is not reachable from inside Iran. `rialPayment.note` in
> `config.js` is where you tell local buyers how to pay instead — edit that line,
> or set `enabled: false` to remove it.

## 2. Run the site locally

No build, no install — just serve the folder:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## 3. The bot and the admin panel

Both live in [`admin/`](admin/) — a Next.js app that is the front end, the back
end and the bot in one. See [admin/README.md](admin/README.md).

## 4. Publish

The site is plain static files, so GitHub Pages works with no configuration:
open **Settings → Pages**, pick the `main` branch and the `/` root folder, and
the site is live at `https://<user>.github.io/<repo>/` in about a minute.

---

## Layout

```
index.html          markup
config.js           ← the only file you normally edit
assets/
  styles.css        theme, layout, RTL rules
  i18n.js           every string, in both languages
  app.js            language switching, plan rendering, deep links
bot/
  bot.js            Telegram bot (Node 18+, zero dependencies)
  .env.example      token template
```

Want to change wording? It is all in `assets/i18n.js` — the `en` and `fa`
objects mirror each other key for key.

---

Not affiliated with Spotify AB.
