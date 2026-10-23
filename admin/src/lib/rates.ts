/**
 * Exchange rates, edited by hand for now.
 *
 * Later these become a `Setting` table you can edit from the panel, or a daily
 * fetch — but hard-coding first is deliberate: get the maths right where you
 * can see it, then make it dynamic.
 * فعلاً دستی. بعداً یا جدول تنظیمات می‌شود یا روزانه از API گرفته می‌شود.
 */
export const RATES = {
  /** 1 Turkish lira, in toman. */
  tryToToman: 4_710,
  /** 1 US dollar, in toman. */
  usdToToman: 229_800,
  /** 1 euro, in toman. */
  eurToToman: 263_550,
  /** Flat fee you pay each time you buy lira, in euro. */
  liraPurchaseFeeEur: 3,
  /** How many times a year you buy lira. Fewer purchases = less fee. */
  liraPurchasesPerYear: 4
} as const;
