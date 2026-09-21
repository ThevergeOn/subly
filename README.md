# Tune Slots

A small bilingual (English / فارسی) landing page for selling Spotify Premium Family
slots, wired to a Telegram order bot and PayPal.

- Static site — no build step, no framework, no dependencies.
- Language toggle with full RTL support; the choice is remembered.
- Every plan button deep-links into your Telegram bot with the chosen plan attached.
- A zero-dependency Node bot picks that up, quotes the price and pings you on each order.

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

## 3. Run the bot

Create the bot with [@BotFather](https://t.me/BotFather), then:

```bash
cd bot && cp .env.example .env
```

Fill in `BOT_TOKEN` and `ADMIN_CHAT_ID` (get your numeric id from
[@userinfobot](https://t.me/userinfobot)), then:

```bash
cd bot && node --env-file=.env bot.js
```

The bot reads its plans straight out of `../config.js`, so the site and the bot
can never quote different prices. It answers in Persian or English depending on
each user's Telegram language, and messages you the moment someone taps
"I have paid".

To keep it running on a server:

```bash
cd bot && nohup node --env-file=.env bot.js > bot.log 2>&1 &
```

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
