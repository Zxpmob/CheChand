/**
 * sw.js — کش‌کردن پوسته‌ی ثابت سایت (HTML/CSS/JS/آیکن‌ها) برای باز شدن
 * سریع‌تر در بازدیدهای بعدی و برای اینکه از صفحه‌ی اصلی (Add to Home
 * Screen) هم بشود سریع باز شد. **قیمت‌ها هرگز کش نمی‌شوند** — همه‌ی
 * درخواست‌های زنده (Navasan، CoinGecko، Supabase، گیت‌هاب) همیشه از
 * شبکه گرفته می‌شوند تا قیمت همیشه واقعی و به‌روز بماند.
 */

const CACHE_NAME = "chichand-shell-v7"; // نسخه دوباره عوض شد — فیکس تراکم/پرش‌های نمودار

const SHELL_FILES = [
  "index.html", "gold.html", "coin.html", "currency.html", "crypto.html",
  "all-prices.html", "movers.html", "converter.html", "favorites.html",
  "alerts.html", "search.html", "item-chart.html",
  "style.css",
  "items.js", "data.js", "render.js", "components.js", "favorites.js",
  "alerts.js", "converter.js", "theme.js", "gold-history-usd.js",
  "manifest.json",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png", "bg-marble.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isShellRequest(url) {
  // فقط فایل‌های خودِ سایت (هم‌دامنه) کش می‌شوند؛ هرچیزی که به یک دامنه‌ی
  // دیگر برود (Navasan، CoinGecko، Supabase، گیت‌هاب، فونت‌ها) دست‌نخورده
  // مستقیم به شبکه می‌رود — چون آن‌ها قیمت زنده یا داده‌ی متغیرند.
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isShellRequest(url)) return; // بگذار مستقیم برود شبکه

  // Stale-while-revalidate: نسخه‌ی کش‌شده را فوری نشان بده، همزمان یک
  // نسخه‌ی تازه هم از شبکه بگیر و کش را برای دفعه‌ی بعد به‌روز کن.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
