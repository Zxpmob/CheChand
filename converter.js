/**
 * converter.js — منطق صفحه‌ی مبدل و محاسبه‌گرها
 */

const WEIGHT_TO_GRAM = { gram: 1, mesghal: 4.6083, soot: 0.2305, ounce: 31.1035, kilo: 1000 };
const WEIGHT_LABEL = { gram: "گرم", mesghal: "مثقال", soot: "سوت", ounce: "اونس (تروی)", kilo: "کیلوگرم" };

function convertWeight(value, from, to) {
  const grams = value * WEIGHT_TO_GRAM[from];
  return grams / WEIGHT_TO_GRAM[to];
}

/* محاسبه‌ی قیمت نهایی طلا: قیمت پایه (هر گرم) + اجرت٪ + سود فروشنده٪ + مالیات
   بر مجموع (اجرت+سود). فرمول رایج بازار طلای ایران. */
function calcGoldFinalPrice(basePricePerGram, weightGram, wagePercent, profitPercent, taxPercent) {
  const base = basePricePerGram * weightGram;
  const wage = base * (wagePercent / 100);
  const afterWage = base + wage;
  const profit = afterWage * (profitPercent / 100);
  const tax = (wage + profit) * (taxPercent / 100);
  const total = afterWage + profit + tax;
  return { base, wage, profit, tax, total };
}

/* حباب سکه = قیمت بازار سکه - ارزش ذاتی طلای داخل آن (بر مبنای طلای ۱۸ عیار
   و وزن استاندارد سکه‌ی امامی/بهار آزادی که ۸.۱۳۵ گرم است) */
const COIN_GOLD_WEIGHT_GRAM = 8.133; // وزن طلای خالص تقریبی سکه‌ی تمام بهار آزادی/امامی
function calcCoinBubble(coinMarketPrice, gold18PerGram) {
  const intrinsic = gold18PerGram * (COIN_GOLD_WEIGHT_GRAM / 0.75); // تبدیل عیار 18 به وزن معادل 24 عیار سکه? ساده‌سازی شده
  const bubble = coinMarketPrice - intrinsic;
  const bubblePercent = intrinsic ? (bubble / intrinsic) * 100 : 0;
  return { intrinsic, bubble, bubblePercent };
}

function calcCurrency(amount, ratePerUnit) {
  return amount * ratePerUnit;
}

/* ارزش دارایی من: جمع مقدار × قیمت لحظه‌ای برای هر ردیفی که کاربر وارد می‌کند */
const ASSET_KEY = "nerkh_assets_v1";
function getAssets() {
  try { return JSON.parse(localStorage.getItem(ASSET_KEY) || "[]"); } catch (e) { return []; }
}
function saveAssets(list) { localStorage.setItem(ASSET_KEY, JSON.stringify(list)); }
