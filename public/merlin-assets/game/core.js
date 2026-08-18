export const VERSION = 4;
export const SAVE_KEY = "merlin-grimoire-v4";
export const $ = (id) => document.getElementById(id);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (a) => {
  const result = [...a];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
export const ELEMENTS = {
  fire: { name: "火", icon: "🔥" }, water: { name: "水", icon: "💧" },
  wind: { name: "风", icon: "🌪" }, earth: { name: "土", icon: "◆" },
  light: { name: "光", icon: "☀" }, dark: { name: "暗", icon: "☾" }, arcane: { name: "奥术", icon: "✶" },
  hybrid: { name: "复合", icon: "✦" }
};
export const SCHOOL_ORDER = ["fire", "water", "wind", "earth", "light", "dark", "hybrid", "arcane"];
export const cost = (type, amount, parts) => ({ type, amount, parts });
export const C = (id, name, school, payment, echo, full, tags, extra = {}) => ({ id, name, school, cost: payment, echo, full, tags, ...extra });
export const same = (element, amount) => cost("fixed", amount, { [element]: amount });
export const fixed = (parts) => cost("fixed", Object.values(parts).reduce((a, b) => a + b, 0), parts);
export const any = (amount) => cost("any", amount);
export const random = (amount) => cost("random", amount);
export const all = (parts, min) => cost("all", min, parts);
export function randomInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
export function variance() { return .4 + 2.6 * Math.pow(Math.random(), 10 / 3); }
export function esc(text) { return String(text).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
