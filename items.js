/**
 * items.js — دیتای مرجع کل سایت
 * -------------------------------------------------------------
 * هر آیتم اینجا هم برای «رندر کارت‌ها»، هم برای «موتور جستجوی داخلی»
 * و هم برای «صفحه مبدل واحد» استفاده می‌شود.
 *
 * source هر آیتم مشخص می‌کند دیتای زنده‌اش از کجا می‌آید:
 *   "brsapi" → از وب‌سرویس رایگان BrsApi.ir (طلا / نقره / سکه / ارز)
 *
 * رمزارزها دیگر اینجا تعریف نمی‌شوند: ۱۰۰ رمزارز برتر بازار به‌صورت
 * پویا از CoinGecko گرفته می‌شود (نگاه کنید به data.js).
 *
 * برای هر آیتمِ برگرفته از BrsApi، فیلد match آرایه‌ای از کلیدواژه‌هاست که
 * data.js با نام فارسی/انگلیسیِ برگردانده‌شده از API مقایسه می‌کند تا آیتم
 * درست را پیدا کند (چون خروجی دقیق API ممکن است کمی متفاوت باشد).
 */

const SITE_ITEMS = [
  // ---------------- طلا ----------------
  { id: "gold-18", cat: "gold", name: "طلای ۱۸ عیار (هر گرم)", unit: "تومان", source: "brsapi", match: ["طلای 18", "طلا 18", "18 عیار", "IR_GOLD_18K", "geram18"] },
  { id: "gold-24", cat: "gold", name: "طلای ۲۴ عیار (هر گرم)", unit: "تومان", source: "brsapi", match: ["طلای 24", "طلا 24", "24 عیار", "IR_GOLD_24K", "gold24"] },
  { id: "gold-21", cat: "gold", name: "طلای ۲۱ عیار (هر گرم)", unit: "تومان", source: "brsapi", match: ["طلای 21", "طلا 21", "21 عیار", "gold21"] },
  { id: "gold-mesghal", cat: "gold", name: "هر مثقال طلا", unit: "تومان", source: "brsapi", match: ["مثقال", "mesghal"] },
  { id: "gold-molten", cat: "gold", name: "طلای آب‌شده (نقدی)", unit: "تومان", source: "brsapi", match: ["آب شده", "abshode", "melted"] },
  { id: "gold-ounce", cat: "gold", name: "انس جهانی طلا", unit: "دلار", source: "brsapi", match: ["انس", "ounce", "XAUUSD", "طلای جهانی"] },

  // ---------------- نقره ----------------
  { id: "silver-925", cat: "silver", name: "نقره ۹۲۵ (هر گرم)", unit: "تومان", source: "brsapi", match: ["نقره 925", "silver925"] },
  { id: "silver-999", cat: "silver", name: "نقره ۹۹۹ (هر گرم)", unit: "تومان", source: "brsapi", match: ["نقره 999", "silver999", "silver_gram"] },
  { id: "silver-kg", cat: "silver", name: "نقره (هر کیلو)", unit: "تومان", source: "brsapi", match: ["نقره کیلو", "silver_kg"] },
  { id: "silver-ounce", cat: "silver", name: "انس جهانی نقره", unit: "دلار", source: "brsapi", match: ["انس نقره", "XAGUSD"] },

  // ---------------- سکه ----------------
  { id: "coin-emami", cat: "coin", name: "سکه امامی", unit: "تومان", source: "brsapi", match: ["امامی", "emami", "IR_COIN_EMAMI"] },
  { id: "coin-azadi", cat: "coin", name: "سکه بهار آزادی", unit: "تومان", source: "brsapi", match: ["بهار آزادی", "azadi1"] },
  { id: "coin-half", cat: "coin", name: "نیم‌سکه", unit: "تومان", source: "brsapi", match: ["نیم سکه", "half"] },
  { id: "coin-quarter", cat: "coin", name: "ربع‌سکه", unit: "تومان", source: "brsapi", match: ["ربع سکه", "quarter"] },
  { id: "coin-gerami", cat: "coin", name: "سکه گرمی", unit: "تومان", source: "brsapi", match: ["سکه گرمی", "gerami"] },

  // ---------------- ارز ----------------
  { id: "usd", cat: "currency", name: "دلار آمریکا", unit: "تومان", source: "brsapi", match: ["دلار", "USD", "دلار آمریکا"] },
  { id: "eur", cat: "currency", name: "یورو", unit: "تومان", source: "brsapi", match: ["یورو", "EUR"] },
  { id: "gbp", cat: "currency", name: "پوند انگلیس", unit: "تومان", source: "brsapi", match: ["پوند", "GBP"] },
  { id: "chf", cat: "currency", name: "فرانک سوئیس", unit: "تومان", source: "brsapi", match: ["فرانک", "CHF"] },
  { id: "aed", cat: "currency", name: "درهم امارات", unit: "تومان", source: "brsapi", match: ["درهم", "AED"] },
  { id: "try", cat: "currency", name: "لیر ترکیه", unit: "تومان", source: "brsapi", match: ["لیر", "TRY"] },
  { id: "sar", cat: "currency", name: "ریال عربستان", unit: "تومان", source: "brsapi", match: ["ریال عربستان", "SAR"] },
  { id: "cny", cat: "currency", name: "یوان چین", unit: "تومان", source: "brsapi", match: ["یوان", "CNY"] },
  { id: "jpy", cat: "currency", name: "ین ژاپن", unit: "تومان", source: "brsapi", match: ["ین ژاپن", "JPY"] },
  { id: "rub", cat: "currency", name: "روبل روسیه", unit: "تومان", source: "brsapi", match: ["روبل", "RUB"] },
  { id: "cad", cat: "currency", name: "دلار کانادا", unit: "تومان", source: "brsapi", match: ["دلار کانادا", "CAD"] },
  { id: "aud", cat: "currency", name: "دلار استرالیا", unit: "تومان", source: "brsapi", match: ["دلار استرالیا", "AUD"] },

  // ---------------- رمزارز (CoinGecko) ----------------
  // رمزارزها دیگر اینجا تعریف نمی‌شوند — ۱۰۰ رمزارز برتر بازار به‌صورت
  // خودکار و زنده از CoinGecko گرفته و در همین‌جا (در حافظه) اضافه
  // می‌شوند؛ کد مربوطه در data.js، تابع applyCoinGeckoMarkets() است.

];

const SITE_CATEGORIES = [
  { id: "gold",         title: "طلا",                  page: "gold.html",         icon: "gold" },
  { id: "silver",       title: "نقره",                 page: "silver.html",       icon: "silver" },
  { id: "coin",         title: "سکه",                  page: "coin.html",         icon: "coin" },
  { id: "currency",     title: "ارز",                  page: "currency.html",     icon: "currency" },
  { id: "crypto",       title: "ارز دیجیتال",          page: "crypto.html",       icon: "crypto" },
];

/**
 * چطور یک دسته‌ی جدید اضافه کنم؟ (فلزات صنعتی، سنگ قیمتی، خودرو، کلکسیونی و…)
 * راهنمای کامل و گام‌به‌گام در README.md، بخش «اضافه‌کردن یک دسته‌ی جدید» هست.
 */
