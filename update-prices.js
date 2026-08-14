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

// نگاشت مستقیم و تأییدشده به کلیدهای دقیق داخل gold.json (مقادیر «ریال»اند)
const GOLD_KEY_MAP = {
  "gold-18": { cat: "gold", name: "طلای ۱۸ عیار (هر گرم)", unit: "تومان", key: "18ayar" },
  "gold-molten": { cat: "gold", name: "طلای آب‌شده (نقدی)", unit: "تومان", key: "abshodeh" },
  "coin-emami": { cat: "coin", name: "سکه امامی", unit: "تومان", key: "sekkeh" },
  "coin-azadi": { cat: "coin", name: "سکه بهار آزادی", unit: "تومان", key: "bahar" },
  "coin-half": { cat: "coin", name: "نیم‌سکه", unit: "تومان", key: "nim" },
  "coin-quarter": { cat: "coin", name: "ربع‌سکه", unit: "تومان", key: "rob" },
  "coin-gerami": { cat: "coin", name: "سکه گرمی", unit: "تومان", key: "gerami" },
};
const CURRENCY_IDS = {
  usd: "دلار آمریکا", eur: "یورو", gbp: "پوند انگلیس", chf: "فرانک سوئیس",
  aed: "درهم امارات", try: "لیر ترکیه", sar: "ریال عربستان", cny: "یوان چین",
  jpy: "ین ژاپن", rub: "روبل روسیه", cad: "دلار کانادا", aud: "دلار استرالیا",
};

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
  return res.json();
}

/* طلا/سکه/ارز: از آینه‌ی رایگان و تأییدشده‌ی Navasan روی گیت‌هاب */
async function getNavasanRows() {
  const [gold, fiat] = await Promise.all([fetchJson(GOLD_URL), fetchJson(FIAT_URL)]);
  const rows = [];
  const nowIso = new Date().toISOString();

  let gold18Price = null, gold18Chg = null;
  Object.entries(GOLD_KEY_MAP).forEach(([id, meta]) => {
    const row = gold[meta.key];
    if (!row || typeof row.value !== "number") return;
    const price = row.value / 10; // ریال → تومان
    const changePct = row.change_pct != null ? Number(row.change_pct) : null;
    if (id === "gold-18") { gold18Price = price; gold18Chg = changePct; }
    rows.push({ item_id: id, category: meta.cat, name: meta.name, unit: meta.unit, price, change_percent: changePct, updated_at: nowIso });
  });
  if (gold18Price) {
    rows.push({ item_id: "gold-24", category: "gold", name: "طلای ۲۴ عیار (هر گرم)", unit: "تومان", price: gold18Price / 0.75, change_percent: gold18Chg, updated_at: nowIso });
    rows.push({ item_id: "gold-21", category: "gold", name: "طلای ۲۱ عیار (هر گرم)", unit: "تومان", price: gold18Price * (21 / 18), change_percent: gold18Chg, updated_at: nowIso });
    rows.push({ item_id: "gold-mesghal", category: "gold", name: "هر مثقال طلا", unit: "تومان", price: gold18Price * 4.6083, change_percent: gold18Chg, updated_at: nowIso });
  }
  const xau = gold["usd_xau"];
  if (xau && xau.value !== undefined) {
    rows.push({ item_id: "gold-ounce", category: "gold", name: "انس جهانی طلا", unit: "دلار", price: Number(xau.value), change_percent: xau.change_pct != null ? Number(xau.change_pct) : null, updated_at: nowIso });
  }
  Object.entries(CURRENCY_IDS).forEach(([id, name]) => {
    const row = fiat[id];
    if (!row || typeof row.value !== "number") return;
    rows.push({ item_id: id, category: "currency", name, unit: "تومان", price: row.value / 10, change_percent: row.change_pct != null ? Number(row.change_pct) : null, updated_at: nowIso });
  });
  return rows;
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
