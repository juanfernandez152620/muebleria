// Formato de fechas, montos y textos (es-AR). Sin dependencias.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const NF = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const num = (n) => NF.format(Math.round(n || 0));
export const ars = (n) => (n < 0 ? "− $ " : "$ ") + NF.format(Math.abs(Math.round(n || 0)));
export const parseArs = (s) => +String(s ?? "").replace(/\D/g, "") || 0;

const asDate = (v) => (typeof v === "string" && v.length === 10 ? new Date(v + "T12:00:00") : new Date(v));
const DF = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const DFY = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });
const DL = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const TF = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

export const fdate = (v) => (v ? DF.format(asDate(v)).replace(".", "") : "—");
export const fdateY = (v) => (v ? DFY.format(asDate(v)).replace(".", "") : "—");
export const fdateLong = (v) => (v ? DL.format(asDate(v)) : "—");
export const ftime = (v) => (v ? TF.format(asDate(v)) : "");
export const fdatetime = (v) => (v ? `${fdate(v)}, ${ftime(v)}` : "—");

export const localDate = (d = new Date()) => {
  const z = new Date(d);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`;
};
export const todayISO = () => localDate(new Date());
export const addDays = (iso, n) => {
  const d = asDate(iso);
  d.setDate(d.getDate() + n);
  return localDate(d);
};
export const daysBetween = (a, b) => Math.round((asDate(b) - asDate(a)) / 864e5);

export function rel(v) {
  if (!v) return "";
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 45) return "recién";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export function dueLabel(dueISO) {
  const d = daysBetween(todayISO(), dueISO);
  if (d < 0) return { text: `${-d} ${d === -1 ? "día" : "días"} de atraso`, tone: "bad" };
  if (d === 0) return { text: "Vence hoy", tone: "warn" };
  if (d <= 3) return { text: `Faltan ${d} ${d === 1 ? "día" : "días"}`, tone: "warn" };
  return { text: `Faltan ${d} días`, tone: "muted" };
}

export const phonePretty = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("549")) return `+54 9 ${d.slice(3, 6)} ${d.slice(6, 9)}-${d.slice(9)}`;
  return d ? "+" + d : "—";
};
export const normPhone = (p) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "549" + d; // 381 555 1234
  if (d.length === 12 && d.startsWith("54") && !d.startsWith("549")) d = "549" + d.slice(2);
  return d;
};
export const waLink = (phone, text) => `https://wa.me/${String(phone).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";

export function dimsText(d) {
  if (!d) return "";
  if (d.diam) return [d.h && `Alto ${d.h}`, `Ø ${d.diam}`].filter(Boolean).join(" · ") + " cm";
  const parts = [d.w && `${d.w}`, d.h && `${d.h}`, d.d && `${d.d}`].filter(Boolean);
  return parts.length ? parts.join(" × ") + " cm" : d.text || "";
}

export const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
