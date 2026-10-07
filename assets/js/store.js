// Capa de datos del demo.
// Hoy guarda todo en el navegador (localStorage) y avisa a las otras pestañas abiertas,
// así el taller y la página de seguimiento se actualizan en vivo en la misma compu.
// Para el sistema real, estas mismas funciones pasan a llamar a Supabase (ver README).
import { buildSeed, SEED_VERSION, lineOfType, DEFAULT_STAGES, LINE_LABEL } from "./data/seed.js";
import { todayISO, addDays, daysBetween, localDate, firstName, waLink, dimsText } from "./format.js";

const KEY = "lu-demo-db";
const SESSION = "lu-demo-session";
const ATTEMPTS = "lu-demo-login-attempts";
const TRACK_ATTEMPTS = "lu-demo-track-attempts";

const listeners = new Set();
const errorListeners = new Set();
let db = read();

function readJSON(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k) || "null") ?? fallback; } catch { return fallback; }
}
function writeJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}
function read() {
  const d = readJSON(KEY, null);
  if (d && d.version === SEED_VERSION) return d;
  const fresh = buildSeed();
  writeJSON(KEY, fresh);
  return fresh;
}
function commit() {
  if (!writeJSON(KEY, db)) {
    errorListeners.forEach((f) => f("No se pudo guardar: el navegador se quedó sin espacio. Probá con fotos más livianas o reiniciá los datos de ejemplo."));
    db = read();
    return false;
  }
  emit();
  return true;
}
function emit() { listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
addEventListener("storage", (e) => {
  if (e.key === KEY) { db = read(); emit(); }
  if (e.key === SESSION) emit();
});

export const subscribe = (f) => (listeners.add(f), () => listeners.delete(f));
export const onError = (f) => (errorListeners.add(f), () => errorListeners.delete(f));
const nowISO = () => new Date().toISOString();
const uid = (p) => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);

/* ---------------- Usuarios y sesión ---------------- */

export const ROLE_LABEL = { admin: "Administrador", vendedor: "Vendedor", taller: "Taller" };
export const users = () => db.users;
export const user = (id) => db.users.find((u) => u.id === id) || null;

export function currentUser() {
  const s = readJSON(SESSION, null);
  if (!s) return null;
  const u = user(s.userId);
  const maxAge = (u && u.role === "taller" ? 16 : 12) * 3600e3;
  if (!u || !u.active || Date.now() - s.at > maxAge) { localStorage.removeItem(SESSION); return null; }
  return u;
}

export function login(username, password) {
  const key = String(username).trim().toLowerCase();
  const att = readJSON(ATTEMPTS, {});
  const a = att[key];
  if (a && a.until > Date.now()) return { ok: false, error: `Demasiados intentos. Probá de nuevo en ${Math.ceil((a.until - Date.now()) / 60000)} min.` };
  const u = db.users.find((x) => x.username === key);
  if (!u || u.password !== password) {
    const n = (a?.n || 0) + 1;
    att[key] = n >= 5 ? { n: 0, until: Date.now() + 15 * 60000 } : { n, until: 0 };
    writeJSON(ATTEMPTS, att);
    return { ok: false, error: n >= 5 ? "Demasiados intentos. Este usuario queda bloqueado 15 minutos." : "Usuario o contraseña incorrectos." };
  }
  if (!u.active) return { ok: false, error: "Este usuario está desactivado. Hablá con el administrador." };
  delete att[key];
  writeJSON(ATTEMPTS, att);
  writeJSON(SESSION, { userId: u.id, at: Date.now() });
  u.lastLogin = nowISO();
  commit();
  return { ok: true, user: u };
}
export function logout() { localStorage.removeItem(SESSION); emit(); }

export function changePassword(userId, pass) {
  const u = user(userId);
  if (!u) return false;
  u.password = pass;
  u.mustChange = false;
  return commit();
}

export function saveUser(data) {
  const username = String(data.username).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { ok: false, error: "El usuario lleva entre 3 y 30 letras, números, punto o guion, sin espacios." };
  if (db.users.some((u) => u.username === username && u.id !== data.id)) return { ok: false, error: "Ese usuario ya existe." };
  if (data.id) {
    const u = user(data.id);
    Object.assign(u, { name: data.name.trim(), username, role: data.role, phone: data.phone });
    if (data.password) { u.password = data.password; u.mustChange = true; }
  } else {
    db.users.push({ id: uid("u"), name: data.name.trim(), username, role: data.role, phone: data.phone, password: data.password, active: true, mustChange: true, lastLogin: null });
  }
  commit();
  return { ok: true };
}
export function setUserActive(id, active) {
  const u = user(id);
  if (!u) return;
  u.active = active;
  commit();
}

/* ---------------- Catálogo ---------------- */

export const rooms = () => [...db.catalog.rooms].sort((a, b) => a.order - b.order);
export const room = (id) => db.catalog.rooms.find((r) => r.id === id) || null;
export const products = () => db.catalog.products;
export const product = (id) => db.catalog.products.find((p) => p.id === id) || null;
export const works = () => db.catalog.works;
export const typesOf = (roomId) => [...new Set(db.catalog.products.filter((p) => !roomId || p.room === roomId).map((p) => p.type))];

export function saveProduct(p) {
  p.updatedAt = nowISO();
  if (!p.id) {
    const n = Math.max(...db.catalog.products.map((x) => +x.id.slice(1))) + 1;
    p.id = "m" + String(n).padStart(3, "0");
    db.catalog.products.unshift(p);
  } else {
    const i = db.catalog.products.findIndex((x) => x.id === p.id);
    db.catalog.products[i] = p;
  }
  commit();
  return p;
}
export function setProductVisible(id, visible) {
  const p = product(id);
  if (!p) return;
  p.visible = visible;
  p.updatedAt = nowISO();
  commit();
}
export function saveRoom(r) {
  const x = room(r.id);
  Object.assign(x, r);
  commit();
}
export function setWorkVisible(id, visible) {
  const w = db.catalog.works.find((x) => x.id === id);
  if (w) { w.visible = visible; commit(); }
}
export function addWorkFromOrder(number) {
  const o = rawOrder(number);
  const photos = o.items.flatMap((it) => it.log.filter((l) => l.photo).map((l) => l.photo));
  if (!photos.length) return { ok: false, error: "Esta orden no tiene fotos del taller." };
  db.catalog.works.unshift({ id: uid("w"), kind: "orden", title: `${o.items[0].name} · ${o.number}`, photos, visible: false });
  logOrder(o, currentUser()?.id, "Fotos agregadas a Trabajos realizados (ocultas hasta revisar)");
  commit();
  return { ok: true };
}

/* ---------------- Etapas ---------------- */

export const stagesOf = (line) => db.config.stages[line] || DEFAULT_STAGES[line];
export function saveStages(line, list) { db.config.stages[line] = list; commit(); }
export function resetStages() { db.config.stages = JSON.parse(JSON.stringify(DEFAULT_STAGES)); commit(); }
export { lineOfType, LINE_LABEL };

/* ---------------- Clientes ---------------- */

export const customers = () => db.customers;
export const customer = (id) => db.customers.find((c) => c.id === id) || null;
export function findCustomers(q) {
  const s = String(q).trim().toLowerCase();
  const digits = s.replace(/\D/g, "");
  if (s.length < 2) return [];
  return db.customers.filter((c) => c.name.toLowerCase().includes(s) || (digits.length >= 3 && c.phone.includes(digits))).slice(0, 6);
}
export function saveCustomer(c, byId) {
  const x = customer(c.id);
  Object.assign(x, c);
  db.orders.filter((o) => o.customerId === c.id && o.status !== "cancelada").forEach((o) => logOrder(o, byId, "Datos del cliente actualizados"));
  commit();
}

/* ---------------- Órdenes ---------------- */

const rawOrder = (number) => db.orders.find((o) => o.number.toUpperCase() === String(number).toUpperCase());
function logOrder(o, by, text) { o.log.push({ at: nowISO(), by: by || null, text }); }

export function dueAmount(o) {
  return o.plan.method === "tarjeta" ? Math.round(o.total * (1 + o.plan.rate)) : o.total;
}
export const paymentsOf = (number) => db.payments.filter((p) => p.orderNumber === number).sort((a, b) => a.at.localeCompare(b.at));

export function scheduleOf(o) {
  if (o.plan.method !== "semanal") return [];
  const paidCuotas = paymentsOf(o.number).filter((p) => p.kind === "cuota").length;
  const today = todayISO();
  return Array.from({ length: o.plan.weeks }, (_, i) => {
    const due = addDays(o.plan.start, 7 * i);
    const paid = i < paidCuotas;
    return { n: i + 1, due, amount: o.plan.weekly, status: paid ? "pagada" : due < today ? "vencida" : due === today ? "hoy" : "pendiente" };
  });
}

function itemView(it) {
  const stages = stagesOf(it.line);
  const done = it.current > stages.length;
  return { ...it, stages, done, stage: done ? null : stages[it.current - 1], progress: Math.min(it.current - 1, stages.length) / stages.length };
}

export function orderView(o) {
  if (!o) return null;
  const items = o.items.map(itemView);
  const allDone = items.every((i) => i.done);
  const allReady = items.every((i) => i.current >= i.stages.length);
  const state = o.status === "cancelada" ? "cancelada" : allDone ? "entregada" : o.status === "pausa" ? "pausa" : allReady ? "lista" : "fabricacion";
  const today = todayISO();
  const late = (state === "fabricacion" || state === "lista" || state === "pausa") && o.dueDate < today;
  const due = dueAmount(o);
  const paid = paymentsOf(o.number).reduce((s, p) => s + p.amount, 0);
  const moves = items.flatMap((i) => i.log.map((l) => l.at));
  const lastMove = moves.sort().at(-1) || o.createdAt;
  const stalled = state === "fabricacion" && daysBetween(localDate(lastMove), today) > 7;
  const problem = items.find((i) => i.problem && !i.problem.resolvedAt)?.problem || null;
  const minCur = Math.min(...items.map((i) => i.current));
  const progress = items.reduce((s, i) => s + i.progress, 0) / items.length;
  const schedule = scheduleOf(o);
  const overdueCuotas = schedule.filter((c) => c.status === "vencida").length;
  return { ...o, items, customer: customer(o.customerId), seller: user(o.sellerId), state, late, due, paid, balance: due - paid, lastMove, stalled, problem, minCur, progress, schedule, overdueCuotas };
}

export const orders = () => db.orders.map(orderView).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const order = (number) => orderView(rawOrder(number));
export const trackingUrl = (o) => `${location.origin}/seguimiento/${o.number}?c=${o.code}`;

function nextNumber() {
  db.counters.order += 1;
  return "LU-" + String(db.counters.order).padStart(4, "0");
}
function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => A[b % A.length]).join("");
}

export function createOrder(draft, byId) {
  let cust;
  if (draft.customer.id) {
    cust = customer(draft.customer.id);
    Object.assign(cust, { ...draft.customer });
  } else {
    cust = { ...draft.customer, id: uid("c"), createdAt: nowISO() };
    db.customers.push(cust);
  }
  const number = nextNumber();
  const createdAt = nowISO();
  const plan = { ...draft.plan };
  const deposit = draft.deposit?.amount || 0;
  if (plan.method === "semanal") {
    plan.weekly = Math.ceil((draft.total - deposit) / plan.weeks / 100) * 100;
    plan.start = addDays(todayISO(), 7);
  }
  const o = {
    id: uid("o"),
    number,
    code: newCode(),
    customerId: cust.id,
    sellerId: byId,
    createdAt,
    dueDate: draft.dueDate,
    delivery: draft.delivery,
    address: draft.address || cust.address,
    status: "activa",
    statusReason: "",
    total: draft.total,
    plan,
    notes: draft.notes || "",
    items: draft.items.map((it) => ({ ...it, id: uid("i"), current: 1, log: [], problem: null })),
    log: [{ at: createdAt, by: byId, text: "Venta registrada" }],
  };
  db.orders.push(o);
  if (deposit > 0) {
    addPaymentRaw(o, { amount: deposit, method: draft.deposit.method, concept: plan.method === "tarjeta" ? `Pago con tarjeta (${plan.cuotas} cuotas)` : "Seña", kind: plan.method === "tarjeta" ? "pago" : "sena" }, byId);
  }
  db.notifs.push({ id: uid("n"), orderNumber: number, kind: "inicio", createdAt, sentAt: null });
  commit();
  return order(number);
}

export function updateOrderMeta(number, patch, byId) {
  const o = rawOrder(number);
  if (patch.dueDate && patch.dueDate !== o.dueDate) logOrder(o, byId, `Fecha de entrega cambiada al ${patch.dueDate.split("-").reverse().join("/")}`);
  Object.assign(o, patch);
  commit();
}
export function updateItem(number, itemId, patch, byId) {
  const o = rawOrder(number);
  const it = o.items.find((i) => i.id === itemId);
  Object.assign(it, patch);
  logOrder(o, byId, `Proyecto actualizado: ${it.name}`);
  commit();
}
export function setStatus(number, status, reason, byId) {
  const o = rawOrder(number);
  o.status = status;
  o.statusReason = reason || "";
  const label = { pausa: "Orden en pausa", activa: "Orden reanudada", cancelada: "Orden cancelada" }[status];
  logOrder(o, byId, reason ? `${label}: ${reason}` : label);
  commit();
}

/* Taller */
export function advanceItem(number, itemId, { photo = "", note = "" } = {}, byId) {
  const o = rawOrder(number);
  const it = o.items.find((i) => i.id === itemId);
  const stages = stagesOf(it.line);
  if (it.current > stages.length) return null;
  const stage = it.current;
  it.log.push({ stage, action: "done", at: nowISO(), by: byId, photo, note });
  it.current += 1;
  logOrder(o, byId, `${it.name}: terminó «${stages[stage - 1].name}»`);
  let notifId = null;
  const view = orderView(o);
  if (it.current === stages.length && view.items.every((i) => i.current >= i.stages.length)) {
    notifId = uid("n");
    db.notifs.push({ id: notifId, orderNumber: number, kind: "lista", createdAt: nowISO(), sentAt: null });
  }
  if (view.items.every((i) => i.done)) {
    notifId = uid("n");
    db.notifs.push({ id: notifId, orderNumber: number, kind: "entregada", createdAt: nowISO(), sentAt: null });
  }
  commit();
  return { number, itemId, stage, notifId, at: Date.now() };
}
export function undoAdvance(token) {
  if (!token || Date.now() - token.at > 15000) return false;
  const o = rawOrder(token.number);
  const it = o.items.find((i) => i.id === token.itemId);
  const last = it.log.at(-1);
  if (!last || last.stage !== token.stage) return false;
  it.log.pop();
  it.current = token.stage;
  if (token.notifId) db.notifs = db.notifs.filter((n) => n.id !== token.notifId);
  o.log.pop();
  commit();
  return true;
}
export function skipStage(number, itemId, byId) {
  const o = rawOrder(number);
  const it = o.items.find((i) => i.id === itemId);
  const stages = stagesOf(it.line);
  it.log.push({ stage: it.current, action: "skip", at: nowISO(), by: byId, photo: "", note: "" });
  logOrder(o, byId, `${it.name}: salteó «${stages[it.current - 1].name}»`);
  it.current += 1;
  commit();
}
export function reportProblem(number, itemId, text, byId) {
  const o = rawOrder(number);
  const it = o.items.find((i) => i.id === itemId);
  it.problem = { text, at: nowISO(), by: byId, resolvedAt: null };
  logOrder(o, byId, `Problema reportado en ${it.name}: ${text}`);
  commit();
}
export function resolveProblem(number, itemId, byId) {
  const o = rawOrder(number);
  const it = o.items.find((i) => i.id === itemId);
  if (it.problem) it.problem.resolvedAt = nowISO();
  logOrder(o, byId, `Problema resuelto en ${it.name}`);
  commit();
}

/* ---------------- Cobros y caja ---------------- */

export const METHOD_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia", debito: "Débito", credito: "Crédito" };

export function cashDateNow() {
  const t = todayISO();
  return db.cash[t]?.closedAt ? addDays(t, 1) : t;
}
function addPaymentRaw(o, p, byId) {
  const rec = { id: uid("p"), orderNumber: o.number, at: nowISO(), cashDate: cashDateNow(), amount: p.amount, method: p.method, concept: p.concept, kind: p.kind, by: byId };
  db.payments.push(rec);
  logOrder(o, byId, `Cobro registrado: ${p.concept} · ${p.amount.toLocaleString("es-AR")} (${METHOD_LABEL[p.method]})`);
  return rec;
}
export function addPayment(number, p, byId) {
  const o = rawOrder(number);
  const rec = addPaymentRaw(o, p, byId);
  commit();
  return rec;
}

export const cashDay = (date) => db.cash[date] || null;
export function openCash(opening, byId) {
  const date = todayISO();
  db.cash[date] = { date, opening, openedAt: nowISO(), openedBy: byId, expenses: [], closedAt: null, closedBy: null, counted: null, expected: null, note: "" };
  commit();
}
export function addExpense(amount, reason, byId) {
  const day = db.cash[todayISO()];
  day.expenses.push({ id: uid("e"), at: nowISO(), amount, reason, by: byId });
  commit();
}
export function cashSummary(date) {
  const day = db.cash[date] || null;
  const pays = db.payments.filter((p) => p.cashDate === date).sort((a, b) => a.at.localeCompare(b.at));
  const by = { efectivo: 0, transferencia: 0, debito: 0, credito: 0 };
  pays.forEach((p) => (by[p.method] += p.amount));
  const cuotas = pays.filter((p) => p.kind === "cuota").reduce((s, p) => s + p.amount, 0);
  const expenses = day ? day.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const opening = day?.opening || 0;
  const expected = opening + by.efectivo - expenses;
  const total = pays.reduce((s, p) => s + p.amount, 0);
  return { date, day, pays, by, cuotas, expenses, opening, expected, total };
}
export function closeCash(counted, note, byId) {
  const date = todayISO();
  const s = cashSummary(date);
  Object.assign(db.cash[date], { closedAt: nowISO(), closedBy: byId, counted, expected: s.expected, note });
  commit();
}
export const cashHistory = () => Object.keys(db.cash).sort().reverse().map(cashSummary);

/* ---------------- Avisos por WhatsApp ---------------- */

export function notifText(n) {
  const o = order(n.orderNumber);
  const name = firstName(o.customer.name.split("·")[0]);
  const link = trackingUrl(o);
  if (n.kind === "inicio") return `¡Hola ${name}! Gracias por tu compra en La Unión. Tu número de orden es ${o.number}. Podés ver cómo avanza la fabricación acá: ${link}`;
  if (n.kind === "lista") return `¡Hola ${name}! Tu pedido ${o.number} ya está listo. ${o.delivery === "retiro" ? "Podés pasar a retirarlo por el showroom de Lomas de Tafí." : "Escribinos para coordinar el día de entrega e instalación."} ${link}`;
  return `¡Hola ${name}! Ya entregamos tu pedido ${o.number}. Gracias por elegir La Unión. Si querés, mandanos una foto de cómo quedó.`;
}
export const NOTIF_LABEL = { inicio: "Bienvenida y link de seguimiento", lista: "Pedido listo para entregar", entregada: "Gracias por la compra" };
export function pendingNotifs(forUser) {
  return db.notifs
    .filter((n) => !n.sentAt)
    .map((n) => ({ ...n, order: order(n.orderNumber) }))
    .filter((n) => n.order && (forUser.role === "admin" || n.order.sellerId === forUser.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function notifLink(n) {
  const o = order(n.orderNumber);
  return waLink(o.customer.phone, notifText(n));
}
export function markNotifSent(id) {
  const n = db.notifs.find((x) => x.id === id);
  if (n) { n.sentAt = nowISO(); commit(); }
}
export function markOrderNotif(number, kind) {
  const n = db.notifs.find((x) => x.orderNumber === number && x.kind === kind && !x.sentAt);
  if (n) { n.sentAt = nowISO(); commit(); }
}

/* ---------------- Seguimiento público ---------------- */

function trackLimit(key) {
  const all = readJSON(TRACK_ATTEMPTS, {});
  return { all, a: all[key] || { n: 0, until: 0 } };
}
export function track(number, { code, last4 } = {}) {
  const num = String(number || "").trim().toUpperCase().replace(/^LU-?/, "LU-");
  const o = rawOrder(num);
  if (code) {
    if (!o || o.code !== String(code).toUpperCase()) return { ok: false, error: "Este link no es válido. Revisá que esté completo o buscá tu pedido con el número de orden." };
  } else {
    const { all, a } = trackLimit("manual");
    if (a.until > Date.now()) return { ok: false, error: `Hiciste muchos intentos. Probá de nuevo en ${Math.ceil((a.until - Date.now()) / 60000)} minutos.` };
    const okPhone = o && customer(o.customerId).phone.endsWith(String(last4 || ""));
    if (!o || !okPhone || String(last4 || "").length !== 4) {
      const n = a.n + 1;
      all.manual = n >= 5 ? { n: 0, until: Date.now() + 15 * 60000 } : { n, until: 0 };
      writeJSON(TRACK_ATTEMPTS, all);
      return { ok: false, error: "No encontramos un pedido con esos datos. Revisá el número de orden y los últimos 4 números de tu teléfono." };
    }
    delete all.manual;
    writeJSON(TRACK_ATTEMPTS, all);
  }
  const v = orderView(o);
  return {
    ok: true,
    order: {
      number: v.number,
      code: v.code,
      firstName: firstName(v.customer.name.split("·")[0]),
      createdAt: v.createdAt,
      dueDate: v.dueDate,
      delivery: v.delivery,
      state: v.state,
      items: v.items.map((it) => ({
        id: it.id,
        name: it.name,
        qty: it.qty,
        dims: dimsText(it.dims),
        color: it.color,
        photo: it.photo,
        current: it.current,
        done: it.done,
        stages: it.stages.map((s, i) => {
          const entry = [...it.log].reverse().find((l) => l.stage === i + 1);
          const status = i + 1 < it.current ? (entry?.action === "skip" ? "skipped" : "done") : i + 1 === it.current ? "current" : "pending";
          return { name: s.name, client: s.client, status, at: entry?.at || null, photo: entry?.action === "done" ? entry.photo : "" };
        }),
      })),
    },
  };
}

/* ---------------- Demo ---------------- */

export function resetDemo() {
  db = buildSeed();
  writeJSON(KEY, db);
  localStorage.removeItem(ATTEMPTS);
  localStorage.removeItem(TRACK_ATTEMPTS);
  emit();
}
export const storageSize = () => { try { return (localStorage.getItem(KEY) || "").length; } catch { return 0; } };
