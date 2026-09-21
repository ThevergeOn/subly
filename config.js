/* ------------------------------------------------------------------
   EDIT THIS FILE ONLY — everything you need to change lives here.
   این تنها فایلی است که باید ویرایش کنی.
------------------------------------------------------------------ */

window.SITE_CONFIG = {
  brand: {
    name: "Subly",
    nameFa: "سابلی",
    // Telegram bot username WITHOUT the @  —  یوزرنیم بات بدون @
    telegramBot: "YOUR_BOT_USERNAME",
    // Your personal Telegram for support, WITHOUT the @  —  آیدی پشتیبانی بدون @
    telegramSupport: "YOUR_USERNAME",
    email: "" // optional / اختیاری
  },

  paypal: {
    enabled: true,
    // Your PayPal.me handle WITHOUT the @  —  یوزرنیم پی‌پل بدون @
    // https://paypal.me/THIS_PART
    me: "YOUR_PAYPAL"
  },

  // Optional: rial payment note shown to Persian visitors only.
  // PayPal is not reachable from inside Iran, so give local buyers a way to pay.
  // پی‌پل از داخل ایران در دسترس نیست — راه پرداخت ریالی را اینجا بنویس.
  rialPayment: {
    enabled: true,
    note: "پرداخت ریالی: کارت به کارت — شماره کارت را در تلگرام برایتان می‌فرستیم."
  },

  // Prices. Toman = local buyers. USD = PayPal buyers.
  // قیمت‌ها: تومان برای مشتری ایرانی، دلار برای پرداخت پی‌پل.
  plans: [
    { id: "1m", months: 1, toman: 550000, usd: 5, tag: null },
    { id: "3m", months: 3, toman: 1350000, usd: 12, tag: "popular" },
    { id: "6m", months: 6, toman: 2520000, usd: 22, tag: "best" },
    { id: "12m", months: 12, toman: 4680000, usd: 40, tag: null }
  ],

  // Live slot counter shown in the hero. Set to null to hide.
  // شمارنده ظرفیت. برای مخفی کردن null بگذار.
  capacity: { total: 20, taken: 16 }
};
