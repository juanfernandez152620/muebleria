// Componentes de interfaz compartidos: íconos, modales, avisos, fotos.
import { esc } from "./format.js";

const P = (d) => `<path d="${d}"/>`;
const ICONS = {
  home: P("M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9"),
  orders: P("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"),
  plus: P("M12 5v14M5 12h14"),
  catalog: P("M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
  tool: P("M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"),
  cash: P("M3 7h18v10H3zM7 12h.01M17 12h.01") + `<circle cx="12" cy="12" r="2.5"/>`,
  users: P("M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M20 19v-1a4 4 0 0 0-3-3.9M15 3.2a4 4 0 0 1 0 7.6") + `<circle cx="9" cy="7" r="4"/>`,
  settings: `<circle cx="12" cy="12" r="3"/>` + P("M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"),
  search: `<circle cx="11" cy="11" r="7"/>` + P("m20 20-3.5-3.5"),
  logout: P("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"),
  right: P("m9 6 6 6-6 6"),
  left: P("m15 6-6 6 6 6"),
  x: P("M6 6l12 12M18 6 6 18"),
  check: P("m5 12.5 4.2 4.2L19 7"),
  chat: P("M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z"),
  copy: P("M9 9h11v11H9zM5 15H4V4h11v1"),
  print: P("M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"),
  pause: P("M9 5v14M15 5v14"),
  play: P("m7 4 13 8-13 8z"),
  ban: `<circle cx="12" cy="12" r="9"/>` + P("m5.6 5.6 12.8 12.8"),
  camera: P("M4 7h3l2-3h6l2 3h3v13H4z") + `<circle cx="12" cy="13" r="4"/>`,
  qr: P("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2M17 17h.01"),
  alert: P("M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"),
  info: `<circle cx="12" cy="12" r="9"/>` + P("M12 11v6M12 7.5v.5"),
  image: P("M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4") + `<circle cx="15.5" cy="9" r="1.5"/>`,
  upload: P("M12 16V4M7 9l5-5 5 5M4 20h16"),
  edit: P("M4 20h4L19 9l-4-4L4 16zM14 6l4 4"),
  eye: P("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z") + `<circle cx="12" cy="12" r="3"/>`,
  eyeoff: P("M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"),
  up: P("m6 15 6-6 6 6"),
  down: P("m6 9 6 6 6-6"),
  trash: P("M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"),
  clock: `<circle cx="12" cy="12" r="9"/>` + P("M12 7v5l3 2"),
  truck: P("M2 6h12v10H2zM14 9h4l3 3v4h-7z") + `<circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>`,
  store: P("M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6"),
  sun: `<circle cx="12" cy="12" r="4"/>` + P("M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"),
  moon: P("M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"),
  menu: P("M4 7h16M4 12h16M4 17h16"),
  more: `<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>`,
  link: P("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"),
  refresh: P("M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"),
  skip: P("M5 5l9 7-9 7zM18 5v14"),
  undo: P("M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"),
  calendar: P("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"),
  user: `<circle cx="12" cy="8" r="4"/>` + P("M4 21a8 8 0 0 1 16 0"),
  ext: P("M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"),
};

export function injectIcons() {
  if (document.getElementById("lu-icons")) return;
  const syms = Object.entries(ICONS)
    .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`)
    .join("");
  document.body.insertAdjacentHTML("afterbegin", `<svg id="lu-icons" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${syms}${LOGO_DEFS}</defs></svg>`);
}
export const icon = (name, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const LOGO_DEFS = `<linearGradient id="lu-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2D58A"/><stop offset=".45" stop-color="#D6A548"/><stop offset="1" stop-color="#A9782C"/></linearGradient>
<linearGradient id="lu-bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C6B5D"/><stop offset="1" stop-color="#4A3E35"/></linearGradient>
<symbol id="lu-mark" viewBox="0 0 320 460"><g transform="translate(-14 -24)"><path d="M100 66 L157 98 L157 334 L208 360 L262 333 L262 100 L318 64 L318 354 L208 412 L100 372 Z" fill="url(#lu-bronze)" stroke="#231E1A" stroke-width="7"/><path d="M38 38 L80 56 L80 370 L194 424 L194 472 L38 396 Z" fill="url(#lu-gold)" stroke="#231E1A" stroke-width="7"/><g stroke="#231E1A" stroke-width="2.2" fill="none"><path d="M49 44 L49 418"/><path d="M20 360 L194 444"/></g></g></symbol>`;
export const logo = (cls = "", h = 34) => `<svg class="${cls}" viewBox="0 0 320 460" style="height:${h}px;width:auto" aria-hidden="true"><use href="#lu-mark"/></svg>`;

/* ---------- Toasts ---------- */
let toastBox;
export function toast(msg, { action, onAction, tone = "", timeout = 3500 } = {}) {
  if (!toastBox) {
    toastBox = document.createElement("div");
    toastBox.className = "toasts";
    toastBox.setAttribute("role", "status");
    toastBox.setAttribute("aria-live", "polite");
    document.body.append(toastBox);
  }
  const el = document.createElement("div");
  el.className = `toast ${tone}`;
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
  toastBox.append(el);
  const t = setTimeout(() => el.remove(), timeout);
  if (action) el.querySelector("button").addEventListener("click", () => { clearTimeout(t); el.remove(); onAction && onAction(); });
  return () => { clearTimeout(t); el.remove(); };
}

/* ---------- Modales ---------- */
const openModals = [];
export const hasOpenModal = () => openModals.length > 0;
export function modal({ title, body = "", foot = "", wide = false, onClose } = {}) {
  const root = document.createElement("div");
  root.className = "modal-root";
  const id = "m" + Math.random().toString(36).slice(2, 7);
  root.innerHTML = `<div class="modal-scrim" data-x></div><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="${id}">
    <div class="modal-head"><h2 id="${id}">${esc(title)}</h2><button class="icon-btn" type="button" data-x aria-label="Cerrar">${icon("x")}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ""}</div>`;
  const prev = document.activeElement;
  document.body.append(root);
  document.body.style.overflow = "hidden";
  const close = () => {
    root.remove();
    openModals.splice(openModals.indexOf(api), 1);
    if (!openModals.length) document.body.style.overflow = "";
    prev && prev.focus && prev.focus({ preventScroll: true });
    onClose && onClose();
    if (!openModals.length) dispatchEvent(new Event("lu:modals-closed"));
  };
  const api = { el: root, body: root.querySelector(".modal-body"), close };
  openModals.push(api);
  root.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) close(); });
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  setTimeout(() => (root.querySelector("[autofocus], input, select, textarea, .modal-foot .btn-primary") || root.querySelector(".modal-head button")).focus(), 30);
  return api;
}
export function confirmDialog({ title, text, ok = "Confirmar", danger = false, cancel = "Cancelar" }) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title,
      body: `<p>${text}</p>`,
      foot: `<button class="btn" type="button" data-no>${esc(cancel)}</button><button class="btn ${danger ? "btn-dark" : "btn-primary"}" type="button" data-yes>${esc(ok)}</button>`,
      onClose: () => !done && resolve(false),
    });
    m.el.querySelector("[data-no]").onclick = () => m.close();
    m.el.querySelector("[data-yes]").onclick = () => { done = true; m.close(); resolve(true); };
  });
}
export function lightbox(src) {
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `<img src="${esc(src)}" alt="">`;
  el.tabIndex = -1;
  el.addEventListener("click", () => el.remove());
  el.addEventListener("keydown", (e) => e.key === "Escape" && el.remove());
  document.body.append(el);
  el.focus();
}
document.addEventListener("click", (e) => {
  const z = e.target.closest("[data-zoom]");
  if (z) { e.preventDefault(); lightbox(z.dataset.zoom || z.src); }
});

/* ---------- Fotos: comprimir antes de guardar ---------- */
export function fileToDataURL(file, max = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("El archivo no es una imagen."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

export async function copyText(text, okMsg = "Copiado") {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { prompt("Copiá el texto:", text); }
}

/* ---------- Piezas de estado ---------- */
export const STATE_LABEL = { fabricacion: "En fabricación", lista: "Lista para entregar", entregada: "Entregada", pausa: "En pausa", cancelada: "Cancelada" };
const STATE_TONE = { fabricacion: "info", lista: "ok", entregada: "plain", pausa: "warn", cancelada: "bad" };
export const stateBadge = (state) => `<span class="badge ${STATE_TONE[state]}">${STATE_LABEL[state]}</span>`;

export function progressBar(item, paused = false) {
  const n = item.stages.length;
  const segs = item.stages.map((_, i) => `<i class="${i + 1 < item.current ? "done" : i + 1 === item.current ? "cur" : ""}"></i>`).join("");
  return `<div class="prog ${paused ? "paused" : ""}" style="--n:${n}" role="img" aria-label="Etapa ${Math.min(item.current, n)} de ${n}">${segs}</div>`;
}
export function orderProgress(o) {
  const it = [...o.items].sort((a, b) => a.current - b.current)[0];
  const label = o.state === "entregada" ? "Entregada" : o.state === "cancelada" ? "Cancelada" : it.done ? "Entregado" : `${it.current}. ${it.stage.short}${o.items.length > 1 ? ` · ${o.items.length} muebles` : ""}`;
  return `${progressBar(it, o.state === "pausa")}<span class="prog-label">${esc(label)}</span>`;
}
export const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
