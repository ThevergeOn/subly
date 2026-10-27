/**
 * The price list. One place, used by the new-subscription form AND by the
 * Telegram bot, so the panel and the bot can never quote different numbers.
 *
 * NOTE: the public site keeps its own copy in ../../config.js. When you change
 * a price, change it in both — or move this into a `Price` table in the
 * database and let the site fetch it, which is the proper fix.
 * توجه: سایت عمومی نسخه خودش را در config.js دارد؛ فعلاً باید دستی هماهنگ بمانند.
 */
export type Term = {
  months: number;
  toman: number;
  usd: number;
};

export const TERMS: Term[] = [
  { months: 1, toman: 550_000, usd: 5 },
  { months: 3, toman: 1_350_000, usd: 12 },
  { months: 6, toman: 2_520_000, usd: 22 },
  { months: 12, toman: 4_680_000, usd: 40 }
];

export function findTerm(months: number) {
  return TERMS.find((t) => t.months === months);
}

/** Add n months to a date, keeping the day of month where possible. */
export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 31 Jan + 1 month would roll into March; clamp back to the last valid day.
  if (d.getDate() !== day) d.setDate(0);
  return d;
}
