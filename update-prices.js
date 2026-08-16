/**
 * update-prices.js — این فایل روی مرورگر کاربر اجرا نمی‌شود؛ فقط داخل
 * GitHub Actions (روی سرورهای گیت‌هاب، بدون فیلترینگ) اجرا می‌شود، هر
 * ۱۵ دقیقه، و آخرین قیمت‌های واقعی را در Supabase ذخیره می‌کند.
 *
 * چرا این‌طوری؟ چون مرورگر کاربرانی که داخل ایران هستند معمولاً به
 * بعضی سایت‌های خارجی مستقیم دسترسی ندارند. سرورهای گیت‌هاب این
 * محدودیت را ندارند، پس اینجا قیمت‌ها را می‌گیریم و توی Supabase
 * می‌گذاریم؛ سایت فقط با Supabase صحبت می‌کند.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const GOLD_URL = "https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/gold.json";
const FIAT_URL = "https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/fiat.json";

// نگاشت مستقیم و تأییدشده به کلیدهای دقیق داخل gold.json (مقادیر «تومان»اند)
const GOLD_KEY_MAP = {
  "gold-18": { cat: "gold", name: "طلای ۱۸ عیار (هر گرم)", unit: "تومان", key: "18ayar" },
  "gold-molten": { cat: "gold", name: "طلای آب‌شده (نقدی)", unit: "تومان", key: "abshodeh" },
  "coin-emami": { cat: "coin", name: "سکه امامی", unit: "تومان", key: "sekkeh" },
  "coin-azadi": { cat: "coin", name: "سکه بهار آزادی", unit: "تومان", key: "bahar" },
  "coin-half": { cat: "coin", name: "نیم‌سکه", unit: "تومان", key: "nim" },
  "coin-quarter": { cat: "coin", name: "ربع‌سکه", unit: "تومان", key: "rob" },
  "coin-gerami": { cat: "coin", name: "سکه گرمی", unit: "تومان", key: "gerami" },
  "coin-emami-bubble": { cat: "coin", name: "حباب سکه امامی", unit: "تومان", key: "bub_sekkeh" },
  "coin-azadi-bubble": { cat: "coin", name: "حباب سکه بهار آزادی", unit: "تومان", key: "bub_bahar" },
  "coin-half-bubble": { cat: "coin", name: "حباب نیم‌سکه", unit: "تومان", key: "bub_nim" },
  "coin-quarter-bubble": { cat: "coin", name: "حباب ربع‌سکه", unit: "تومان", key: "bub_rob" },
  "coin-gerami-bubble": { cat: "coin", name: "حباب سکه گرمی", unit: "تومان", key: "bub_gerami" },
};
// فقط همین کدها «ارز» حساب می‌شوند — لیست سفید عمدی (نه پذیرفتن هرچیزی
// که منبع بدهد)، تا هیچ کد رمزارزی که ممکن است منبع کنار ارزها بگذارد،
// تصادفی وارد دسته‌ی «ارز» نشود.
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
const CURRENCY_SKIP = new Set(["usd_sherkat", "usd_shakhs", "hav_cad_cheque"]);

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
  return res.json();
}

// درصد تغییرِ ۲۴ ساعته را دیگر از فیلدهای حدسیِ منبع نمی‌خوانیم (در عمل
// معلوم شد پیدا نمی‌شدند یا همیشه صفر برمی‌گشتند)؛ به‌جایش از تاریخچه‌ی
// واقعیِ خودمان در Supabase (جدول price_history) محاسبه‌اش می‌کنیم.
async function fetchPrice24hAgo(itemId) {
  const targetIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/price_history?item_id=eq.${encodeURIComponent(itemId)}&created_at=lte.${encodeURIComponent(targetIso)}&order=created_at.desc&limit=1&select=price,created_at`;
  try {
    const res = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    // اگر نزدیک‌ترین رکورد بیش از ۴ ساعت با ۲۴ ساعت پیش فاصله دارد، یعنی
    // هنوز تاریخچه‌ی کافی جمع نشده — به‌جای عدد نادرست، چیزی برنمی‌گردانیم
    const gapMs = Math.abs(new Date(targetIso).getTime() - new Date(rows[0].created_at).getTime());
    if (gapMs > 4 * 60 * 60 * 1000) return null;
    return Number(rows[0].price);
  } catch (e) {
    return null;
  }
}

async function computeChangePercent24h(itemId, currentPrice) {
  const oldPrice = await fetchPrice24hAgo(itemId);
  if (!oldPrice) return null;
  return ((currentPrice - oldPrice) / oldPrice) * 100;
}

/* طلا/سکه/ارز: از آینه‌ی رایگان و تأییدشده‌ی Navasan روی گیت‌هاب */
async function getNavasanRows() {
  const [gold, fiat] = await Promise.all([fetchJson(GOLD_URL), fetchJson(FIAT_URL)]);
  const nowIso = new Date().toISOString();

  // مرحله‌ی ۱: قیمت‌های فعلی را جمع می‌کنیم (بدون درصد تغییر هنوز)
  const items = []; // {item_id, category, name, unit, price}
  Object.entries(GOLD_KEY_MAP).forEach(([id, meta]) => {
    const row = gold[meta.key];
    if (!row || typeof row.value !== "number") return;
    items.push({ item_id: id, category: meta.cat, name: meta.name, unit: meta.unit, price: row.value });
  });
  const gold18 = items.find((i) => i.item_id === "gold-18");
  if (gold18) {
    items.push({ item_id: "gold-24", category: "gold", name: "طلای ۲۴ عیار (هر گرم)", unit: "تومان", price: gold18.price / 0.75 });
    items.push({ item_id: "gold-21", category: "gold", name: "طلای ۲۱ عیار (هر گرم)", unit: "تومان", price: gold18.price * (21 / 18) });
    items.push({ item_id: "gold-mesghal", category: "gold", name: "هر مثقال طلا", unit: "تومان", price: gold18.price * 4.6083 });
  }
  const xau = gold["usd_xau"];
  if (xau && xau.value !== undefined) {
    items.push({ item_id: "gold-ounce", category: "gold", name: "انس جهانی طلا", unit: "دلار", price: Number(xau.value) });
  }
  Object.entries(CURRENCY_NAMES).forEach(([id, name]) => {
    if (CURRENCY_SKIP.has(id)) return;
    const row = fiat[id];
    if (!row || typeof row.value !== "number") return;
    items.push({ item_id: id, category: "currency", name, unit: "تومان", price: row.value });
  });

  // مرحله‌ی ۲: برای هرکدام، درصد تغییر واقعیِ ۲۴ساعته را از تاریخچه‌ی
  // خودمان در Supabase می‌خوانیم (موازی، تا سریع باشد)
  const changes = await Promise.all(items.map((it) => computeChangePercent24h(it.item_id, it.price)));

  return items.map((it, idx) => ({ ...it, change_percent: changes[idx], updated_at: nowIso }));
}

/* رمزارز: از نوبیتکس (صرافی ایرانی، داخل ایران فیلتر نیست) — همه‌ی
   جفت‌ارزهای به‌تتر گرفته می‌شود، یعنی عملاً همه‌ی رمزارزهای فعال آنجا */
async function getNobitexRows() {
  const raw = await fetchJson("https://api.nobitex.ir/market/stats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const rows = [];
  if (raw && raw.stats) {
    for (const [pair, s] of Object.entries(raw.stats)) {
      if (!pair.endsWith("-usdt")) continue;
      if (s.isClosed) continue;
      const symbol = pair.replace("-usdt", "").toUpperCase();
      const price = Number(s.latest || s.bestSell || s.bestBuy);
      if (!price) continue;
      const dayOpen = Number(s.dayOpen) || null;
      const changePct = s.dayChange !== undefined && s.dayChange !== null
        ? Number(s.dayChange)
        : (dayOpen ? ((price - dayOpen) / dayOpen) * 100 : null);
      rows.push({
        item_id: "crypto-" + symbol.toLowerCase(),
        category: "crypto",
        name: symbol + "/USDT",
        unit: "دلار",
        price,
        change_percent: changePct,
        updated_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

async function upsertLatest(rows) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/latest_prices`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error("upsert latest_prices failed: " + res.status + " " + (await res.text()));
}

async function insertHistory(rows) {
  if (!rows.length) return;
  const historyRows = rows.map((r) => ({ item_id: r.item_id, price: r.price }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/price_history`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(historyRows),
  });
  if (!res.ok) throw new Error("insert price_history failed: " + res.status + " " + (await res.text()));
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY تنظیم نشده — این‌ها را در GitHub: Settings → Secrets and variables → Actions بگذارید.");
  }
  let rows = [];
  try {
    const nav = await getNavasanRows();
    console.log("Navasan:", nav.length, "ردیف");
    rows = rows.concat(nav);
  } catch (e) { console.error("Navasan ناموفق:", e.message); }

  try {
    const nb = await getNobitexRows();
    console.log("Nobitex:", nb.length, "ردیف");
    rows = rows.concat(nb);
  } catch (e) { console.error("Nobitex ناموفق:", e.message); }

  if (!rows.length) throw new Error("هیچ قیمتی از هیچ منبعی دریافت نشد.");

  await upsertLatest(rows);
  await insertHistory(rows);
  console.log("انجام شد —", rows.length, "قیمت به‌روزرسانی شد.");
}

main().catch((e) => { console.error(e); process.exit(1); });
