/**
 * items.js — دیتای مرجع کل سایت
 * -------------------------------------------------------------
 * هر آیتم اینجا هم برای «رندر کارت‌ها»، هم برای «موتور جستجوی داخلی»
 * و هم برای «صفحه مبدل واحد» استفاده می‌شود.
 *
 * منبع طلا/سکه/ارز: آینه‌ی رایگان و تأییدشده‌ی Navasan (یا Supabase، اگر
 * وصل کرده باشید) — نگاه کنید به data.js. نقره از این لیست حذف شده چون
 * هیچ منبع رایگان و قابل‌اعتمادی برایش پیدا نشد.
 *
 * رمزارزها هم اینجا تعریف نمی‌شوند: به‌صورت پویا هنگام دریافت داده (از
 * Supabase یا مستقیم از نوبیتکس) در حافظه اضافه می‌شوند.
 */

const SITE_ITEMS = [
  // ---------------- طلا ----------------
  { id: "gold-18", cat: "gold", name: "طلای ۱۸ عیار (هر گرم)", unit: "تومان" },
  { id: "gold-24", cat: "gold", name: "طلای ۲۴ عیار (هر گرم)", unit: "تومان" },
  { id: "gold-21", cat: "gold", name: "طلای ۲۱ عیار (هر گرم)", unit: "تومان" },
  { id: "gold-mesghal", cat: "gold", name: "هر مثقال طلا", unit: "تومان" },
  { id: "gold-molten", cat: "gold", name: "طلای آب‌شده (نقدی)", unit: "تومان" },
  { id: "gold-ounce", cat: "gold", name: "انس جهانی طلا", unit: "دلار" },

  // ---------------- سکه ----------------
  { id: "coin-emami", cat: "coin", name: "سکه امامی", unit: "تومان" },
  { id: "coin-azadi", cat: "coin", name: "سکه بهار آزادی", unit: "تومان" },
  { id: "coin-half", cat: "coin", name: "نیم‌سکه", unit: "تومان" },
  { id: "coin-quarter", cat: "coin", name: "ربع‌سکه", unit: "تومان" },
  { id: "coin-gerami", cat: "coin", name: "سکه گرمی", unit: "تومان" },

  // ---------------- ارز ----------------
  { id: "usd", cat: "currency", name: "دلار آمریکا", unit: "تومان" },
  { id: "eur", cat: "currency", name: "یورو", unit: "تومان" },
  { id: "gbp", cat: "currency", name: "پوند انگلیس", unit: "تومان" },
  { id: "chf", cat: "currency", name: "فرانک سوئیس", unit: "تومان" },
  { id: "aed", cat: "currency", name: "درهم امارات", unit: "تومان" },
  { id: "try", cat: "currency", name: "لیر ترکیه", unit: "تومان" },
  { id: "sar", cat: "currency", name: "ریال عربستان", unit: "تومان" },
  { id: "cny", cat: "currency", name: "یوان چین", unit: "تومان" },
  { id: "jpy", cat: "currency", name: "ین ژاپن", unit: "تومان" },
  { id: "rub", cat: "currency", name: "روبل روسیه", unit: "تومان" },
  { id: "cad", cat: "currency", name: "دلار کانادا", unit: "تومان" },
  { id: "aud", cat: "currency", name: "دلار استرالیا", unit: "تومان" },

  // ---------------- رمزارز (نوبیتکس یا Supabase) ----------------
  // رمزارزها دیگر اینجا تعریف نمی‌شوند — به‌صورت پویا هنگام دریافت داده
  // (از Supabase یا مستقیم از نوبیتکس) در همین‌جا (در حافظه) اضافه
  // می‌شوند؛ کد مربوطه در data.js، توابع applyNobitexCrypto() و
  // applySupabaseRows() است.

];

const SITE_CATEGORIES = [
  { id: "gold",         title: "طلا",                  page: "gold.html",         icon: "gold" },
  { id: "coin",         title: "سکه",                  page: "coin.html",         icon: "coin" },
  { id: "currency",     title: "ارز",                  page: "currency.html",     icon: "currency" },
  { id: "crypto",       title: "ارز دیجیتال",          page: "crypto.html",       icon: "crypto" },
];

/**
 * چطور یک دسته‌ی جدید اضافه کنم؟ (فلزات صنعتی، سنگ قیمتی، خودرو، کلکسیونی و…)
 * راهنمای کامل و گام‌به‌گام در README.md، بخش «اضافه‌کردن یک دسته‌ی جدید» هست.
 */
