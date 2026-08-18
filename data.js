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
 *    گیت‌هاب (raw.githubusercontent.com) و برای رمزارز به CoinGecko وصل
 *    می‌شود (چون API نوبیتکس اجازه‌ی فراخوانی مستقیم از دامنه‌های دیگر
 *    را نمی‌دهد — نوبیتکس فقط داخل update-prices.js، که سمت سرور اجرا
 *    می‌شود، قابل استفاده است).
 */

const CONFIG = {
  // --- حالت ۱: Supabase (اختیاری، ولی توصیه‌شده) ---
  SUPABASE_URL: "",       // مثلاً: https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: "",  // کلید anon public (از Settings → API در Supabase)

  // --- حالت ۲: اتصال مستقیم (بدون نیاز به هیچ تنظیمی از پیش کار می‌کند) ---
  NOBITEX_STATS_URL: "https://api.nobitex.ir/market/stats",

  REFRESH_MS: 30 * 1000, // هر ۳۰ ثانیه یک‌بار بررسی می‌کنیم (طلا/ارز از یک فایل ثابت روی گیت‌هاب می‌آید، فشاری ندارد)
  // رمزارز جدا و کندتر بررسی می‌شود (هر ۳ چرخه = ~۹۰ ثانیه)، چون API رایگان
  // CoinGecko سقف ۵ تا ۱۵ درخواست در دقیقه دارد؛ چک‌کردن هر ۲۰ ثانیه (قبلی)
  // یعنی ۶ درخواست در دقیقه فقط از یک تب — با چند کاربر پشت یک IP مشترک
  // (که در ایران با NAT حامل رایج است) همین باعث می‌شد قیمت رمزارز و
  // «پرتغییرترین‌ها» به‌طور نامنظم خالی بمانند.
  CRYPTO_REFRESH_EVERY_N_CYCLES: 3,

  // سقف تعداد نقطه‌ی تاریخی که برای هر آیتم در مرورگر نگه می‌داریم.
  // طلا/سکه/ارز به‌ندرت تغییر می‌کنند (منبع هر ۳۰ دقیقه آپدیت می‌شود)، پس
  // سقف بالا فضای کمی می‌گیرد ولی نمودارشان را تا حدود یک ماه عمق می‌دهد —
  // دقیقاً همان چیزی که برای تب‌های «هفتگی»/«ماهانه» لازم است.
  HISTORY_POINTS: 2200,
  // رمزارز تا ۵۰۰ آیتم است و هر ۲۰ ثانیه پرس‌وجو می‌شود؛ اگر سقف بالا را
  // برای همه‌شان می‌داشتیم، حافظه‌ی مرورگر خیلی زود پر می‌شد. سقف پایین‌تر
  // برای زنده‌ماندنِ لحظه‌ای کافی است؛ برای «تاریخچه‌ی واقعی یک کوین
  // خاص» (وقتی کاربر وارد صفحه‌ی نمودار همان کوین می‌شود) جدا و مستقیم
  // از خودِ CoinGecko گرفته می‌شود (نگاه کنید به backfillCryptoHistory).
  HISTORY_POINTS_CRYPTO: 200,

  CACHE_KEY: "nerkh_prices_v5",
  HISTORY_KEY: "nerkh_history_v6", // نسخه عوض شد — تاریخچه‌ی قدیمیِ ذخیره‌شده در مرورگر کاربر (که شامل نقاط تخت/کم‌تراکم نسخه‌ی قبلی بود) کنار گذاشته می‌شود و از صفر و تمیز ساخته می‌شود
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJsonOnce(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal, ...opts });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// اگر پاسخ ۴۲۹ (بیش از حد مجاز درخواست) یا ۵۰۳ بود، یک یا دو بار با کمی
// مکث دوباره تلاش می‌کنیم به‌جای این‌که فوراً شکست بخوریم و کارت خالی
// بماند — این دقیقاً همان چیزی است که باعث می‌شد رمزارز/پرتغییرترین‌ها
// گاهی بدون هیچ پیام خطایی خالی بمانند.
async function fetchJson(url, opts, retries) {
  retries = retries === undefined ? 2 : retries;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJsonOnce(url, opts);
    } catch (err) {
      lastErr = err;
      const retryable = err && (err.name === "AbortError" || err.status === 429 || err.status === 503 || err.status >= 500);
      if (attempt < retries && retryable) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  const msg = lastErr && lastErr.name === "AbortError" ? "بیش از ۱۰ ثانیه پاسخی نیامد (تایم‌اوت)" : lastErr;
  console.error("[چی چند] خطا در دریافت", url, msg);
  recordDiagError(url, lastErr && lastErr.name === "AbortError" ? new Error("تایم‌اوت (۱۰ ثانیه)") : (lastErr && lastErr.status === 429 ? new Error("محدودیت تعداد درخواست منبع (۴۲۹) — کمی بعد دوباره امتحان می‌شود") : lastErr));
  return null;
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

// فقط همین کدها «ارز» حساب می‌شوند — لیست سفید عمدی، نه پذیرفتن هرچیزی
// که در پاسخ منبع باشد؛ چون بعضی منابع مالی ایرانی گاهی یکی-دو تا نرخ
// رمزارز را هم کنار ارزها می‌گذارند، و ما نمی‌خواهیم آن‌ها تصادفی وارد
// «بخش ارز» شوند. هر کد ارزی که اینجا نباشد، اصلاً نمایش داده نمی‌شود.
const CURRENCY_NAMES = {
  usd: "دلار آمریکا (آمریکا)",
  eur: "یورو (اتحادیه اروپا)",
  gbp: "پوند انگلیس (بریتانیا)",
  chf: "فرانک سوئیس (سوئیس)",
  aed: "درهم امارات (امارات متحده عربی)",
  aed_note: "درهم امارات، اسکناس (امارات متحده عربی)",
  try: "لیر ترکیه (ترکیه)",
  sar: "ریال عربستان (عربستان سعودی)",
  cny: "یوان چین (چین)",
  jpy: "ین ژاپن (ژاپن)",
  rub: "روبل روسیه (روسیه)",
  cad: "دلار کانادا (کانادا)",
  aud: "دلار استرالیا (استرالیا)",
  nzd: "دلار نیوزیلند (نیوزیلند)",
  sgd: "دلار سنگاپور (سنگاپور)",
  pkr: "روپیه پاکستان (پاکستان)",
  azn: "منات آذربایجان (آذربایجان)",
  nok: "کرون نروژ (نروژ)",
  sek: "کرون سوئد (سوئد)",
  dkk: "کرون دانمارک (دانمارک)",
  kwd: "دینار کویت (کویت)",
  omr: "ریال عمان (عمان)",
  bhd: "دینار بحرین (بحرین)",
  qar: "ریال قطر (قطر)",
  iqd: "دینار عراق (عراق)",
  brl: "رئال برزیل (برزیل)",
  thb: "بات تایلند (تایلند)",
  afn: "افغانی (افغانستان)",
  inr: "روپیه هند (هند)",
  myr: "رینگیت مالزی (مالزی)",
  gel: "لاری گرجستان (گرجستان)",
  amd: "درام ارمنستان (ارمنستان)",
  kzt: "تنگه قزاقستان (قزاقستان)",
  eur_hav: "یورو، حواله (اتحادیه اروپا)",
  gbp_hav: "پوند، حواله (بریتانیا)",
  aud_hav: "دلار استرالیا، حواله (استرالیا)",
  cny_hav: "یوان چین، حواله (چین)",
  try_hav: "لیر ترکیه، حواله (ترکیه)",
  jpy_hav: "ین ژاپن، حواله (ژاپن)",
  myr_hav: "رینگیت مالزی، حواله (مالزی)",
};
// کدهایی که عمداً نمایش نمی‌دهیم چون تکراری/گمراه‌کننده‌اند (نرخ شرکتی و مشابه)
const CURRENCY_SKIP = new Set(["usd_sherkat", "usd_shakhs", "hav_cad_cheque"]);

// درصد تغییرِ ۲۴ ساعته را دیگر از فیلدهای حدسیِ منبع نمی‌خوانیم (چون در
// عمل معلوم شد یا پیدا نمی‌شدند یا همیشه صفر برمی‌گشتند)؛ به‌جایش از
// همان تاریخچه‌ای که خودمان ثبت می‌کنیم محاسبه‌اش می‌کنیم. تا وقتی داده‌ی
// ۲۴ساعته‌ی کافی جمع نشده (برای انس طلا از همان اول، چون بک‌فیل واقعی
// دارد؛ برای بقیه‌ی آیتم‌ها ظرف حدود یک روز اول) به‌جای عدد ساختگی، «—»
// نشان داده می‌شود — نه صفرِ نادرست.
function computeChangePercent24h(id, currentPrice) {
  if (typeof currentPrice !== "number") return null;
  const hist = getHistory(id);
  if (!hist.length) return null;
  const targetT = Date.now() - 24 * 60 * 60 * 1000;
  let best = null, bestDiff = Infinity;
  for (const p of hist) {
    const diff = Math.abs(p.t - targetT);
    if (diff < bestDiff) { bestDiff = diff; best = p; }
  }
  if (!best || !best.p) return null;
  if (Math.abs(best.t - targetT) > 4 * 60 * 60 * 1000) return null; // هنوز داده‌ی به‌اندازه‌ی کافی قدیمی نداریم
  return ((currentPrice - best.p) / best.p) * 100;
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
        changePercent: computeChangePercent24h(meta.id, row.value),
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
      setPrice("gold-ounce", { price: Number(xau.value), changePercent: computeChangePercent24h("gold-ounce", Number(xau.value)), unit: "دلار", cat: "gold", updated: Date.now() });
    }
  }

  if (fiat) {
    Object.entries(CURRENCY_NAMES).forEach(([key, name]) => {
      const row = fiat[key];
      if (CURRENCY_SKIP.has(key)) return;
      if (!row || typeof row.value !== "number") return;
      if (ensureItem(key, "currency", name, "تومان")) itemsAdded = true;
      setPrice(key, {
        price: row.value, // مقدار Navasan از قبل به تومان است (نه ریال)
        changePercent: computeChangePercent24h(key, row.value),
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
  // این دو صفحه قبلاً هم‌زمان (Promise.all) درخواست می‌شدند؛ چون سقف
  // رایگان CoinGecko همین‌قدر پایین است (۵ تا ۱۵ درخواست در دقیقه)، یک
  // مکث کوچک بین این دو درخواست می‌گذاریم تا احتمال ۴۲۹‌خوردن کمتر شود.
  const p1 = await fetchJson(COINGECKO_MARKETS_URL + "&page=1");
  await sleep(800);
  const p2 = await fetchJson(COINGECKO_MARKETS_URL + "&page=2");
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

function historyCapFor(id) {
  return id.startsWith("crypto-") ? CONFIG.HISTORY_POINTS_CRYPTO : CONFIG.HISTORY_POINTS;
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
    const cap = historyCapFor(id);
    while (arr.length > cap) arr.shift();
    hist[id] = arr;
    try {
      localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(hist));
    } catch (e) {
      // اگر حافظه‌ی مرورگر پر شده بود، همه‌ی تاریخچه‌ها را نصف می‌کنیم و
      // دوباره تلاش می‌کنیم — بهتر از این‌که کل ثبت تاریخچه متوقف شود
      try {
        Object.keys(hist).forEach((k) => {
          const a = hist[k];
          if (a.length > 20) hist[k] = a.slice(Math.floor(a.length / 2));
        });
        localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(hist));
      } catch (e2) {}
    }
  }
}

function getHistory(id) {
  try {
    const hist = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || "{}");
    return hist[id] || [];
  } catch (e) { return []; }
}

/* تاریخچه‌ی یک آیتم را برمی‌گرداند: اگر Supabase وصل است از آنجا (واقعاً
   چندروزه)، وگرنه:
   - طلا/سکه/ارز: از تاریخچه‌ی commit های گیت‌هاب (بک‌فیل واقعی، بدون دیتابیس)
   - رمزارز: مستقیم از تاریخچه‌ی واقعیِ خودِ CoinGecko برای همان کوین */
async function loadItemHistory(id) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await fetchSupabaseHistory(id);
      if (rows.length) return rows;
    } catch (e) { console.error(e); }
  } else if (id.startsWith("crypto-")) {
    await backfillCryptoHistory(id);
  } else {
    await backfillAllNavasanHistory();
  }
  return getHistory(id);
}

/* ==================== تاریخچه‌ی واقعی بدون دیتابیس: طلا/سکه/ارز ====================
   داده‌ی Navasan هر ۳۰ دقیقه با یک commit جدید روی گیت‌هاب آپدیت می‌شود؛
   یعنی خودِ تاریخچه‌ی commit های آن مخزن، یک آرشیو واقعی از قیمت‌ها در
   طول زمان است. اینجا آن تاریخچه را — یک‌بار، برای همیشه در مرورگر کاربر
   ذخیره می‌شود — برای همه‌ی آیتم‌های طلا/سکه/ارز با هم می‌خوانیم (نه فقط
   یکی)، چون هر commit شامل همه‌ی این مقادیر با هم است؛ همان مجموعه
   fetch یک‌بار همه را پر می‌کند. */
// نسخه‌ی v6: بک‌فیل برای همه‌ی آیتم‌ها، ولی سبک‌تر (~۶ روز به‌جای ~۴۰ روز)
// چون نسخه‌ی قبلی تا ۴۰۰۰ درخواست همزمان می‌زد و هم کند بود هم باعث
// می‌شد باقی سایت (رمزارز، حتی طلا/ارز زنده) گیر کند یا رد شود.
const FULL_BACKFILL_FLAG = "nerkh_full_backfill_done_v7";
// اگر بک‌فیل شکست خورد (مثلاً به‌خاطر سقف درخواست گیت‌هاب)، این زمان را
// ثبت می‌کنیم و تا ۶ ساعت دوباره امتحان نمی‌کنیم.
const BACKFILL_COOLDOWN_FLAG = "nerkh_backfill_last_attempt_v7";
const BACKFILL_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const GOLD_COMMITS_API = "https://api.github.com/repos/HosseinOdd/Navasan-API/commits?path=data/gold.json&per_page=100";
const FIAT_COMMITS_API = "https://api.github.com/repos/HosseinOdd/Navasan-API/commits?path=data/fiat.json&per_page=100";
// نسخه‌ی v6 (۳ صفحه + نمونه‌برداری یکی‌درمیان) برای رفع مشکل کندی خیلی
// سبک شده بود، ولی همین باعث شد فاصله‌ی واقعی بین نقاط زیاد شود — نتیجه‌اش
// روی نمودار، جهش‌های ناگهانی و خط‌های عمودی غیرواقعی بین دو نقطه‌ی دورافتاده
// بود (چیزی که در اسکرین‌شات هفتگی دیده شد). نکته‌ی مهم: سقف محدودیت
// گیت‌هاب (۶۰ درخواست در ساعت) فقط برای «لیست commit ها»
// (api.github.com) است، نه برای خودِ محتوا (raw.githubusercontent.com)؛
// و لیست‌گرفتن فقط ۲ تا ۱۰ درخواست است، پس جای زیادی برای افزایش
// تراکم داریم بدون نزدیک‌شدن به آن سقف. مشکل واقعیِ قبلی («کندی»)
// حجم درخواست‌های راو (تا ۴۰۰۰ تا) بود، نه لیست commit ها. پس الان
// صفحات را زیاد کردیم (تراکم بیشتر) ولی نمونه‌برداری را برداشتیم (چون
// دیگر لازم نیست) — نتیجه تقریباً ۱۰۰۰ درخواست raw، که هم چگالی خوبی
// می‌دهد هم چهار برابر سبک‌تر از نسخه‌ی اصلی (۴۰۰۰) است.
const BACKFILL_PAGES = 5;
const BACKFILL_SAMPLE_EVERY = 1; // بدون نمونه‌برداری — همه‌ی commit های گرفته‌شده واقعاً خوانده می‌شوند
const BACKFILL_CONCURRENCY = 6;

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

// فیلتر نقاط پرت — نسخه‌ی اصلاح‌شده (v2)
// ------------------------------------------------------------
// نسخه‌ی قبلی «میانه‌ی محلی» بود: هر نقطه‌ای که بیش از ۵٪ با میانه‌ی
// ~۱۵ نقطه‌ی اطرافش فرق داشت، کلاً حذف می‌شد. مشکل بزرگ این روش: در
// یک روند واقعی و پیوسته (مثل رالی چند-روزه‌ی طلا که این روزها حتی
// >۳٪ در یک روز معمول است)، میانه‌ی پنجره همیشه یک قدم از قیمت واقعی
// عقب می‌افتد، پس نقاط کاملاً واقعیِ وسط یک صعود/نزول به اشتباه «پرت»
// حساب و حذف می‌شدند — نتیجه‌اش نموداری پله‌ای و بی‌منطق بود، دقیقاً
// همان چیزی که «نمودار انس طلا منطقی نیست» توصیفش می‌کند.
//
// روش درست: یک نقطه را فقط وقتی «پرت واقعی» بدانیم که تک‌افتاده باشد —
// یعنی همسایه‌ی قبلی و بعدی‌اش (از نظر زمانی) به هم نزدیک باشند ولی
// خودش از هر دو خیلی فاصله داشته باشد (یعنی خودِ همان یک نقطه گیج‌کننده
// است، نه این‌که بقیه‌ی دنیا از او عقب افتاده). این‌طور یک رالی واقعی
// (که همسایه‌ها هم با هم حرکت می‌کنند) هرگز پاک نمی‌شود؛ فقط یک عدد
// خراب و تک (مثلاً یک صفر اضافه یا یک خطای لحظه‌ای منبع) حذف می‌شود.
function filterLocalOutliers(points) {
  if (points.length < 3) return points;
  const SPIKE_THRESHOLD = 0.06; // فاصله‌ی نقطه از همسایه‌ها
  const NEIGHBOR_AGREEMENT = 0.02; // همسایه‌ها چقدر باید به هم نزدیک باشند تا «قابل اعتماد» حساب شوند
  return points.filter((p, i) => {
    if (i === 0 || i === points.length - 1) return true; // دو سر بازه دست‌نخورده می‌ماند
    const prev = points[i - 1].p, next = points[i + 1].p;
    if (!(prev > 0) || !(next > 0) || !(p.p > 0)) return true;
    const neighborsAgree = Math.abs(prev - next) / next <= NEIGHBOR_AGREEMENT;
    if (!neighborsAgree) return true; // همسایه‌ها خودشان در حال حرکت‌اند (رالی واقعی) — دست نزن
    const avgNeighbor = (prev + next) / 2;
    return Math.abs(p.p - avgNeighbor) / avgNeighbor <= SPIKE_THRESHOLD;
  });
}

// جمع‌کردن ردیف‌های «تکراریِ پشت‌سرهم» — چیزی که در اسکرین‌شات‌ها به شکل
// یک خط کاملاً تخت و یک‌دست برای بیش از یک روز دیده می‌شد. علتش این
// است: منبع (Navasan-API روی گیت‌هاب) گاهی وقتی اسکرِیپ برایش شکست
// می‌خورد یا سایت اصلی navasan.net به‌روز نمی‌شود، همان عدد قبلی را
// دوباره commit می‌کند — یعنی چند ده commit پشت‌سرهم دقیقاً همان قیمت
// را دارند. نگه‌داشتن همه‌ی این‌ها باعث می‌شود یک بازه‌ی «بدون داده‌ی
// واقعی جدید» شبیه یک خط زنده و پرتراکم دیده شود، که گمراه‌کننده است.
// این تابع از هر ردیفِ عدد یکسان و پشت‌سرهم، فقط نقطه‌ی اول و آخر را
// نگه می‌دارد (کافی برای این‌که خط راست بین‌شان دقیقاً همان تخت‌بودن
// واقعی را نشان بدهد) و بقیه را کنار می‌گذارد.
function collapseStaleRuns(points) {
  if (points.length < 3) return points;
  const out = [];
  let i = 0;
  while (i < points.length) {
    let j = i;
    while (j + 1 < points.length && points[j + 1].p === points[i].p) j++;
    out.push(points[i]);
    if (j > i) out.push(points[j]); // اول و آخر همان مقدار تکراری — نه همه‌ی نقاط وسط
    i = j + 1;
  }
  return out;
}


async function fetchCommitList(baseUrl, pages) {
  const pageNums = Array.from({ length: pages }, (_, i) => i + 1);
  const results = await Promise.all(pageNums.map((n) => fetchJson(baseUrl + "&page=" + n)));
  return results.filter(Array.isArray).flat();
}

async function backfillAllNavasanHistory(onProgress) {
  if (localStorage.getItem(FULL_BACKFILL_FLAG)) return false;
  const lastAttempt = Number(localStorage.getItem(BACKFILL_COOLDOWN_FLAG) || 0);
  if (Date.now() - lastAttempt < BACKFILL_COOLDOWN_MS) return false;
  localStorage.setItem(BACKFILL_COOLDOWN_FLAG, String(Date.now()));
  try {
    const [goldCommitsRaw, fiatCommitsRaw] = await Promise.all([
      fetchCommitList(GOLD_COMMITS_API, BACKFILL_PAGES),
      fetchCommitList(FIAT_COMMITS_API, BACKFILL_PAGES),
    ]);
    // نمونه‌برداری: از هر چند commit فقط یکی را واقعاً می‌خوانیم
    const goldCommits = goldCommitsRaw.filter((_, i) => i % BACKFILL_SAMPLE_EVERY === 0);
    const fiatCommits = fiatCommitsRaw.filter((_, i) => i % BACKFILL_SAMPLE_EVERY === 0);
    if (!goldCommits.length && !fiatCommits.length) return false;

    const goldTasks = goldCommits.map((c) => async () => {
      const date = c.commit && c.commit.committer ? new Date(c.commit.committer.date).getTime() : null;
      if (!date) return null;
      const raw = await fetchJson(`https://raw.githubusercontent.com/HosseinOdd/Navasan-API/${c.sha}/data/gold.json`);
      if (!raw) return null;
      return { t: date, raw };
    });
    const fiatTasks = fiatCommits.map((c) => async () => {
      const date = c.commit && c.commit.committer ? new Date(c.commit.committer.date).getTime() : null;
      if (!date) return null;
      const raw = await fetchJson(`https://raw.githubusercontent.com/HosseinOdd/Navasan-API/${c.sha}/data/fiat.json`);
      if (!raw) return null;
      return { t: date, raw };
    });

    const [goldResults, fiatResults] = await Promise.all([
      runWithLimit(goldTasks, BACKFILL_CONCURRENCY).then((r) => r.filter(Boolean)),
      runWithLimit(fiatTasks, BACKFILL_CONCURRENCY).then((r) => r.filter(Boolean)),
    ]);

    // یک سری زمانی جدا برای هر آیتم طلا/سکه بساز (از همان مجموعه fetch ها)
    const goldSeries = {};
    Object.values(GOLD_KEY_MAP).forEach((meta) => { goldSeries[meta.id] = []; });
    goldResults.forEach(({ t, raw }) => {
      Object.entries(GOLD_KEY_MAP).forEach(([srcKey, meta]) => {
        const row = raw[srcKey];
        if (row && typeof row.value === "number" && row.value > 0) goldSeries[meta.id].push({ t, p: row.value });
      });
    });
    // مشتق‌ها (۲۴ و ۲۱ عیار و مثقال) از تاریخچه‌ی واقعیِ ۱۸ عیار
    const g18series = (goldSeries["gold-18"] || []).slice().sort((a, b) => a.t - b.t);
    goldSeries["gold-24"] = g18series.map((pt) => ({ t: pt.t, p: pt.p / 0.75 }));
    goldSeries["gold-21"] = g18series.map((pt) => ({ t: pt.t, p: pt.p * (21 / 18) }));
    goldSeries["gold-mesghal"] = g18series.map((pt) => ({ t: pt.t, p: pt.p * 4.6083 }));
    // انس جهانی طلا (usd_xau) جداگانه است، چون در GOLD_KEY_MAP نیست
    goldSeries["gold-ounce"] = [];
    goldResults.forEach(({ t, raw }) => {
      const row = raw["usd_xau"];
      if (row && row.value !== undefined && Number(row.value) > 0) {
        goldSeries["gold-ounce"].push({ t, p: Number(row.value) });
      }
    });

    let totalPoints = 0;
    Object.entries(goldSeries).forEach(([id, points]) => {
      const cleaned = filterLocalOutliers(collapseStaleRuns(points.sort((a, b) => a.t - b.t)));
      cleaned.forEach((pt) => pushHistory(id, pt.p, pt.t));
      totalPoints += cleaned.length;
    });

    // همین کار برای همه‌ی ارزها (از همان fetch های fiat.json)
    const fiatSeries = {};
    Object.keys(CURRENCY_NAMES).forEach((k) => { fiatSeries[k] = []; });
    fiatResults.forEach(({ t, raw }) => {
      Object.keys(CURRENCY_NAMES).forEach((key) => {
        const row = raw[key];
        if (row && typeof row.value === "number" && row.value > 0) fiatSeries[key].push({ t, p: row.value });
      });
    });
    Object.entries(fiatSeries).forEach(([id, points]) => {
      const cleaned = filterLocalOutliers(collapseStaleRuns(points.sort((a, b) => a.t - b.t)));
      cleaned.forEach((pt) => pushHistory(id, pt.p, pt.t));
      totalPoints += cleaned.length;
    });

    localStorage.setItem(FULL_BACKFILL_FLAG, "1");
    if (onProgress) onProgress(totalPoints);
    return totalPoints > 0;
  } catch (e) {
    console.error("[چی چند] بک‌فیل تاریخچه‌ی طلا/سکه/ارز ناموفق بود:", e);
    return false;
  }
}

/* ==================== تاریخچه‌ی واقعی رمزارز: مستقیم از CoinGecko ====================
   برخلاف طلا/سکه/ارز، اینجا نیازی به ترفند گیت‌هاب نیست — خودِ CoinGecko
   یک endpoint رایگان و مستند برای تاریخچه‌ی هر کوین دارد که تا یک سال
   قیمت واقعی می‌دهد. */
function cryptoBackfillFlag(cgId) {
  return "nerkh_crypto_backfill_" + cgId + "_v1";
}

async function backfillCryptoHistory(id) {
  const cgId = id.replace(/^crypto-/, "");
  const flag = cryptoBackfillFlag(cgId);
  if (localStorage.getItem(flag)) return false;
  try {
    const raw = await fetchJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}/market_chart?vs_currency=usd&days=7`);
    if (!raw || !Array.isArray(raw.prices)) return false;
    const points = raw.prices
      .map(([t, p]) => ({ t: Math.round(t), p: Number(p) }))
      .filter((pt) => pt.p > 0);
    points.forEach((pt) => pushHistory(id, pt.p, pt.t));
    localStorage.setItem(flag, "1");
    return points.length > 0;
  } catch (e) {
    console.error("[چی چند] بک‌فیل تاریخچه‌ی رمزارز ناموفق بود:", e);
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

let _refreshCycle = 0;

async function refreshAllPrices(force) {
  let handled = false;
  if (isSupabaseConfigured()) {
    // حالت Supabase: هم طلا/ارز و هم رمزارز (از نوبیتکس) از یک منبع
    // می‌آیند و محدودیت CoinGecko اصلاً اینجا معنا ندارد؛ هر چرخه تازه می‌شود.
    const rows = await fetchSupabaseLatest();
    if (applySupabaseRows(rows)) handled = true;
  }
  if (!handled) {
    const shouldFetchCrypto = force || _refreshCycle % CONFIG.CRYPTO_REFRESH_EVERY_N_CYCLES === 0;
    _refreshCycle++;
    const navPromise = fetchNavasan();
    const cryptoPromise = shouldFetchCrypto ? fetchCoinGeckoMarkets() : Promise.resolve(null);
    const [nav, crypto] = await Promise.all([navPromise, cryptoPromise]);
    applyNavasan(nav);
    if (crypto) applyCoinGeckoMarkets(crypto);
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
  refreshAllPrices(true); // بار اول همیشه رمزارز را هم می‌گیریم
  setInterval(refreshAllPrices, CONFIG.REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshAllPrices();
  });
}

function formatPrice(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 0 });
}
