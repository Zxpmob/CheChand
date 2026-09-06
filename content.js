/**
 * content.js — نوار قیمت «چی چند» کنار صفحه‌ی گوگل
 * -------------------------------------------------------------
 * این اسکریپت روی صفحات google.com اجرا می‌شود و دو پنل شناور (راست و
 * چپ) اضافه می‌کند: قیمت لحظه‌ای طلا/ارز/رمزارز + پرتغییرترین‌های روز +
 * جای تبلیغ. اینکه کدام بخش‌ها نشان داده شوند از تنظیمات (popup.html)
 * خوانده می‌شود.
 */

const CC_DEFAULTS = {
  enabled: true,
  position: "both", // "both" | "left" | "right" | "none"
  showGold: true,
  showCurrency: true,
  showCrypto: true,
  showMovers: true,
  showAds: true,
};

const CC_SITE_URL = "https://example.com/"; // بعد از مشخص‌شدن دامنه‌ی نهایی سایت، این را عوض کنید

function ccGetPrefs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(CC_DEFAULTS, (items) => resolve(items));
  });
}

async function ccFetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// یک زیرمجموعه‌ی کوچک و سبک از قیمت‌ها — فقط برای این ابزار کناری،
// نه کل موتور داده‌ی سایت اصلی
async function ccFetchPrices() {
  const [gold, fiat, coins] = await Promise.all([
    ccFetchJson("https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/gold.json"),
    ccFetchJson("https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/fiat.json"),
    ccFetchJson("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h"),
  ]);

  const items = [];
  if (gold && gold["18ayar"] && typeof gold["18ayar"].value === "number") {
    items.push({ id: "gold-18", cat: "gold", name: "طلای ۱۸ عیار", unit: "تومان", price: gold["18ayar"].value });
  }
  if (fiat) {
    const fiatMap = { usd: "دلار آمریکا", eur: "یورو", try: "لیر ترکیه", aed: "درهم امارات" };
    Object.entries(fiatMap).forEach(([key, name]) => {
      const row = fiat[key];
      if (row && typeof row.value === "number") {
        items.push({ id: key, cat: "currency", name, unit: "تومان", price: row.value });
      }
    });
  }
  let movers = [];
  if (Array.isArray(coins)) {
    coins.forEach((c) => {
      items.push({
        id: "crypto-" + c.id,
        cat: "crypto",
        name: c.name + " (" + (c.symbol || "").toUpperCase() + ")",
        unit: "دلار",
        price: c.current_price,
        changePercent: c.price_change_percentage_24h,
      });
    });
    movers = coins
      .filter((c) => typeof c.price_change_percentage_24h === "number")
      .slice()
      .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, 4)
      .map((c) => ({
        name: c.symbol ? c.symbol.toUpperCase() : c.name,
        changePercent: c.price_change_percentage_24h,
        price: c.current_price,
      }));
  }
  return { items, movers };
}

function ccFormatPrice(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 0 });
}

function ccRow(it) {
  const chg = it.changePercent;
  const hasChg = typeof chg === "number" && !Number.isNaN(chg);
  const cls = hasChg ? (chg > 0 ? "cc-up" : chg < 0 ? "cc-down" : "") : "";
  const chgTxt = hasChg ? `${chg > 0 ? "▲" : chg < 0 ? "▼" : "•"} ${Math.abs(chg).toFixed(1)}%` : "";
  return `
    <div class="cc-row">
      <span class="cc-row-name">${it.name}</span>
      <span class="cc-row-right">
        <span class="cc-row-price">${ccFormatPrice(it.price)} <small>${it.unit}</small></span>
        ${hasChg ? `<span class="cc-row-chg ${cls}">${chgTxt}</span>` : ""}
      </span>
    </div>`;
}

function ccSection(title, items) {
  if (!items.length) return "";
  return `
    <div class="cc-section">
      <div class="cc-section-title">${title}</div>
      ${items.map(ccRow).join("")}
    </div>`;
}

function ccAdSlot(slotId) {
  return `
    <div class="cc-ad-slot" id="${slotId}">
      <span class="cc-ad-label">فضای تبلیغاتی</span>
    </div>`;
}

function ccPanelHTML(side, data, prefs) {
  const gold = data.items.filter((i) => i.cat === "gold");
  const currency = data.items.filter((i) => i.cat === "currency");
  const crypto = data.items.filter((i) => i.cat === "crypto").slice(0, 5);

  let sections = "";
  if (prefs.showGold) sections += ccSection("طلا", gold);
  if (prefs.showCurrency) sections += ccSection("ارز", currency);
  if (prefs.showCrypto) sections += ccSection("ارز دیجیتال", crypto);
  if (prefs.showMovers && data.movers.length) {
    sections += ccSection(
      "پرتغییرترین‌های امروز",
      data.movers.map((m) => ({ name: m.name, unit: "دلار", price: m.price, changePercent: m.changePercent }))
    );
  }

  return `
    <div class="cc-panel cc-panel-${side}" id="cc-panel-${side}">
      <div class="cc-header">
        <a href="${CC_SITE_URL}" target="_blank" rel="noopener" class="cc-brand">
          <img src="${chrome.runtime.getURL("icons/icon-32.png")}" alt="">
          <span>چی چند</span>
        </a>
        <button class="cc-close" title="بستن" data-side="${side}">✕</button>
      </div>
      <div class="cc-body">
        ${sections || '<div class="cc-empty">هیچ بخشی برای نمایش انتخاب نشده — از تنظیمات افزونه فعالش کنید.</div>'}
        ${prefs.showAds ? ccAdSlot("cc-ad-" + side) : ""}
      </div>
      <a href="${CC_SITE_URL}" target="_blank" rel="noopener" class="cc-footer-link">مشاهده‌ی کامل قیمت‌ها ›</a>
    </div>`;
}

async function ccInit() {
  const prefs = await ccGetPrefs();
  if (!prefs.enabled || prefs.position === "none") return;

  const data = await ccFetchPrices();

  const wrap = document.createElement("div");
  wrap.id = "cc-widget-root";
  let html = "";
  if (prefs.position === "both" || prefs.position === "right") html += ccPanelHTML("right", data, prefs);
  if (prefs.position === "both" || prefs.position === "left") html += ccPanelHTML("left", data, prefs);
  wrap.innerHTML = html;
  document.documentElement.appendChild(wrap);

  wrap.querySelectorAll(".cc-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const side = btn.dataset.side;
      const panel = document.getElementById("cc-panel-" + side);
      if (panel) panel.style.display = "none";
    });
  });
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  ccInit();
} else {
  document.addEventListener("DOMContentLoaded", ccInit);
}
