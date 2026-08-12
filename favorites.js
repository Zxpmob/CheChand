/**
 * favorites.js — لیست علاقه‌مندی‌ها (در مرورگر همین کاربر ذخیره می‌شود)
 */
const FAV_KEY = "nerkh_favorites_v1";

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
}
function isFavorite(id) { return getFavorites().includes(id); }
function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) favs = favs.filter((f) => f !== id);
  else favs.push(id);
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  document.dispatchEvent(new CustomEvent("favorites:updated"));
  return favs.includes(id);
}
