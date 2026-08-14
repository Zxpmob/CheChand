/**
 * components.js — هدر، فوتر، تیکر قیمت زنده و جستجوی سراسری
 * در هر صفحه فقط کافی‌ست <div id="site-header"></div> و
 * <div id="site-footer"></div> بگذارید؛ این فایل باقی را پر می‌کند.
 */

const ICONS = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.2 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.3-.6z"/></svg>',
  starFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.2 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.3-.6z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
  cat: {
    gold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M3 8l9-4 9 4"/></svg>',
    silver: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>',
    coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></svg>',
    currency: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4h6a4 4 0 010 8H7zM7 12h7a4 4 0 010 8H7M5 8h6M5 16h6"/></svg>',
    crypto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6v12M15 6v12M6 9h9.5a3 3 0 010 6H6M6 9V6M6 15v3"/></svg>',
    metal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14l4-9 4 9M12 14l4-9 4 9M2 20h20"/></svg>',
    gem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M8.5 3L12 9l-2 12M15.5 3L12 9l2 12"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5"/><rect x="2" y="13" width="20" height="6" rx="2"/><circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>',
    collectible: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M8 4v14"/></svg>',
  },
};

function themeIcon() {
  const mode = window.__themeGetMode ? window.__themeGetMode() : "auto";
  if (mode === "dark") return ICONS.moon;
  if (mode === "light") return ICONS.sun;
  return ICONS.auto;
}

function renderHeader(activePage) {
  const el = document.getElementById("site-header");
  if (!el) return;
  const navLinks = [
    { href: "index.html", label: "داشبورد" },
    { href: "gold.html", label: "طلا" },
    { href: "currency.html", label: "ارز" },
    { href: "coin.html", label: "سکه" },
    { href: "crypto.html", label: "ارز دیجیتال" },
    { href: "all-prices.html", label: "همه قیمت‌ها" },
    { href: "movers.html", label: "پرتغییرترین‌ها" },
    { href: "converter.html", label: "مبدل و ماشین‌حساب" },
    { href: "favorites.html", label: "علاقه‌مندی‌ها" },
  ];

  el.innerHTML = `
    <div class="header-bar glass-strong">
      <a href="index.html" class="brand">
        <span class="brand-mark">چ</span>
        <span>چی چند</span>
      </a>
      <nav class="main-nav" id="main-nav">
        ${navLinks.map(l => `<a href="${l.href}" ${l.href === activePage ? 'aria-current="page"' : ''}>${l.label}</a>`).join("")}
      </nav>
      <div class="header-actions">
        <button class="icon-btn" id="nav-search-btn" title="جستجو" aria-label="جستجو">${ICONS.search}</button>
        <button class="icon-btn" id="theme-btn" title="تغییر پوسته" aria-label="تغییر پوسته">${themeIcon()}</button>
        <a class="icon-btn mobile-nav-toggle" id="mobile-menu-btn" title="منو" aria-label="منو">${ICONS.menu}</a>
      </div>
    </div>
    <div class="ticker-wrap glass" id="ticker-wrap" style="margin-top:10px;">
      <div class="ticker-track" id="ticker-track">
        <span class="ticker-item"><span class="t-name">در حال دریافت نرخ‌های لحظه‌ای…</span></span>
      </div>
    </div>
    <div id="mobile-nav-panel" class="glass-strong" style="display:none; margin-top:10px; padding:10px; border-radius:16px;"></div>
  `;

  document.getElementById("theme-btn").addEventListener("click", () => {
    window.__themeCycle();
    document.getElementById("theme-btn").innerHTML = themeIcon();
  });

  const mobileBtn = document.getElementById("mobile-menu-btn");
  const mobilePanel = document.getElementById("mobile-nav-panel");
  mobileBtn.addEventListener("click", () => {
    const open = mobilePanel.style.display !== "none";
    mobilePanel.style.display = open ? "none" : "block";
    if (!open) {
      mobilePanel.innerHTML = navLinks.map(l =>
        `<a href="${l.href}" style="display:block;padding:12px 8px;border-bottom:1px solid var(--glass-border);font-size:.9rem;">${l.label}</a>`
      ).join("");
    }
  });

  document.getElementById("nav-search-btn").addEventListener("click", () => {
    window.location.href = "search.html";
  });

  renderTicker();
  document.addEventListener("prices:updated", renderTicker);
  wireDiagnostics(el);
}

/* ------------- بنر عیب‌یابی: اگر بعد از ۱۲ ثانیه هیچ قیمتی نیامد،
   خطای واقعی را نشان می‌دهد تا بشود کپی و برای رفع مشکل فرستاد ------------- */
function wireDiagnostics(headerEl) {
  setTimeout(() => {
    const hasPrices = window.PriceStore && Object.keys(PriceStore.data).length > 0;
    if (hasPrices) return;
    const diag = window.NERKH_DIAG || { errors: [] };
    const box = document.createElement("div");
    box.className = "glass-strong";
    box.style.cssText = "margin-top:10px;padding:14px 16px;border-radius:16px;border-color:var(--danger);font-size:.8rem;line-height:1.9;";
    const errText = diag.errors.length
      ? diag.errors.slice(-6).map((e) => `• ${e.url}\n  ${e.message}`).join("\n")
      : "هیچ خطایی ثبت نشده (یعنی درخواست‌ها اصلاً پاسخ نگرفته‌اند — احتمالاً فیلترینگ یا اینترنت کند است).";
    box.innerHTML = `
      <b style="color:var(--danger);">قیمت‌ها دریافت نشد.</b>
      برای رفع مشکل، متن زیر را کپی کنید و برای پشتیبانی بفرستید:
      <pre style="white-space:pre-wrap;direction:ltr;text-align:left;background:rgba(0,0,0,.15);padding:10px;border-radius:10px;margin:8px 0 0;font-size:.72rem;user-select:all;">${errText}</pre>
    `;
    headerEl.appendChild(box);
  }, 14000);
}

function renderTicker() {
  const track = document.getElementById("ticker-track");
  if (!track) return;
  const withPrice = SITE_ITEMS.filter((it) => PriceStore.data[it.id]);
  if (!withPrice.length) return;
  const build = (it) => {
    const d = PriceStore.data[it.id];
    const chg = d.changePercent;
    const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "";
    const chgTxt = chg === null || chg === undefined ? "" : `<span class="t-chg ${chgClass}">${chg > 0 ? "▲" : chg < 0 ? "▼" : "•"} ${Math.abs(chg).toFixed(1)}%</span>`;
    return `<span class="ticker-item"><span class="t-name">${it.name}</span><span class="t-price">${formatPrice(d.price)}</span>${chgTxt}</span>`;
  };
  const items = withPrice.map(build).join("");
  track.innerHTML = items + items; // دو برابر برای اسکرول بی‌درز
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand" style="margin-bottom:10px;">
            <span class="brand-mark">چ</span><span>چی چند</span>
          </div>
          <p>نرخ لحظه‌ای طلا، سکه، ارز، رمزارز و کالاهای باارزش — با به‌روزرسانی خودکار و طراحی شیشه‌ای مدرن.</p>
        </div>
        <div>
          <h4>دسته‌بندی‌ها</h4>
          ${SITE_CATEGORIES.slice(0,5).map(c => `<a href="${c.page}">${c.title}</a>`).join("<br>")}
        </div>
        <div>
          <h4>ابزارها</h4>
          <a href="converter.html">مبدل واحد و محاسبه‌گر</a><br>
          <a href="all-prices.html">جدول همه قیمت‌ها</a><br>
          <a href="movers.html">بیشترین تغییرات</a><br>
          <a href="favorites.html">علاقه‌مندی‌ها</a><br>
          <a href="search.html">جستجو</a>
        </div>
        <div>
          <h4>درباره‌ی داده‌ها</h4>
          <p>قیمت طلا/سکه/ارز از یک منبع آزاد و آماده‌ی داده‌ی Navasan و قیمت رمزارز از CoinGecko دریافت می‌شود (یا از Supabase و نوبیتکس، اگر وصل شده باشد) و صرفاً جنبه‌ی اطلاع‌رسانی دارد.</p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="footer-year"></span> چی چند — تمام حقوق محفوظ است.</span>
        <span>ساخته‌شده با ♥ برای بازار ایران</span>
      </div>
    </div>
  `;
  document.getElementById("footer-year").textContent = new Intl.DateTimeFormat("fa-IR").format(new Date()).split("/")[0];
}

/* ---------------- جستجوی سراسری (پیشنهاد لحظه‌ای در هدر/صفحات) --------- */
function wireSearchInput(inputEl, suggestEl, onSubmitGo) {
  if (!inputEl || !suggestEl) return;
  function run(q) {
    q = norm(q);
    if (!q) { suggestEl.classList.remove("open"); suggestEl.innerHTML = ""; return; }
    const results = SITE_ITEMS.filter((it) => norm(it.name).includes(q)).slice(0, 8);
    if (!results.length) {
      suggestEl.innerHTML = `<div style="padding:14px;color:var(--text-2);font-size:.85rem;">نتیجه‌ای برای «${inputEl.value}» پیدا نشد.</div>`;
    } else {
      suggestEl.innerHTML = results.map((it) => {
        const cat = SITE_CATEGORIES.find((c) => c.id === it.cat);
        const price = PriceStore.data[it.id] ? formatPrice(PriceStore.data[it.id].price) + " " + it.unit : "—";
        return `<a href="item.html?id=${it.id}"><span>${it.name}</span><span class="s-cat">${cat ? cat.title : ""} · ${price}</span></a>`;
      }).join("");
    }
    suggestEl.classList.add("open");
  }
  inputEl.addEventListener("input", () => run(inputEl.value));
  inputEl.addEventListener("focus", () => { if (inputEl.value) run(inputEl.value); });
  document.addEventListener("click", (e) => {
    if (!suggestEl.contains(e.target) && e.target !== inputEl) suggestEl.classList.remove("open");
  });
  if (onSubmitGo) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); onSubmitGo(inputEl.value); }
    });
  }
}
