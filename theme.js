/**
 * theme.js — تم طلایی/تیره یا طلایی/روشن بسته به تنظیم دستگاه، با امکان
 * تعویض دستی از دکمه‌ی هدر (حالت‌ها: خودکار → تیره → روشن → خودکار …)
 * این اسکریپت باید هرچه زودتر (قبل از رندر) اجرا شود تا فلش رنگی نداشته باشیم؛
 * برای همین در <head> هر صفحه با defer نه، بلکه به‌صورت مستقیم صدا زده می‌شود.
 */
(function () {
  const KEY = "nerkh_theme"; // "auto" | "dark" | "light"
  function apply(mode) {
    if (mode === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
  }
  const saved = localStorage.getItem(KEY) || "auto";
  apply(saved);

  window.__themeGetMode = () => localStorage.getItem(KEY) || "auto";
  window.__themeCycle = () => {
    const order = ["auto", "dark", "light"];
    const cur = window.__themeGetMode();
    const next = order[(order.indexOf(cur) + 1) % order.length];
    localStorage.setItem(KEY, next);
    apply(next);
    return next;
  };
})();
