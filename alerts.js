/**
 * alerts.js — هشدار قیمت
 * وقتی قیمت یک آیتم از حدی که کاربر تعیین کرده عبور کند، هم داخل صفحه
 * (toast) و هم — در صورت اجازه‌ی کاربر — با اعلان مرورگر خبر می‌دهد.
 * محدودیت: چون این یک سایت استاتیک بدون سرور است، هشدار فقط وقتی کار
 * می‌کند که خود سایت در تب مرورگر باز باشد.
 */
const ALERTS_KEY = "nerkh_alerts_v1";

function getAlerts() {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]"); } catch (e) { return []; }
}
function saveAlerts(list) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(list));
  document.dispatchEvent(new CustomEvent("alerts:updated"));
}
function addAlert(itemId, direction, targetPrice) {
  const list = getAlerts();
  list.push({ id: Date.now().toString(36), itemId, direction, targetPrice, triggered: false, createdAt: Date.now() });
  saveAlerts(list);
}
function removeAlert(alertId) {
  saveAlerts(getAlerts().filter((a) => a.id !== alertId));
}

function ensureNotifyPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "" }); } catch (e) {}
  }
  showToast(`${title} — ${body}`);
}

function showToast(msg) {
  let box = document.getElementById("toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    box.style.cssText = "position:fixed;bottom:18px;left:18px;z-index:200;display:flex;flex-direction:column;gap:8px;max-width:320px;";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = "glass-strong";
  t.style.cssText = "padding:12px 16px;border-radius:14px;font-size:.82rem;color:var(--text-0);box-shadow:var(--glass-shadow);";
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

function checkAlerts() {
  const list = getAlerts();
  let changed = false;
  list.forEach((a) => {
    if (a.triggered) return;
    const d = PriceStore.data[a.itemId];
    if (!d || typeof d.price !== "number") return;
    const hit = a.direction === "above" ? d.price >= a.targetPrice : d.price <= a.targetPrice;
    if (hit) {
      const item = SITE_ITEMS.find((it) => it.id === a.itemId);
      notify("هشدار قیمت فعال شد", `${item ? item.name : a.itemId} به ${formatPrice(d.price)} ${item ? item.unit : ""} رسید`);
      a.triggered = true;
      changed = true;
    }
  });
  if (changed) saveAlerts(list);
}

document.addEventListener("prices:updated", checkAlerts);
