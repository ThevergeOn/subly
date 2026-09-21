(function () {
  "use strict";

  var CFG = window.SITE_CONFIG;
  var I18N = window.I18N;
  var STORAGE_KEY = "ts-lang";

  /* ---------- language ---------- */

  function detectLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "fa") return saved;
    } catch (e) {
      /* private mode / blocked storage — fall through */
    }
    var nav = (navigator.language || "").toLowerCase();
    return nav.indexOf("fa") === 0 || nav.indexOf("pe") === 0 ? "fa" : "en";
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* nothing to do — the choice just will not persist */
    }
  }

  var lang = detectLang();

  /* ---------- links ---------- */

  function tgLink(payload) {
    var bot = CFG.brand.telegramBot;
    var base = "https://t.me/" + encodeURIComponent(bot);
    return payload ? base + "?start=" + encodeURIComponent(payload) : base;
  }

  function paypalLink(usd) {
    return "https://paypal.me/" + encodeURIComponent(CFG.paypal.me) + "/" + usd + "USD";
  }

  /* ---------- formatting ---------- */

  function money(plan) {
    if (lang === "fa") {
      return new Intl.NumberFormat("fa-IR").format(plan.toman) + " تومان";
    }
    return "$" + plan.usd;
  }

  function perMonth(plan) {
    if (lang === "fa") {
      var t = Math.round(plan.toman / plan.months);
      return new Intl.NumberFormat("fa-IR").format(t) + " تومان";
    }
    return "$" + (plan.usd / plan.months).toFixed(2).replace(/\.00$/, "");
  }

  function num(n) {
    return new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(n);
  }

  function savingPercent(plan, baseline) {
    if (!baseline || plan.months === 1) return 0;
    var unit = lang === "fa" ? plan.toman / plan.months : plan.usd / plan.months;
    var base = lang === "fa" ? baseline.toman : baseline.usd;
    return Math.round((1 - unit / base) * 100);
  }

  /* ---------- render ---------- */

  function renderStatic(t) {
    document.documentElement.lang = t.lang;
    document.documentElement.dir = t.dir;
    document.title =
      (lang === "fa" ? CFG.brand.nameFa : CFG.brand.name) + " — Spotify Premium";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (typeof t[key] === "string") el.textContent = t[key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (typeof t[key] === "string") el.innerHTML = t[key];
    });

    document.querySelectorAll("[data-brand]").forEach(function (el) {
      el.textContent = lang === "fa" ? CFG.brand.nameFa : CFG.brand.name;
    });

    document.querySelectorAll("[data-tg-link]").forEach(function (el) {
      el.href = tgLink("start");
      el.target = "_blank";
      el.rel = "noopener";
    });

    document.querySelectorAll("[data-support-link]").forEach(function (el) {
      el.href = "https://t.me/" + encodeURIComponent(CFG.brand.telegramSupport);
      el.target = "_blank";
      el.rel = "noopener";
    });
  }

  function renderPlans(t) {
    var host = document.getElementById("plans");
    host.textContent = "";

    var baseline = CFG.plans.filter(function (p) {
      return p.months === 1;
    })[0];

    CFG.plans.forEach(function (plan) {
      var card = document.createElement("article");
      card.className = "card plan" + (plan.tag ? " featured" : "");

      if (plan.tag) {
        var tag = document.createElement("span");
        tag.className = "plan-tag";
        tag.textContent = plan.tag === "best" ? t.tagBest : t.tagPopular;
        card.appendChild(tag);
      }

      var term = document.createElement("p");
      term.className = "plan-term";
      term.textContent =
        lang === "fa"
          ? num(plan.months) + " " + t.planMonths
          : plan.months + " " + (plan.months === 1 ? t.planMonth : t.planMonths);
      card.appendChild(term);

      var price = document.createElement("p");
      price.className = "plan-price";
      price.textContent = money(plan);
      card.appendChild(price);

      var unit = document.createElement("p");
      unit.className = "plan-unit";
      unit.textContent = perMonth(plan) + " / " + t.planPerMonth;
      card.appendChild(unit);

      var save = savingPercent(plan, baseline);
      if (save > 0) {
        var saveEl = document.createElement("span");
        saveEl.className = "plan-save";
        saveEl.textContent = t.planSave + " " + num(save) + (lang === "fa" ? "٪" : "%");
        card.appendChild(saveEl);
      }

      var actions = document.createElement("div");
      actions.className = "plan-actions";

      var tg = document.createElement("a");
      tg.className = "btn btn-primary btn-block";
      tg.href = tgLink("plan_" + plan.id);
      tg.target = "_blank";
      tg.rel = "noopener";
      tg.textContent = t.planCtaTelegram;
      actions.appendChild(tg);

      if (CFG.paypal.enabled) {
        var pp = document.createElement("a");
        pp.className = "btn btn-outline btn-block";
        pp.href = paypalLink(plan.usd);
        pp.target = "_blank";
        pp.rel = "noopener";
        pp.textContent = t.planCtaPaypal;
        actions.appendChild(pp);
      }

      card.appendChild(actions);
      host.appendChild(card);
    });

    var note = document.getElementById("rialNote");
    if (lang === "fa" && CFG.rialPayment && CFG.rialPayment.enabled) {
      note.textContent = CFG.rialPayment.note;
      note.hidden = false;
    } else {
      note.hidden = true;
    }
  }

  function renderFaq(t) {
    var host = document.getElementById("faqList");
    host.textContent = "";

    t.faq.forEach(function (item) {
      var d = document.createElement("details");
      var s = document.createElement("summary");
      s.textContent = item.q;
      var p = document.createElement("p");
      p.textContent = item.a;
      d.appendChild(s);
      d.appendChild(p);
      host.appendChild(d);
    });
  }

  function renderCapacity(t) {
    var box = document.getElementById("capacity");
    var cap = CFG.capacity;

    if (!cap || !cap.total) {
      box.hidden = true;
      return;
    }

    var left = Math.max(0, cap.total - cap.taken);
    document.getElementById("capacityFill").style.width =
      Math.min(100, (cap.taken / cap.total) * 100) + "%";
    document.getElementById("capacityText").textContent =
      left > 0 ? num(left) + " " + t.heroSlots : t.heroSlotsFull;
    box.hidden = false;
  }

  function render() {
    var t = I18N[lang];
    renderStatic(t);
    renderPlans(t);
    renderFaq(t);
    renderCapacity(t);
  }

  /* ---------- boot ---------- */

  document.getElementById("langToggle").addEventListener("click", function () {
    lang = lang === "fa" ? "en" : "fa";
    saveLang(lang);
    render();
  });

  if (CFG.brand.telegramBot.indexOf("YOUR_") === 0) {
    console.warn("[config] Set brand.telegramBot in config.js — بات تلگرام هنوز تنظیم نشده.");
  }
  if (CFG.paypal.enabled && CFG.paypal.me.indexOf("YOUR_") === 0) {
    console.warn("[config] Set paypal.me in config.js — پی‌پل هنوز تنظیم نشده.");
  }

  render();
})();
