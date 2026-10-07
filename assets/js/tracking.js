// Página pública de seguimiento: /seguimiento/LU-0142?c=CODIGO o formulario (orden + últimos 4 del teléfono).
// No muestra montos ni datos internos: solo lo que devuelve S.track(), que ya viene filtrado.
import * as S from "./store.js";
import { esc, fdate, fdateLong, ftime, rel, waLink, todayISO } from "./format.js";

const SHOP_PHONE = "5493812194874";
const root = document.getElementById("tk");
const SAVED = "lu-track-last"; // recuerda el último pedido abierto en este celular
let current = null; // { number, code }
let lastSeen = 0;
let tick = null;

const STATE = {
  fabricacion: { label: "En fabricación", tone: "" },
  lista: { label: "Listo para entregar", tone: "ok" },
  entregada: { label: "Entregado", tone: "ok" },
  pausa: { label: "En pausa", tone: "warn" },
  cancelada: { label: "Cancelado", tone: "bad" },
};

const ic = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7M7 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm12 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
};

/* ---------- arranque ---------- */

function parseUrl() {
  const m = location.pathname.match(/\/seguimiento\/([A-Za-z]{2}-?\d{3,6})\/?$/);
  const code = new URLSearchParams(location.search).get("c");
  return { number: m ? m[1].toUpperCase() : null, code };
}

function start() {
  const { number, code } = parseUrl();
  if (number && code) return open({ number, code });
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(SAVED) || "null"); } catch {}
  if (saved?.number && saved?.code && (!number || number === saved.number)) return open(saved, { quiet: true });
  renderForm({ number });
}

function open(ref, { quiet = false, push = false } = {}) {
  const r = S.track(ref.number, { code: ref.code });
  if (!r.ok) {
    if (quiet) { try { sessionStorage.removeItem(SAVED); } catch {} return renderForm({}); }
    return renderForm({ number: ref.number, error: r.error });
  }
  current = { number: r.order.number, code: r.order.code };
  try { sessionStorage.setItem(SAVED, JSON.stringify(current)); } catch {}
  const url = `/seguimiento/${current.number}?c=${current.code}`;
  if (push) history.pushState(null, "", url);
  else if (location.pathname + location.search !== url) history.replaceState(null, "", url);
  lastSeen = Date.now();
  renderOrder(r.order);
}

/* ---------- formulario ---------- */

function renderForm({ number = "", error = "" } = {}) {
  current = null;
  document.title = "Seguí tu pedido · La Unión Muebles";
  root.innerHTML = `
    <section class="tk-hero">
      <p class="tk-eyebrow">Seguimiento</p>
      <h1>Seguí tu pedido</h1>
      <p class="tk-lead">Mirá en qué etapa está tu mueble. Lo actualiza el taller a medida que avanza.</p>
    </section>
    <form class="tk-card tk-form" novalidate>
      <label class="tk-field"><span>Número de orden</span>
        <input name="number" value="${esc(number || "LU-")}" autocomplete="off" autocapitalize="characters" inputmode="text" placeholder="LU-0142" required>
        <small>Está en el mensaje de WhatsApp y en tu comprobante.</small></label>
      <label class="tk-field"><span>Últimos 4 números de tu teléfono</span>
        <input name="last4" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="1234" required>
        <small>El teléfono que diste al comprar.</small></label>
      <p class="tk-error" role="alert" ${error ? "" : "hidden"}>${esc(error)}</p>
      <button class="tk-btn tk-btn-primary">Ver mi pedido</button>
      <p class="tk-hint">¿Tenés el link que te mandamos por WhatsApp? Abrilo y entrás directo.</p>
    </form>
    <a class="tk-btn tk-btn-wa tk-help" href="${waLink(SHOP_PHONE, "Hola! No encuentro el número de mi pedido, ¿me ayudan?")}" target="_blank" rel="noopener">${ic.wa}No encuentro mi número de orden</a>`;
  const f = root.querySelector("form");
  const err = f.querySelector(".tk-error");
  f.number.addEventListener("input", () => {
    const v = f.number.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (v !== f.number.value) f.number.value = v;
  });
  f.last4.addEventListener("input", () => (f.last4.value = f.last4.value.replace(/\D/g, "").slice(0, 4)));
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = f.number.value.trim();
    const l = f.last4.value.trim();
    const fail = (t, el) => { err.textContent = t; err.hidden = false; el?.focus(); };
    if (!/^LU-?\d{3,6}$/i.test(n)) return fail("Escribí el número de orden como figura en tu comprobante, por ejemplo LU-0142.", f.number);
    if (l.length !== 4) return fail("Escribí los últimos 4 números de tu teléfono.", f.last4);
    const r = S.track(n, { last4: l });
    if (!r.ok) return fail(r.error);
    open({ number: r.order.number, code: r.order.code }, { push: true });
  });
  if (!number || number === "LU-") f.number.focus({ preventScroll: true });
  else f.last4.focus({ preventScroll: true });
}

/* ---------- pedido ---------- */

function headline(o) {
  if (o.state === "entregada") return "Tu pedido ya fue entregado. ¡Que lo disfrutes!";
  if (o.state === "lista") return o.delivery === "retiro" ? "¡Tu pedido está listo! Ya podés pasar a retirarlo." : "¡Tu pedido está listo! Te escribimos para coordinar la entrega.";
  if (o.state === "pausa") return "Tu pedido está en pausa por el momento.";
  if (o.state === "cancelada") return "Este pedido fue cancelado.";
  const total = o.items.reduce((a, i) => a + i.stages.length, 0);
  const done = o.items.reduce((a, i) => a + (i.done ? i.stages.length : i.current - 1), 0);
  if (done === 0) return "Recibimos tu pedido y ya está en la lista del taller.";
  if (done / total > 0.6) return "Tu pedido está en la recta final.";
  return "Tu pedido está en fabricación.";
}

function progressOf(it) {
  const n = it.stages.length;
  const done = it.done ? n : it.current - 1;
  return { done, n, pct: Math.round((done / n) * 100) };
}

function renderOrder(o) {
  document.title = `Pedido ${o.number} · La Unión Muebles`;
  const st = STATE[o.state] || STATE.fabricacion;
  const finished = o.state === "entregada";
  const allPhotos = [];
  root.innerHTML = `
    <section class="tk-hero tk-hero-order">
      <p class="tk-eyebrow">Pedido ${esc(o.number)}</p>
      <h1>Hola ${esc(o.firstName)}</h1>
      <p class="tk-lead">${headline(o)}</p>
    </section>

    ${o.state === "pausa" ? `<div class="tk-alert warn">${ic.pause}<span>Lo pausamos a pedido o por un detalle a definir. Si tenés dudas, escribinos y te contamos.</span></div>` : ""}
    ${o.state === "cancelada" ? `<div class="tk-alert bad">${ic.info}<span>Si creés que es un error, escribinos por WhatsApp.</span></div>` : ""}

    <section class="tk-card tk-summary">
      <div class="tk-sum-row">
        <span class="tk-badge ${st.tone}">${st.label}</span>
        <span class="tk-live" data-live title="Se actualiza solo"><i></i><span data-ago>Actualizado recién</span></span>
      </div>
      <dl class="tk-facts">
        <div><dt>${ic.cal}Pedido hecho</dt><dd>${fdateLong(o.createdAt)}</dd></div>
        <div><dt>${ic.cal}${finished ? "Entregado" : "Entrega estimada"}</dt><dd>${finished ? "Listo" : o.state === "cancelada" ? "—" : o.state === "lista" ? "Listo para entregar" : o.dueDate < todayISO() ? "Estamos terminando, te confirmamos el día" : fdateLong(o.dueDate)}</dd></div>
        <div><dt>${o.delivery === "retiro" ? ic.store : ic.truck}Entrega</dt><dd>${o.delivery === "retiro" ? "Retirás en el showroom" : "Envío e instalación"}</dd></div>
      </dl>
    </section>

    <h2 class="tk-h2">${o.items.length > 1 ? `Tus ${o.items.length} muebles` : "Tu mueble"}</h2>
    <div class="tk-items">
      ${o.items.map((it) => {
        const p = progressOf(it);
        const cur = it.stages.find((s) => s.status === "current");
        return `<article class="tk-card tk-item">
          <header class="tk-item-head">
            ${it.photo ? `<button class="tk-thumb" data-zoom="${esc(it.photo)}" aria-label="Ver foto de ${esc(it.name)}"><img src="${esc(it.photo)}" alt="" loading="lazy"></button>` : `<span class="tk-thumb tk-thumb-empty">${ic.cam}</span>`}
            <div class="tk-item-info">
              <h3>${it.qty > 1 ? `${it.qty} × ` : ""}${esc(it.name)}</h3>
              <p>${[it.dims, it.color].filter(Boolean).map(esc).join(" · ") || "Medidas a definir"}</p>
              <div class="tk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${p.n}" aria-valuenow="${p.done}" aria-label="Avance"><span style="width:${p.pct}%"></span></div>
              <p class="tk-prog-txt">${it.done ? "Entregado" : `Etapa ${it.current} de ${p.n} · <b>${esc(cur?.client || cur?.name || "")}</b>`}</p>
            </div>
          </header>
          <ol class="tk-steps">
            ${it.stages.map((s, i) => {
              if (s.photo) allPhotos.push(s.photo);
              const isCur = s.status === "current" && !it.done;
              const isDone = s.status === "done" || (it.done && s.status !== "skipped");
              const cls = isDone ? "done" : s.status === "skipped" ? "skip" : isCur ? (o.state === "pausa" ? "cur paused" : "cur") : "";
              return `<li class="${cls}">
                <span class="tk-dot">${isDone ? ic.check : i + 1}</span>
                <div class="tk-step">
                  <b>${esc(s.client || s.name)}</b>
                  <span class="tk-when">${s.status === "skipped" ? "No aplica a este mueble" : isDone && s.at ? `${fdate(s.at)} · ${ftime(s.at)}` : isCur ? (o.state === "pausa" ? "En pausa" : "En curso ahora") : ""}</span>
                  ${s.photo ? `<button class="tk-step-photo" data-zoom="${esc(s.photo)}" aria-label="Ver foto del avance"><img src="${esc(s.photo)}" alt="Foto del avance: ${esc(s.client || s.name)}" loading="lazy"><span>${ic.cam}Foto del taller</span></button>` : ""}
                </div>
              </li>`;
            }).join("")}
          </ol>
        </article>`;
      }).join("")}
    </div>

    <section class="tk-card tk-help-card">
      <h2>¿Tenés alguna consulta?</h2>
      <p>Escribinos con tu número de pedido y te respondemos.</p>
      <a class="tk-btn tk-btn-wa" href="${waLink(SHOP_PHONE, `Hola! Consulto por mi pedido ${o.number}.`)}" target="_blank" rel="noopener">${ic.wa}Consultar por WhatsApp</a>
    </section>

    <p class="tk-other"><button type="button" class="tk-link" data-other>Buscar otro pedido</button></p>`;

  root.querySelector("[data-other]").onclick = () => {
    try { sessionStorage.removeItem(SAVED); } catch {}
    history.pushState(null, "", "/seguimiento");
    renderForm({});
  };
  root.querySelectorAll("[data-zoom]").forEach((b) => (b.onclick = () => lightbox(b.dataset.zoom)));
  updateAgo();
}

function updateAgo() {
  const el = root.querySelector("[data-ago]");
  if (!el) return;
  const s = (Date.now() - lastSeen) / 1000;
  el.textContent = s < 50 ? "Actualizado recién" : `Actualizado ${rel(new Date(lastSeen).toISOString())}`;
}

/* ---------- foto ampliada ---------- */

function lightbox(src) {
  const d = document.createElement("div");
  d.className = "tk-lb";
  d.setAttribute("role", "dialog");
  d.setAttribute("aria-modal", "true");
  d.setAttribute("aria-label", "Foto ampliada");
  d.innerHTML = `<img src="${esc(src)}" alt=""><button class="tk-lb-x" aria-label="Cerrar">×</button>`;
  const close = () => { d.remove(); removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  const onKey = (e) => e.key === "Escape" && close();
  d.onclick = close;
  addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  document.body.append(d);
  d.querySelector("button").focus();
}

/* ---------- en vivo ---------- */

// Cuando el taller avanza una etapa (en otra pestaña del demo, o en Supabase en el sistema real)
// la página se vuelve a dibujar sola, sin recargar.
S.subscribe(() => {
  if (!current || document.querySelector(".tk-lb")) return;
  const r = S.track(current.number, { code: current.code });
  if (!r.ok) return;
  const y = scrollY;
  lastSeen = Date.now();
  renderOrder(r.order);
  scrollTo(0, y);
});
tick = setInterval(updateAgo, 30000);
addEventListener("popstate", () => { current = null; start(); });

start();
