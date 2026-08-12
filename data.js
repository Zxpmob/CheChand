/**
 * data.js — لایه‌ی دیتای زنده‌ی سایت
 * -------------------------------------------------------------
 * این فایل تنها جایی است که باید برای «وصل کردن API واقعی» ویرایش کنید.
 *
 * 1) طلا / سکه / ارز از BrsApi.ir می‌آید (وب‌سرویس رایگان ایرانی، تا ۱۵۰۰
 *    ریکوئست در روز رایگان است). یک کلید رایگان از این آدرس بگیرید:
 *       https://brsapi.ir/free-api-gold-currency-webservice/
 *    و آن را در CONFIG.BRSAPI_KEY پایین همین فایل جای‌گذاری کنید.
 *
 * 2) رمزارزها از CoinGecko می‌آید که کاملاً رایگان و بدون کلید است، پس
 *    از همان لحظه‌ی اول کار می‌کند.
 *
 * 3) فلزات صنعتی/سنگ‌های قیمتی/خودرو/کلکسیونی چون هیچ API رایگان و معتبر
 *    ایرانی برایشان پیدا نشد، فعلاً به‌صورت «مرجع دستی» کار می‌کنند
 *    (در items.js، source:"manual"). هر وقت یک API برایشان پیدا کردید،
 *    کافی‌ست یک تابع fetch مثل دو تابع پایین برایش اضافه کنید.
 */

const CONFIG = {
  BRSAPI_KEY: "BeNcsX6xfjRJW3YHXSHTLYN9QrEJTK6r",
  BRSAPI_URL: "https://Api.BrsApi.ir/Market/Gold_Currency.php",
  COINGECKO_URL: "https://api.coingecko.com/api/v3/simple/price",
  REFRESH_MS: 60 * 1000, // هر ۶۰ ثانیه به‌روزرسانی خودکار
  HISTORY_POINTS: 60,
  CACHE_KEY: "nerkh_prices_v1",
  HISTORY_KEY: "nerkh_history_v1",
};

const PriceStore = {
  data: {},      // id -> {price, change, changePercent, unit, updated, cat}
  ready: false,
  lastFetch: null,
};

/* ------------------------------------------------------------------ */
/* ابزار: نرمال‌سازی رشته برای مقایسه‌ی نام‌های فارسی/انگلیسی           */
function norm(s) {
  return (s || "")
    .toString()
    .replace(/[\u200c\s\-_.]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase();
}

/* هر آبجکتی که شبیه آیتم قیمت باشد (name + یک فیلد عددی) را از هر عمقی
   داخل جیسون پیدا می‌کند؛ چون ساختار دقیق خروجی BrsApi را نمی‌دانیم،
   این تابع محافظه‌کارانه با هر شکل معقولی کار می‌کند. */
function flattenPriceObjects(node, out) {
  out = out || [];
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => flattenPriceObjects(n, out));
    return out;
  }
  const hasName = node.name || node.name_en || node.symbol || node.title;
  const hasPrice = node.price ?? node.value ?? node.close ?? node.Price;
  if (hasName && hasPrice !== undefined) {
    out.push(node);
  }
  Object.values(node).forEach((v) => {
    if (v && typeof v === "object") flattenPriceObjects(v, out);
  });
  return out;
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

async function fetchBrsApi() {
  if (!CONFIG.BRSAPI_KEY || CONFIG.BRSAPI_KEY === "YOUR_FREE_BRSAPI_KEY") {
    console.warn("[چی چند] کلید BrsApi تنظیم نشده — راهنما در بالای data.js");
    return null;
  }
  const url = `${CONFIG.BRSAPI_URL}?key=${encodeURIComponent(CONFIG.BRSAPI_KEY)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.error("[چی چند] خطا در دریافت BrsApi:", err);
    return null;
  }
}

function applyBrsApi(raw) {
  if (!raw) return;
  const flat = flattenPriceObjects(raw);
  const brsItems = SITE_ITEMS.filter((it) => it.source === "brsapi");

  flat.forEach((entry) => {
    const label = norm(pick(entry, ["name", "name_en", "symbol", "title"]));
    const price = pick(entry, ["price", "value", "close", "Price"]);
    const changeVal = pick(entry, ["change_value", "change", "d"]);
    const changePct = pick(entry, ["change_percent", "changePercent", "dp"]);
    if (!label || price === undefined) return;

    const match = brsItems.find((it) =>
      it.match.some((kw) => label.includes(norm(kw)))
    );
    if (!match) return;

    setPrice(match.id, {
      price: Number(price),
      change: changeVal !== undefined ? Number(changeVal) : null,
      changePercent: changePct !== undefined ? Number(changePct) : null,
      unit: match.unit,
      cat: match.cat,
      updated: Date.now(),
    });
  });
}

async function fetchCoinGecko() {
  const ids = SITE_ITEMS.filter((it) => it.source === "coingecko").map((it) => it.cgId);
  const url = `${CONFIG.COINGECKO_URL}?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.error("[چی چند] خطا در دریافت CoinGecko:", err);
    return null;
  }
}

function applyCoinGecko(raw) {
  if (!raw) return;
  SITE_ITEMS.filter((it) => it.source === "coingecko").forEach((it) => {
    const row = raw[it.cgId];
    if (!row) return;
    setPrice(it.id, {
      price: row.usd,
      change: null,
      changePercent: row.usd_24h_change ?? null,
      unit: it.unit,
      cat: it.cat,
      updated: Date.now(),
    });
  });
}

function setPrice(id, info) {
  const prev = PriceStore.data[id];
  PriceStore.data[id] = { ...prev, ...info };
  pushHistory(id, info.price);
}

function pushHistory(id, price) {
  if (typeof price !== "number" || Number.isNaN(price)) return;
  let hist = {};
  try { hist = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || "{}"); } catch (e) { hist = {}; }
  const arr = hist[id] || [];
  arr.push({ t: Date.now(), p: price });
  while (arr.length > CONFIG.HISTORY_POINTS) arr.shift();
  hist[id] = arr;
  try { localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(hist)); } catch (e) {}
}

function getHistory(id) {
  try {
    const hist = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || "{}");
    return hist[id] || [];
  } catch (e) { return []; }
}

function loadCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY) || "null");
    if (raw) PriceStore.data = raw;
  } catch (e) {}
}
function saveCache() {
  try { localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(PriceStore.data)); } catch (e) {}
}

async function refreshAllPrices() {
  const [brs, cg] = await Promise.all([fetchBrsApi(), fetchCoinGecko()]);
  applyBrsApi(brs);
  applyCoinGecko(cg);
  PriceStore.ready = true;
  PriceStore.lastFetch = Date.now();
  saveCache();
  document.dispatchEvent(new CustomEvent("prices:updated", { detail: PriceStore.data }));
}

function initPriceEngine() {
  loadCache();
  if (Object.keys(PriceStore.data).length) {
    document.dispatchEvent(new CustomEvent("prices:updated", { detail: PriceStore.data }));
  }
  refreshAllPrices();
  setInterval(refreshAllPrices, CONFIG.REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshAllPrices();
  });
}

function formatPrice(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 0 });
}
