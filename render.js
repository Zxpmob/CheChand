/**
 * render.js — رندر بخش‌های تکرارشونده‌ی سایت روی دیتای زنده‌ی PriceStore
 */

function priceCardHTML(it) {
  const d = PriceStore.data[it.id];
  const price = d ? formatPrice(d.price) : `<span class="skeleton" style="display:inline-block;width:70px;"></span>`;
  const chg = d ? d.changePercent : null;
  const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "";
  let chgTxt;
  if (!d) {
    chgTxt = `<span class="pc-updated">${it.source === "manual" ? "مرجع دستی" : "در حال دریافت…"}</span>`;
  } else if (chg === null || chg === undefined || Number.isNaN(chg)) {
    chgTxt = `<span class="pc-updated">—</span>`;
  } else {
    chgTxt = `<span class="pc-chg ${chgClass}">${chg > 0 ? "▲" : chg < 0 ? "▼" : "•"} ${Math.abs(chg).toFixed(2)}٪</span>`;
  }
  const fav = isFavorite(it.id);
  return `
    <div class="price-card glass" data-id="${it.id}">
      <div class="pc-top">
        <span class="pc-name">${it.name}</span>
        <div class="pc-actions">
          <a class="chart-btn" href="item-chart.html?id=${encodeURIComponent(it.id)}" aria-label="مشاهده نمودار نوسانات ${it.name}" title="نمودار نوسانات امروز">${ICONS.chart}</a>
          <button class="fav-btn ${fav ? "active" : ""}" data-fav="${it.id}" aria-label="افزودن به علاقه‌مندی‌ها" onclick="handleFavClick('${it.id}', this)">${fav ? ICONS.starFill : ICONS.star}</button>
        </div>
      </div>
      <div class="pc-price">${price} <span class="pc-unit">${it.unit}</span></div>
      <div class="pc-bottom">${chgTxt}${d ? `<span class="pc-updated">${timeAgo(d.updated)}</span>` : ""}</div>
    </div>`;
}

function handleFavClick(id, btn) {
  const active = toggleFavorite(id);
  btn.classList.toggle("active", active);
  btn.innerHTML = active ? ICONS.starFill : ICONS.star;
}

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "چند ثانیه پیش";
  if (s < 3600) return Math.floor(s / 60) + " دقیقه پیش";
  return Math.floor(s / 3600) + " ساعت پیش";
}

/* ---------------- شبکه‌ی دسته‌بندی‌ها (داشبورد) ---------------- */
function renderCategoryGrid(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = SITE_CATEGORIES.map((c) => `
    <a class="cat-card glass" href="${c.page}">
      <span class="cic">${ICONS.cat[c.icon] || ""}</span>
      <h3>${c.title}</h3>
      <span class="cn">${SITE_ITEMS.filter((i) => i.cat === c.id).length} مورد</span>
    </a>`).join("");
}

/* ---------------- شبکه‌ی کارت قیمت برای یک دسته ---------------- */
function renderPriceGrid(containerId, categoryId, limit) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let items = SITE_ITEMS.filter((it) => it.cat === categoryId);
  if (limit) items = items.slice(0, limit);
  if (!items.length) { el.innerHTML = `<div class="empty-state">موردی پیدا نشد.</div>`; return; }
  el.innerHTML = items.map(priceCardHTML).join("");
}
function wireLiveGrid(containerId, categoryId, limit) {
  renderPriceGrid(containerId, categoryId, limit);
  document.addEventListener("prices:updated", () => renderPriceGrid(containerId, categoryId, limit));
  document.addEventListener("favorites:updated", () => renderPriceGrid(containerId, categoryId, limit));
  document.addEventListener("items:updated", () => renderPriceGrid(containerId, categoryId, limit));
}

/* ---------------- جدول همه‌ی قیمت‌ها ---------------- */
let ALL_TABLE_SORT = { key: "cat", dir: 1 };
function renderAllPricesTable(containerId, filterText, filterCat) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let items = SITE_ITEMS.slice();
  if (filterCat && filterCat !== "all") items = items.filter((i) => i.cat === filterCat);
  if (filterText) {
    const q = norm(filterText);
    items = items.filter((i) => norm(i.name).includes(q));
  }
  items.sort((a, b) => {
    const da = PriceStore.data[a.id], db = PriceStore.data[b.id];
    let va, vb;
    if (ALL_TABLE_SORT.key === "name") { va = a.name; vb = b.name; }
    else if (ALL_TABLE_SORT.key === "cat") { va = a.cat; vb = b.cat; }
    else if (ALL_TABLE_SORT.key === "price") { va = da ? da.price : -Infinity; vb = db ? db.price : -Infinity; }
    else { va = da ? da.changePercent : -Infinity; vb = db ? db.changePercent : -Infinity; }
    if (va < vb) return -1 * ALL_TABLE_SORT.dir;
    if (va > vb) return 1 * ALL_TABLE_SORT.dir;
    return 0;
  });

  if (!items.length) {
    el.innerHTML = `<div class="empty-state">چیزی با این مشخصات پیدا نشد. فیلتر را تغییر دهید.</div>`;
    return;
  }

  const rows = items.map((it) => {
    const cat = SITE_CATEGORIES.find((c) => c.id === it.cat);
    const d = PriceStore.data[it.id];
    const chg = d ? d.changePercent : null;
    const chgClass = chg > 0 ? "up" : chg < 0 ? "down" : "";
    return `<tr>
      <td>${it.name}</td>
      <td>${cat ? cat.title : ""}</td>
      <td class="num">${d ? formatPrice(d.price) : "—"} <span class="text-dim">${it.unit}</span></td>
      <td class="num ${chgClass}">${chg === null || chg === undefined || Number.isNaN(chg) ? "—" : (chg > 0 ? "▲ " : chg < 0 ? "▼ " : "") + Math.abs(chg).toFixed(2) + "٪"}</td>
      <td>
        <div class="pc-actions" style="justify-content:flex-end;">
          <a class="chart-btn" href="item-chart.html?id=${encodeURIComponent(it.id)}" aria-label="مشاهده نمودار نوسانات ${it.name}" title="نمودار نوسانات امروز">${ICONS.chart}</a>
          <button class="fav-btn ${isFavorite(it.id) ? "active" : ""}" onclick="handleFavClick('${it.id}', this)">${isFavorite(it.id) ? ICONS.starFill : ICONS.star}</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  el.innerHTML = `
    <div class="table-wrap glass">
      <table>
        <thead><tr>
          <th data-key="name">نام</th>
          <th data-key="cat">دسته</th>
          <th data-key="price" class="num">قیمت</th>
          <th data-key="change" class="num">تغییر ۲۴س</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  el.querySelectorAll("thead th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      ALL_TABLE_SORT.dir = ALL_TABLE_SORT.key === key ? -ALL_TABLE_SORT.dir : 1;
      ALL_TABLE_SORT.key = key;
      renderAllPricesTable(containerId, filterText, filterCat);
    });
  });
}

/* ---------------- پرتغییرترین‌ها ---------------- */
function renderMovers(gainersId, losersId) {
  const withChg = SITE_ITEMS
    .map((it) => ({ it, d: PriceStore.data[it.id] }))
    .filter((x) => x.d && typeof x.d.changePercent === "number" && !Number.isNaN(x.d.changePercent));
  const gainers = withChg.slice().sort((a, b) => b.d.changePercent - a.d.changePercent).slice(0, 8);
  const losers = withChg.slice().sort((a, b) => a.d.changePercent - b.d.changePercent).slice(0, 8);
  const gEl = document.getElementById(gainersId), lEl = document.getElementById(losersId);
  const row = (x, cls) => `<div class="price-card glass">
      <div class="pc-top">
        <span class="pc-name">${x.it.name}</span>
        <a class="chart-btn" href="item-chart.html?id=${encodeURIComponent(x.it.id)}" aria-label="مشاهده نمودار نوسانات ${x.it.name}" title="نمودار نوسانات امروز">${ICONS.chart}</a>
      </div>
      <div class="pc-price">${formatPrice(x.d.price)} <span class="pc-unit">${x.it.unit}</span></div>
      <div class="pc-bottom"><span class="pc-chg ${cls}">${cls === "up" ? "▲" : "▼"} ${Math.abs(x.d.changePercent).toFixed(2)}٪</span></div>
    </div>`;
  if (gEl) gEl.innerHTML = gainers.length ? gainers.map((x) => row(x, "up")).join("") : `<div class="empty-state">هنوز داده‌ی کافی نیست.</div>`;
  if (lEl) lEl.innerHTML = losers.length ? losers.map((x) => row(x, "down")).join("") : `<div class="empty-state">هنوز داده‌ی کافی نیست.</div>`;
}

/* ---------------- نمودار ساده‌ی کندلی/خطی از تاریخچه‌ی لوکال ---------------- */
function drawSparkline(canvas, points, color) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  if (!points || points.length < 2) {
    ctx.fillStyle = "rgba(150,150,150,.5)";
    ctx.font = `${14 * devicePixelRatio}px Vazirmatn`;
    ctx.textAlign = "center";
    ctx.fillText("داده‌ی تاریخی هنوز جمع نشده — کمی بعد دوباره سر بزنید", w / 2, h / 2);
    return;
  }
  const prices = points.map((p) => p.p);
  const min = Math.min(...prices), max = Math.max(...prices);
  const pad = 10 * devicePixelRatio;
  const stepX = (w - pad * 2) / (points.length - 1);
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = pad + i * stepX;
    const y = max === min ? h / 2 : h - pad - ((p.p - min) / (max - min)) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color || "#d4af37";
  ctx.lineWidth = 2 * devicePixelRatio;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.lineTo(pad + (points.length - 1) * stepX, h);
  ctx.lineTo(pad, h);
  ctx.closePath();
  ctx.fillStyle = (color || "#d4af37") + "22";
  ctx.fill();
}
