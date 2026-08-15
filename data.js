/**
 * data.js — لایه‌ی دیتای زنده‌ی سایت
 * -------------------------------------------------------------
 * دو حالت دارد:
 *
 * ۱) اگر Supabase را وصل کرده باشید (پایین همین فایل، CONFIG.SUPABASE_URL
 *    و CONFIG.SUPABASE_ANON_KEY را پر کرده باشید): سایت فقط با Supabase
 *    حرف می‌زند. قیمت‌ها را یک ربات گیت‌هاب (فایل update-prices.js، هر
 *    ۱۵ دقیقه، از سرورهای گیت‌هاب) در Supabase می‌گذارد — این روش چون از
 *    ایران فیلترینگ رد نمی‌شود، قابل‌اعتمادتر است. راهنمای کامل در
 *    README.md، بخش «راه‌اندازی Supabase».
 *
 * ۲) اگر Supabase را وصل نکرده باشید: سایت مستقیم از مرورگر کاربر برای
 *    طلا/سکه/ارز به یک آینه‌ی رایگان و تأییدشده‌ی داده‌ی Navasan روی
 *    گیت‌هاب (raw.githubusercontent.com) و برای رمزارز به Nobitex (صرافی
 *    ایرانی) وصل می‌شود. Nobitex را عمداً به‌جای CoinGecko گذاشتم چون
 *    داخل ایران میزبانی می‌شود و احتمال فیلترشدنش خیلی کمتر است.
 */

const CONFIG = {
  // --- حالت ۱: Supabase (اختیاری، ولی توصیه‌شده) ---
  SUPABASE_URL: "",       // مثلاً: https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: "",  // کلید anon public (از Settings → API در Supabase)

  // --- حالت ۲: اتصال مستقیم (بدون نیاز به هیچ تنظیمی از پیش کار می‌کند) ---
  NOBITEX_STATS_URL: "https://api.nobitex.ir/market/stats",

  REFRESH_MS: 20 * 1000, // هر ۲۰ ثانیه یک‌بار بررسی می‌کنیم؛ سریع‌ترین بازه‌ای که بدون فشار زیاد به منبع رایگان معقول است
  HISTORY_POINTS: 300,
  CACHE_KEY: "nerkh_prices_v5",
  HISTORY_KEY: "nerkh_history_v5",
};

function isSupabaseConfigured() {
  return !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

const PriceStore = {
  data: {},
  ready: false,
  lastFetch: null,
};

/* ------------------------------------------------------------------ */
function norm(s) {
  return (s || "").toString()
    .replace(/[\u200c\s\-_.]/g, "")
    .replace(/ي/g, "ی").replace(/ك/g, "ک")
    .toLowerCase();
}

function flattenPriceObjects(node, out) {
  out = out || [];
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) { node.forEach((n) => flattenPriceObjects(n, out)); return out; }
  const hasName = node.name || node.name_en || node.symbol || node.title;
  const hasPrice = node.price ?? node.value ?? node.close ?? node.Price;
  if (hasName && hasPrice !== undefined) out.push(node);
  Object.values(node).forEach((v) => { if (v && typeof v === "object") flattenPriceObjects(v, out); });
  return out;
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

const DIAG = { errors: [] };
function recordDiagError(url, err) {
  DIAG.errors.push({ url, message: (err && err.message) || String(err), time: Date.now() });
  if (DIAG.errors.length > 20) DIAG.errors.shift();
}
window.NERKH_DIAG = DIAG;

async function fetchJson(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal, ...opts });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    const msg = err && err.name === "AbortError" ? "بیش از ۱۰ ثانیه پاسخی نیامد (تایم‌اوت)" : err;
    console.error("[چی چند] خطا در دریافت", url, msg);
    recordDiagError(url, err && err.name === "AbortError" ? new Error("تایم‌اوت (۱۰ ثانیه)") : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ==================== حالت ۱: Supabase ==================== */
async function fetchSupabaseLatest() {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/latest_prices?select=*`;
  return fetchJson(url, {
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
  });
}

async function fetchSupabaseHistory(itemId, limit) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/price_history?item_id=eq.${encodeURIComponent(itemId)}&select=price,created_at&order=created_at.asc&limit=${limit || 500}`;
  const rows = await fetchJson(url, {
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
  });
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({ t: new Date(r.created_at).getTime(), p: Number(r.price) }));
}

function applySupabaseRows(rows) {
  if (!Array.isArray(rows)) return false;
  let itemsAdded = false;
  rows.forEach((row) => {
    if (!SITE_ITEMS.some((it) => it.id === row.item_id)) {
      SITE_ITEMS.push({ id: row.item_id, cat: row.category, name: row.name, unit: row.unit || "", source: "supabase" });
      itemsAdded = true;
    }
    setPrice(row.item_id, {
      price: row.price === null ? null : Number(row.price),
      changePercent: row.change_percent === null ? null : Number(row.change_percent),
      unit: row.unit,
      cat: row.category,
      updated: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    });
  });
  if (itemsAdded) document.dispatchEvent(new CustomEvent("items:updated"));
  return rows.length > 0;
}

/* ==================== حالت ۲: اتصال مستقیم ==================== */
/* منبع طلا/سکه/ارز: یک آینه‌ی رایگان و بدون‌کلید از داده‌ی Navasan که
   هر ۳۰ دقیقه روی گیت‌هاب آپدیت می‌شود (ساختار JSON آن را از قبل دیده و
   تأیید کرده‌ام). چون روی raw.githubusercontent.com است، معمولاً از
   ایران هم در دسترس است.

   طلا/سکه و ارز، هیچ‌کدام دیگر «لیست ثابت» ندارند: هر کلیدی که واقعاً در
   پاسخ منبع دیده شود، همان لحظه به SITE_ITEMS اضافه و قیمتش ثبت می‌شود؛
   هر کلیدی که نباشد، اصلاً کارتی برایش ساخته نمی‌شود. این‌طور هیچ کارتِ
   خالی یا برای‌همیشه در حال بارگذاری روی سایت نمی‌ماند. */
const NAVASAN_GOLD_URL = "https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/gold.json";
const NAVASAN_FIAT_URL = "https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/fiat.json";

// کلیدهای طلا/سکه‌ای که از منبع می‌شناسیم، به همراه نام فارسی و دسته‌شان
const GOLD_KEY_MAP = {
  "18ayar":     { id: "gold-18",           name: "طلای ۱۸ عیار (هر گرم)",     cat: "gold" },
  "abshodeh":   { id: "gold-molten",       name: "طلای آب‌شده (نقدی)",        cat: "gold" },
  "sekkeh":     { id: "coin-emami",        name: "سکه امامی",                 cat: "coin" },
  "bahar":      { id: "coin-azadi",        name: "سکه بهار آزادی",            cat: "coin" },
  "nim":        { id: "coin-half",         name: "نیم‌سکه",                   cat: "coin" },
  "rob":        { id: "coin-quarter",      name: "ربع‌سکه",                   cat: "coin" },
  "gerami":     { id: "coin-gerami",       name: "سکه گرمی",                  cat: "coin" },
  "bub_sekkeh": { id: "coin-emami-bubble", name: "حباب سکه امامی",            cat: "coin" },
  "bub_bahar":  { id: "coin-azadi-bubble", name: "حباب سکه بهار آزادی",       cat: "coin" },
  "bub_nim":    { id: "coin-half-bubble",  name: "حباب نیم‌سکه",              cat: "coin" },
  "bub_rob":    { id: "coin-quarter-bubble", name: "حباب ربع‌سکه",            cat: "coin" },
  "bub_gerami": { id: "coin-gerami-bubble", name: "حباب سکه گرمی",            cat: "coin" },
};

// نام فارسیِ هرچه بیشتر کدهای ارزی که Navasan معمولاً می‌دهد؛ هر کد دیگری
// هم که در پاسخ باشد و اینجا نامش را نداشته باشیم، با همان کد لاتین نشان
// داده می‌شود (نه حذف) — یعنی هیچ ارزی که منبع دارد از قلم نمی‌افتد.
const CURRENCY_NAMES = {
  usd: "دلار آمریکا", eur: "یورو", gbp: "پوند انگلیس", chf: "فرانک سوئیس",
  aed: "درهم امارات", aed_note: "درهم امارات (اسکناس)", try: "لیر ترکیه",
  sar: "ریال عربستان", cny: "یوان چین", jpy: "ین ژاپن", rub: "روبل روسیه",
  cad: "دلار کانادا", aud: "دلار استرالیا", nzd: "دلار نیوزیلند",
  sgd: "دلار سنگاپور", pkr: "روپیه پاکستان", azn: "منات آذربایجان",
  nok: "کرون نروژ", sek: "کرون سوئد", dkk: "کرون دانمارک", kwd: "دینار کویت",
  omr: "ریال عمان", bhd: "دینار بحرین", qar: "ریال قطر", iqd: "دینار عراق",
  brl: "رئال برزیل", thb: "بات تایلند", afn: "افغانی افغانستان",
  inr: "روپیه هند", myr: "رینگیت مالزی", gel: "لاری گرجستان",
  amd: "درام ارمنستان", kzt: "تنگه قزاقستان", eur_hav: "یورو (حواله)",
  gbp_hav: "پوند (حواله)", aud_hav: "دلار استرالیا (حواله)",
  cny_hav: "یوان چین (حواله)", try_hav: "لیر ترکیه (حواله)",
  jpy_hav: "ین ژاپن (حواله)", myr_hav: "رینگیت مالزی (حواله)",
};
// کدهایی که عمداً نمایش نمی‌دهیم چون تکراری/گمراه‌کننده‌اند (نرخ شرکتی و مشابه)
const CURRENCY_SKIP = new Set(["usd_sherkat", "usd_shakhs", "hav_cad_cheque"]);

// درصد تغییر ممکن است زیر نام‌های مختلفی در منبع باشد؛ همه را امتحان می‌کنیم
// تا به‌جای خالی‌ماندن، واقعاً مقدارش را پیدا کنیم.
function extractChangePercent(row) {
  if (!row) return null;
  const candidates = [row.change_pct, row.changePercent, row.change_percent, row.percent_change, row.percent, row.drsd];
  for (const c of candidates) {
    if (c === undefined || c === null || c === "") continue;
    const n = typeof c === "string" ? parseFloat(c.replace(/[^\d.\-]/g, "")) : Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function ensureItem(id, cat, name, unit) {
  if (!SITE_ITEMS.some((it) => it.id === id)) {
    SITE_ITEMS.push({ id, cat, name, unit });
    return true;
  }
  return false;
}

async function fetchNavasan() {
  const [gold, fiat] = await Promise.all([fetchJson(NAVASAN_GOLD_URL), fetchJson(NAVASAN_FIAT_URL)]);
  return { gold, fiat };
}

function applyNavasan({ gold, fiat }) {
  let itemsAdded = false;

  if (gold) {
    Object.entries(GOLD_KEY_MAP).forEach(([srcKey, meta]) => {
      const row = gold[srcKey];
      if (!row || typeof row.value !== "number") return;
      if (ensureItem(meta.id, meta.cat, meta.name, "تومان")) itemsAdded = true;
      setPrice(meta.id, {
        price: row.value, // مقدار Navasan از قبل به تومان است (نه ریال)
        changePercent: extractChangePercent(row),
        unit: "تومان",
        cat: meta.cat,
        updated: Date.now(), // زمان بررسیِ ما، نه زمان داخلی منبع — تا نمای «چند ثانیه پیش» واقعاً به‌روز بماند
      });
    });
    // طلای ۲۴ و ۲۱ عیار و مثقال مستقیم در منبع نیستند؛ از روی طلای ۱۸ عیار
    // واقعی، با فرمول استاندارد خلوص محاسبه می‌شوند (نه یک عدد ساختگی)
    const g18 = PriceStore.data["gold-18"];
    if (g18 && typeof g18.price === "number") {
      if (ensureItem("gold-24", "gold", "طلای ۲۴ عیار (هر گرم)", "تومان")) itemsAdded = true;
      if (ensureItem("gold-21", "gold", "طلای ۲۱ عیار (هر گرم)", "تومان")) itemsAdded = true;
      if (ensureItem("gold-mesghal", "gold", "هر مثقال طلا", "تومان")) itemsAdded = true;
      setPrice("gold-24", { price: g18.price / 0.75, changePercent: g18.changePercent, unit: "تومان", cat: "gold", updated: g18.updated });
      setPrice("gold-21", { price: g18.price * (21 / 18), changePercent: g18.changePercent, unit: "تومان", cat: "gold", updated: g18.updated });
      setPrice("gold-mesghal", { price: g18.price * 4.6083, changePercent: g18.changePercent, unit: "تومان", cat: "gold", updated: g18.updated });
    }
    const xau = gold["usd_xau"];
    if (xau && xau.value !== undefined) {
      if (ensureItem("gold-ounce", "gold", "انس جهانی طلا", "دلار")) itemsAdded = true;
      setPrice("gold-ounce", { price: Number(xau.value), changePercent: extractChangePercent(xau), unit: "دلار", cat: "gold", updated: Date.now() });
    }
  }

  if (fiat) {
    Object.entries(fiat).forEach(([key, row]) => {
      if (CURRENCY_SKIP.has(key)) return;
      if (!row || typeof row.value !== "number") return;
      const name = CURRENCY_NAMES[key] || key.toUpperCase();
      if (ensureItem(key, "currency", name, "تومان")) itemsAdded = true;
      setPrice(key, {
        price: row.value, // مقدار Navasan از قبل به تومان است (نه ریال)
        changePercent: extractChangePercent(row),
        unit: "تومان",
        cat: "currency",
        updated: Date.now(), // زمان بررسیِ ما، نه زمان داخلی منبع — تا نمای «چند ثانیه پیش» واقعاً به‌روز بماند
      });
    });
  }

  if (itemsAdded) document.dispatchEvent(new CustomEvent("items:updated"));
}

/* رمزارز در «حالت مستقیم»: Nobitex از اینجا کار نمی‌کند چون API آن برای
   استفاده‌ی مستقیم از دامنه‌های دیگر (CORS) باز نیست — همان چیزی که
   خطای «NetworkError when attempting to fetch resource» نشانش می‌داد.
   Nobitex فقط داخل update-prices.js (که سمت سرور اجرا می‌شود، نه توی
   مرورگر) قابل استفاده است. برای حالت مستقیم از CoinGecko استفاده
   می‌کنیم که صراحتاً برای فراخوانی مستقیم از مرورگر ساخته شده. */
const COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&price_change_percentage=24h";

async function fetchCoinGeckoMarkets() {
  const [p1, p2] = await Promise.all([
    fetchJson(COINGECKO_MARKETS_URL + "&page=1"),
    fetchJson(COINGECKO_MARKETS_URL + "&page=2"),
  ]);
  return [...(p1 || []), ...(p2 || [])];
}

function applyCoinGeckoMarkets(raw) {
  if (!raw || !Array.isArray(raw)) return;
  let itemsAdded = false;
  raw.forEach((coin) => {
    const id = "crypto-" + coin.id;
    if (!SITE_ITEMS.some((it) => it.id === id)) {
      SITE_ITEMS.push({
        id, cat: "crypto",
        name: coin.name + (coin.symbol ? " (" + coin.symbol.toUpperCase() + ")" : ""),
        unit: "دلار", source: "coingecko",
      });
      itemsAdded = true;
    }
    setPrice(id, {
      price: coin.current_price,
      changePercent: coin.price_change_percentage_24h,
      unit: "دلار", cat: "crypto", updated: Date.now(),
    });
  });
  if (itemsAdded) document.dispatchEvent(new CustomEvent("items:updated"));
}

/* ==================== مشترک ==================== */
function setPrice(id, info) {
  const prev = PriceStore.data[id];
  PriceStore.data[id] = { ...prev, ...info };
  pushHistory(id, info.price);
}

function pushHistory(id, price, explicitTs) {
  if (typeof price !== "number" || Number.isNaN(price)) return;
  let hist = {};
  try { hist = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || "{}"); } catch (e) { hist = {}; }
  const arr = hist[id] || [];
  const t = explicitTs || Date.now();
  const last = arr[arr.length - 1];
  if (!last || last.p !== price || explicitTs) {
    arr.push({ t, p: price });
    arr.sort((a, b) => a.t - b.t);
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

/* تاریخچه‌ی یک آیتم را برمی‌گرداند: اگر Supabase وصل است از آنجا (واقعاً
   چندروزه)، وگرنه برای طلای ۱۸ عیار از تاریخچه‌ی commit های گیت‌هاب
   (بک‌فیل واقعی، بدون دیتابیس) و برای بقیه از localStorage */
async function loadItemHistory(id) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await fetchSupabaseHistory(id);
      if (rows.length) return rows;
    } catch (e) { console.error(e); }
  } else if (id === "gold-ounce") {
    await backfillGoldHistoryFromGitHub();
  }
  return getHistory(id);
}

/* ==================== تاریخچه‌ی واقعی بدون دیتابیس ====================
   داده‌ی Navasan هر ۳۰ دقیقه با یک commit جدید روی گیت‌هاب آپدیت می‌شود؛
   یعنی خودِ تاریخچه‌ی commit های آن مخزن، یک آرشیو واقعی از قیمت طلا در
   طول زمان است. اینجا آن تاریخچه را (فقط یک‌بار، برای همیشه در مرورگر
   کاربر ذخیره می‌شود) می‌خوانیم — بدون نیاز به هیچ دیتابیسی. */
const GOLD_BACKFILL_FLAG = "nerkh_gold_backfill_done_v3";
const GOLD_COMMITS_API = "https://api.github.com/repos/HosseinOdd/Navasan-API/commits?path=data/gold.json&per_page=100";

async function runWithLimit(tasks, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function backfillGoldHistoryFromGitHub(onProgress) {
  if (localStorage.getItem(GOLD_BACKFILL_FLAG)) return false;
  try {
    const page1 = await fetchJson(GOLD_COMMITS_API + "&page=1");
    const page2 = await fetchJson(GOLD_COMMITS_API + "&page=2");
    const commits = [...(page1 || []), ...(page2 || [])];
    if (!commits.length) return false;

    const tasks = commits.map((c) => async () => {
      const sha = c.sha;
      const date = c.commit && c.commit.committer ? new Date(c.commit.committer.date).getTime() : null;
      const raw = await fetchJson(`https://raw.githubusercontent.com/HosseinOdd/Navasan-API/${sha}/data/gold.json`);
      if (!raw || !date) return null;
      const row = raw["usd_xau"];
      if (!row || row.value === undefined) return null;
      return { t: date, p: Number(row.value) };
    });

    const points = (await runWithLimit(tasks, 8)).filter(Boolean);
    points.forEach((pt) => pushHistory("gold-ounce", pt.p, pt.t));
    localStorage.setItem(GOLD_BACKFILL_FLAG, "1");
    if (onProgress) onProgress(points.length);
    return points.length > 0;
  } catch (e) {
    console.error("[چی چند] بک‌فیل تاریخچه‌ی طلا ناموفق بود:", e);
    return false;
  }
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
  let handled = false;
  if (isSupabaseConfigured()) {
    const rows = await fetchSupabaseLatest();
    if (applySupabaseRows(rows)) handled = true;
  }
  if (!handled) {
    const [nav, crypto] = await Promise.all([fetchNavasan(), fetchCoinGeckoMarkets()]);
    applyNavasan(nav);
    applyCoinGeckoMarkets(crypto);
  }
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
