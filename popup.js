const DEFAULTS = {
  enabled: true,
  position: "both",
  showGold: true,
  showCurrency: true,
  showCrypto: true,
  showMovers: true,
  showAds: true,
};

const SITE_URL = "https://example.com/"; // بعد از مشخص‌شدن دامنه‌ی نهایی سایت، این را عوض کنید

const els = {
  enabled: document.getElementById("pp-enabled"),
  position: document.getElementById("pp-position"),
  gold: document.getElementById("pp-gold"),
  currency: document.getElementById("pp-currency"),
  crypto: document.getElementById("pp-crypto"),
  movers: document.getElementById("pp-movers"),
  ads: document.getElementById("pp-ads"),
};

document.getElementById("pp-site-link").href = SITE_URL;

function load() {
  chrome.storage.sync.get(DEFAULTS, (v) => {
    els.enabled.checked = v.enabled;
    els.position.value = v.position;
    els.gold.checked = v.showGold;
    els.currency.checked = v.showCurrency;
    els.crypto.checked = v.showCrypto;
    els.movers.checked = v.showMovers;
    els.ads.checked = v.showAds;
  });
}

function save() {
  chrome.storage.sync.set({
    enabled: els.enabled.checked,
    position: els.position.value,
    showGold: els.gold.checked,
    showCurrency: els.currency.checked,
    showCrypto: els.crypto.checked,
    showMovers: els.movers.checked,
    showAds: els.ads.checked,
  });
}

Object.values(els).forEach((el) => el.addEventListener("change", save));
load();
