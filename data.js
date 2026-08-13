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

/**
 * data.js — لایه‌ی دیتای زنده‌ی سایت
 * -------------------------------------------------------------
 * این فایل تنها جایی است که باید برای «وصل کردن API واقعی» ویرایش کنید.
 *
 * 1) طلا / سکه / ارز: اول از وب‌سرویس رایگان و بدون‌کلیدِ BrsApi
 *    (Api_Free_Gold_Currency_v2.json) خوانده می‌شود. اگر آن در دسترس
 *    نبود، به‌صورت پشتیبان سراغ نسخه‌ی کلیددار می‌رود (اگر کلید گذاشته
 *    باشید). کلید رایگان را از اینجا بگیرید:
 *       https://brsapi.ir/free-api-gold-currency-webservice/
 *
 * 2) رمزارزها از CoinGecko (بدون کلید) می‌آید — و چون خواستید «همه‌ی
 *    ارزهای دیجیتال» نمایش داده شود، ۱۰۰ رمزارز برتر بازار به‌صورت
 *    خودکار و پویا دریافت و به لیست آیتم‌ها اضافه می‌شوند (نیازی نیست
 *    از قبل در items.js تعریف شوند).
 */

const CONFIG = {
  BRSAPI_FREE_URL: "https://BrsApi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json",
  BRSAPI_KEY: "BeNcsX6xfjRJW3YHXSHTLYN9QrEJTK6r",
  BRSAPI_URL: "https://BrsApi.ir/Api/Market/Gold_Currency.php",
  COINGECKO_MARKETS_URL: "https://api.coingecko.com/api/v3/coins/markets",
  CRYPTO_PAGES: 1,       // هر صفحه ۱۰۰ رمزارز؛ برای دریافت بیشتر این عدد را زیاد کنید
  REFRESH_MS: 60 * 1000, // هر ۶۰ ثانیه به‌روزرسانی خودکار
  HISTORY_POINTS: 300,
  CACHE_KEY: "nerkh_prices_v2",
  HISTORY_KEY: "nerkh_history_v2",
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
   داخل جیسون پیدا می‌کند؛ چون ساختار دقیق خروجی BrsApi ممکن است کمی
   فرق کند، این تابع محافظه‌کارانه با هر شکل معقولی کار می‌کند. */
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

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.error("[چی چند] خطا در دریافت", url, err);
    return null;
  }
}

async function fetchBrsApi() {
  let raw = await fetchJson(CONFIG.BRSAPI_FREE_URL);
  if (raw) return raw;
  if (CONFIG.BRSAPI_KEY && CONFIG.BRSAPI_KEY !== "YOUR_FREE_BRSAPI_KEY") {
    raw = await fetchJson(`${CONFIG.BRSAPI_URL}?key=${encodeURIComponent(CONFIG.BRSAPI_KEY)}`);
  }
  return raw;
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

/* ---------------- رمزارز: ۱۰۰ رمزارز برتر بازار، به‌صورت پویا -------- */
let cryptoItemsRegistered = false;
async function fetchCoinGeckoMarkets() {
  const url = `${CONFIG.COINGECKO_MARKETS_URL}?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`;
  return fetchJson(url);
}

function applyCoinGeckoMarkets(raw) {
  if (!raw || !Array.isArray(raw)) return;
  let itemsAdded = false;
  raw.forEach((coin) => {
    const id = "crypto-" + coin.id;
    if (!SITE_ITEMS.some((it) => it.id === id)) {
      SITE_ITEMS.push({
        id,
        cat: "crypto",
        name: coin.name + (coin.symbol ? " (" + coin.symbol.toUpperCase() + ")" : ""),
        unit: "دلار",
        source: "coingecko-dynamic",
      });
      itemsAdded = true;
    }
    setPrice(id, {
      price: coin.current_price,
      change: coin.price_change_24h,
      changePercent: coin.price_change_percentage_24h,
      unit: "دلار",
      cat: "crypto",
      updated: Date.now(),
    });
  });
  if (itemsAdded) {
    cryptoItemsRegistered = true;
    document.dispatchEvent(new CustomEvent("items:updated"));
  }
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
  const last = arr[arr.length - 1];
  if (!last || last.p !== price) {
    arr.push({ t: Date.now(), p: price });
    while (arr.length > CONFIG.HISTORY_POINTS) arr.shift();
    hist[id] = arr;
    try { localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(hist)); } catch (e) {}
  }
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
  const [brs, cryptoMarkets] = await Promise.all([fetchBrsApi(), fetchCoinGeckoMarkets()]);
  applyBrsApi(brs);
  applyCoinGeckoMarkets(cryptoMarkets);
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
