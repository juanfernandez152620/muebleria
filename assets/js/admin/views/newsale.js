import * as S from "../../store.js";
import { esc, ars, num, parseArs, addDays, todayISO, fdateY, phonePretty, normPhone, dimsText, norm, waLink, firstName } from "../../format.js";
import { icon, modal, toast, fileToDataURL, copyText } from "../../ui.js";

export const title = "Nueva venta";

const CITIES = ["San Miguel de Tucumán", "Tafí Viejo", "Lomas de Tafí", "Yerba Buena", "Las Talitas", "Banda del Río Salí", "Alderetes", "Tafí del Valle", "Concepción", "Famaillá", "Lules", "Monteros", "Aguilares"];
const EXTRAS = ["LED", "Vidrio", "Espejo", "Cierre suave", "Ruedas", "Cajón con llave", "Tiradores especiales"];
const MATERIALS = ["Melamina blanca", "Melamina color", "MDF color", "Melamina y MDF", "Tapizado en pana", "Tapizado en chenille"];
const RATES = { 3: 0.174, 6: 0.246, 9: 0.348, 12: 0.447 };
const STEPS = ["Cliente", "Proyecto", "Entrega y pago", "Confirmar"];

let d = null;
const fresh = () => ({
  step: 0,
  customer: null, // {id?, name, phone, dni, address, city, kind}
  newCustomer: false,
  items: [],
  dueDate: addDays(todayISO(), 21),
  delivery: "envio",
  address: "",
  total: 0,
  method: "contado",
  cuotas: 6,
  weeks: 12,
  deposit: 0,
  depositMethod: "efectivo",
  notes: "",
  done: null,
});

export function render(main, ctx) {
  if (!d || ctx.query.get("nueva") === "1") {
    d = fresh();
    if (ctx.query.get("nueva")) history.replaceState({}, "", "/admin/ventas/nueva");
  }
  const draw = () => (d.done ? success(main, ctx) : wizard(main, ctx, draw));
  draw();
  return { title, cleanup: () => { if (d?.done) d = null; } };
}

/* ---------------- Wizard ---------------- */

function wizard(main, ctx, draw) {
  main.innerHTML = `
    <div class="page-head"><div><h1>Nueva venta</h1><p>Cargá el cliente, lo que se va a fabricar y cómo paga.</p></div>
      <button class="btn btn-ghost btn-sm" data-reset>${icon("refresh")}Empezar de nuevo</button></div>
    <div class="steps"><ol>${STEPS.map((s, i) => `<li class="${i === d.step ? "on" : i < d.step ? "done" : ""}"><b>${i < d.step ? icon("check") : i + 1}</b>${s}</li>`).join("")}</ol></div>
    <div class="wiz">
      <div class="card card-pad" data-step></div>
      <aside class="card card-pad summary" aria-label="Resumen de la venta">${summary()}</aside>
    </div>`;
  main.querySelector("[data-reset]").onclick = () => { d = fresh(); draw(); };
  const el = main.querySelector("[data-step]");
  const next = () => { d.step++; draw(); scrollTo(0, 0); };
  const back = () => { d.step--; draw(); scrollTo(0, 0); };
  [stepClient, stepProject, stepPayment, stepConfirm][d.step](el, { next, back, draw, ctx });
}

function dueAmount() { return d.method === "tarjeta" ? Math.round(d.total * (1 + RATES[d.cuotas])) : d.total; }
function depositNow() { return d.method === "tarjeta" ? dueAmount() : d.deposit; }

function summary() {
  const c = d.customer;
  const weekly = d.method === "semanal" && d.total ? Math.ceil((d.total - d.deposit) / d.weeks / 100) * 100 : 0;
  return `<h2 style="margin-bottom:12px">Resumen</h2>
    <dl>
      <dt>Cliente</dt><dd>${c ? esc(c.name) : "—"}</dd>
      <dt>Muebles</dt><dd>${d.items.length ? d.items.reduce((s, i) => s + i.qty, 0) : "—"}</dd>
      <dt>Entrega</dt><dd>${fdateY(d.dueDate)}</dd>
      <dt>Monto acordado</dt><dd>${d.total ? ars(d.total) : "—"}</dd>
      ${d.method === "tarjeta" && d.total ? `<dt>Con recargo (${d.cuotas} cuotas)</dt><dd>${ars(dueAmount())}</dd>` : ""}
      ${d.method === "semanal" && d.total ? `<dt>${d.weeks} cuotas semanales</dt><dd>${ars(weekly)}</dd>` : ""}
      <dt>${d.method === "tarjeta" ? "Se cobra hoy" : "Seña hoy"}</dt><dd>${depositNow() ? ars(depositNow()) : "—"}</dd>
      <dt><b>Saldo</b></dt><dd><b>${d.total ? ars(dueAmount() - depositNow()) : "—"}</b></dd>
    </dl>
    ${d.items.length ? `<hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><div class="stack-sm small">${d.items.map((i) => `<div class="row" style="flex-wrap:nowrap">${i.photo ? `<img class="thumb" src="${esc(i.photo)}" alt="">` : `<span class="thumb"></span>`}<span>${i.qty > 1 ? `${i.qty}× ` : ""}${esc(i.name)}<br><span class="muted">${esc(dimsText(i.dims))}</span></span></div>`).join("")}</div>` : ""}`;
}

/* Paso 1: cliente */
function stepClient(el, { next, draw }) {
  const c = d.customer;
  if (c && !d.newCustomer) {
    const prev = S.orders().filter((o) => o.customerId === c.id);
    el.innerHTML = `<h2>Cliente</h2>
      <div class="card card-pad" style="margin-top:14px;background:var(--surface-2);border:0">
        <div class="spread"><div><b style="font-size:17px">${esc(c.name)}</b><div class="muted">${phonePretty(c.phone)} · ${esc(c.city)}</div><div class="muted small">${esc(c.address)}</div></div>
        <div class="row"><button class="btn btn-sm" data-edit>${icon("edit")}Editar datos</button><button class="btn btn-sm btn-ghost" data-change>Cambiar cliente</button></div></div>
      </div>
      ${prev.length ? `<p class="small muted" style="margin-top:12px">Compró antes: ${prev.map((o) => `<a href="/admin/ordenes/${o.number}" target="_blank" rel="noopener" style="color:var(--gold-ink);font-weight:600">${o.number}</a>`).join(", ")}</p>` : ""}
      <div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn btn-primary btn-lg" data-next>Siguiente: proyecto ${icon("right")}</button></div>`;
    el.querySelector("[data-change]").onclick = () => { d.customer = null; draw(); };
    el.querySelector("[data-edit]").onclick = () => { d.newCustomer = true; draw(); };
    el.querySelector("[data-next]").onclick = next;
    return;
  }
  if (d.newCustomer) {
    const v = d.customer || { name: "", phone: "", dni: "", address: "", city: "San Miguel de Tucumán", kind: "casa" };
    el.innerHTML = `<h2>${v.id ? "Datos del cliente" : "Cliente nuevo"}</h2>
      <form class="stack" style="margin-top:14px" novalidate>
        <label class="field"><span>Nombre y apellido</span><input class="input" name="name" value="${esc(v.name)}" autocomplete="off" required><small>Si es un negocio, podés sumar el nombre: “Carlos Juárez · Kiosco El Paso”.</small></label>
        <div class="grid-2">
          <label class="field"><span>WhatsApp</span><input class="input" name="phone" inputmode="tel" placeholder="381 555 1234" value="${v.phone ? esc(phonePretty(v.phone)) : ""}" required><small>Con código de área, sin 0 ni 15.</small></label>
          <label class="field"><span>DNI (opcional)</span><input class="input" name="dni" inputmode="numeric" value="${esc(v.dni || "")}"></label>
        </div>
        <div class="grid-2">
          <label class="field"><span>Dirección de entrega</span><input class="input" name="address" value="${esc(v.address)}"></label>
          <label class="field"><span>Localidad</span><input class="input" name="city" list="cities" value="${esc(v.city)}"><datalist id="cities">${CITIES.map((x) => `<option value="${x}">`).join("")}</datalist></label>
        </div>
        <div class="field"><span>Es para</span><div class="seg" role="group"><button type="button" data-kind="casa" aria-pressed="${v.kind === "casa"}">Una casa</button><button type="button" data-kind="negocio" aria-pressed="${v.kind === "negocio"}">Un negocio</button></div></div>
        <p class="alert bad" data-err hidden>${icon("alert")}<span></span></p>
        <div class="row" style="justify-content:space-between;margin-top:6px"><button type="button" class="btn btn-ghost" data-cancel>Buscar un cliente existente</button><button class="btn btn-primary btn-lg">Siguiente: proyecto ${icon("right")}</button></div>
      </form>`;
    let kind = v.kind;
    el.querySelectorAll("[data-kind]").forEach((b) => (b.onclick = () => { kind = b.dataset.kind; el.querySelectorAll("[data-kind]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
    el.querySelector("[data-cancel]").onclick = () => { d.newCustomer = false; d.customer = v.id ? v : null; draw(); };
    const f = el.querySelector("form");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = normPhone(f.phone.value);
      const errs = [];
      if (f.name.value.trim().length < 3) errs.push("el nombre");
      if (phone.length !== 13) errs.push("el WhatsApp (10 números con código de área, por ejemplo 381 555 1234)");
      if (errs.length) { const a = el.querySelector("[data-err]"); a.querySelector("span").textContent = `Revisá ${errs.join(" y ")}.`; a.hidden = false; return; }
      const dupe = !v.id && S.customers().find((x) => x.phone === phone);
      d.customer = { ...(dupe || {}), ...(v.id ? { id: v.id } : {}), name: f.name.value.trim(), phone, dni: f.dni.value.trim(), address: f.address.value.trim(), city: f.city.value.trim(), kind };
      if (dupe) toast(`Ese teléfono ya era de ${dupe.name}: actualizamos sus datos.`);
      d.address = d.customer.address;
      d.newCustomer = false;
      next();
    });
    setTimeout(() => f.name.focus(), 20);
    return;
  }
  el.innerHTML = `<h2>Cliente</h2>
    <label class="field" style="margin-top:14px"><span>Buscá por teléfono o nombre</span><input class="input" data-q placeholder="Ej: 381 555 1203 o Lucía" autocomplete="off"></label>
    <div class="pick" data-res style="margin-top:10px"></div>
    <div style="margin-top:14px"><button class="btn" data-new>${icon("plus")}Cliente nuevo</button></div>`;
  const q = el.querySelector("[data-q]"), res = el.querySelector("[data-res]");
  const search = () => {
    const list = S.findCustomers(q.value);
    res.innerHTML = q.value.trim().length < 2 ? "" : list.length
      ? list.map((c) => `<button type="button" data-c="${c.id}"><span class="avatar">${esc(c.name.split(" ").map((s) => s[0]).slice(0, 2).join(""))}</span><span class="grow"><b>${esc(c.name)}</b><br><span class="small muted">${phonePretty(c.phone)} · ${esc(c.city)}</span></span>${icon("right")}</button>`).join("")
      : `<p class="muted small">No encontramos a nadie con “${esc(q.value)}”. Cargalo como cliente nuevo.</p>`;
    res.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => { d.customer = { ...S.customer(b.dataset.c) }; d.address = d.customer.address; draw(); }));
  };
  q.addEventListener("input", search);
  el.querySelector("[data-new]").onclick = () => { d.newCustomer = true; d.customer = null; draw(); };
  setTimeout(() => q.focus(), 20);
}

/* Paso 2: proyecto */
function stepProject(el, { next, back, draw }) {
  el.innerHTML = `<h2>Proyecto</h2><p class="muted" style="margin-top:4px">Agregá cada mueble que se va a fabricar. Puede salir del catálogo o ser a medida.</p>
    <div class="stack" style="margin-top:14px">
      ${d.items.length ? d.items.map((it, i) => `<div class="card" style="display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;padding:12px;align-items:center">
        ${it.photo ? `<img class="thumb-lg" src="${esc(it.photo)}" alt="">` : `<span class="thumb-lg" style="display:grid;place-items:center">${icon("edit")}</span>`}
        <div style="min-width:0"><b>${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</b><div class="small muted">${esc(dimsText(it.dims) || "Medidas a definir")} · ${esc(it.material)} · ${esc(it.color)}</div>${it.extras.length ? `<div class="small muted">${esc(it.extras.join(", "))}</div>` : ""}${it.attachments.length ? `<div class="small muted">${it.attachments.length} ${it.attachments.length === 1 ? "foto adjunta" : "fotos adjuntas"}</div>` : ""}</div>
        <div class="row"><button class="btn btn-sm" data-edit="${i}">${icon("edit")}<span class="sr">Editar</span></button><button class="btn btn-sm btn-ghost" data-del="${i}" aria-label="Quitar">${icon("trash")}</button></div>
      </div>`).join("") : `<div class="empty" style="border:1.5px dashed var(--line-2);border-radius:14px">${icon("catalog")}<p>Todavía no agregaste muebles.</p></div>`}
      <div class="row"><button class="btn btn-primary" data-cat>${icon("catalog")}Agregar del catálogo</button><button class="btn" data-custom>${icon("plus")}Agregar mueble a medida</button></div>
      <p class="alert bad" data-err hidden>${icon("alert")}<span>Agregá al menos un mueble.</span></p>
    </div>
    <div class="row" style="justify-content:space-between;margin-top:20px"><button class="btn" data-back>${icon("left")}Volver</button><button class="btn btn-primary btn-lg" data-next>Siguiente: entrega y pago ${icon("right")}</button></div>`;
  el.querySelector("[data-back]").onclick = back;
  el.querySelector("[data-next]").onclick = () => (d.items.length ? next() : (el.querySelector("[data-err]").hidden = false));
  el.querySelector("[data-cat]").onclick = () => pickProduct((p) => itemForm({ fromProduct: p }, draw));
  el.querySelector("[data-custom]").onclick = () => itemForm({}, draw);
  el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => itemForm({ index: +b.dataset.edit }, draw)));
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { d.items.splice(+b.dataset.del, 1); draw(); }));
}

function pickProduct(onPick) {
  const rooms = S.rooms();
  const m = modal({
    title: "Elegí del catálogo",
    wide: true,
    body: `<div class="stack-sm" style="position:sticky;top:0;background:var(--surface);padding-bottom:8px;z-index:1">
      <input class="input" data-q placeholder="Buscar: cómoda, rack, caramelera…" autocomplete="off">
      <select class="select" data-room><option value="">Todos los ambientes</option>${rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select></div>
      <div class="pick" data-list></div>`,
  });
  const q = m.el.querySelector("[data-q]"), room = m.el.querySelector("[data-room]"), list = m.el.querySelector("[data-list]");
  const draw = () => {
    const nq = norm(q.value.trim());
    const items = S.products().filter((p) => (!room.value || p.room === room.value) && (!nq || nq.split(/\s+/).every((t) => norm(`${p.name} ${p.type} ${p.kind}`).includes(t)))).slice(0, 40);
    list.innerHTML = items.length ? items.map((p) => `<button type="button" data-p="${p.id}">${p.photos[0] ? `<img class="thumb" src="${esc(p.photos[0])}" alt="" loading="lazy">` : `<span class="thumb"></span>`}<span class="grow"><b>${esc(p.name)}</b><br><span class="small muted">${esc(p.type)} · ${esc(dimsText({ w: p.w, h: p.h, d: p.d, diam: p.diam }) || p.dimText)}</span></span>${icon("plus")}</button>`).join("")
      : `<p class="muted">No hay modelos con esa búsqueda. Cargalo como mueble a medida.</p>`;
    list.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { m.close(); onPick(S.product(b.dataset.p)); }));
  };
  q.addEventListener("input", draw);
  room.addEventListener("change", draw);
  draw();
}

function itemForm({ index, fromProduct }, redraw) {
  const editing = index != null ? d.items[index] : null;
  const p = fromProduct;
  const it = editing ? { ...editing, dims: { ...editing.dims }, extras: [...editing.extras], attachments: [...editing.attachments] } : {
    productId: p?.id || null,
    name: p?.name || "",
    custom: !p,
    line: p ? S.lineOfType(p.type) : "melamina",
    dims: p ? { w: p.w, h: p.h, d: p.d, diam: p.diam } : { w: null, h: null, d: null },
    material: p && S.lineOfType(p.type) === "tapiceria" ? "Tapizado en pana" : "Melamina blanca",
    color: "",
    extras: [],
    qty: 1,
    notes: "",
    attachments: [],
    photo: p?.photos[0] || "",
  };
  const m = modal({
    title: editing ? "Editar mueble" : it.custom ? "Mueble a medida" : it.name,
    wide: true,
    body: `<form class="stack" novalidate>
      ${it.custom ? `<label class="field"><span>Qué se fabrica</span><input class="input" name="name" value="${esc(it.name)}" placeholder="Ej: Placard a medida de 3 puertas corredizas" required></label>
      <div class="field"><span>Tipo de fabricación</span><div class="seg" role="group"><button type="button" data-line="melamina" aria-pressed="${it.line === "melamina"}">Melamina y MDF</button><button type="button" data-line="tapiceria" aria-pressed="${it.line === "tapiceria"}">Tapicería</button></div><small>Define las etapas que ve el taller y el cliente.</small></div>` : `<div class="row">${it.photo ? `<img class="thumb-lg" src="${esc(it.photo)}" alt="">` : ""}<div><b>${esc(it.name)}</b><div class="small muted">Medidas del catálogo precargadas. Cambialas si el cliente pide otras.</div></div></div>`}
      <div class="grid-4">
        <label class="field"><span>Ancho (cm)</span><input class="input" name="w" inputmode="numeric" value="${it.dims.w ?? ""}"></label>
        <label class="field"><span>Alto (cm)</span><input class="input" name="h" inputmode="numeric" value="${it.dims.h ?? ""}"></label>
        <label class="field"><span>Profundidad (cm)</span><input class="input" name="d" inputmode="numeric" value="${it.dims.d ?? ""}"></label>
        <label class="field"><span>Cantidad</span><input class="input" name="qty" type="number" min="1" max="50" value="${it.qty}"></label>
      </div>
      <div class="grid-2">
        <label class="field"><span>Material</span><select class="select" name="material">${MATERIALS.map((x) => `<option ${x === it.material ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        <label class="field"><span>Color o combinación</span><input class="input" name="color" value="${esc(it.color)}" placeholder="Ej: Blanco y roble Dakar"></label>
      </div>
      <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Extras</legend><div class="row">${EXTRAS.map((x) => `<label class="check"><input type="checkbox" name="extras" value="${x}" ${it.extras.includes(x) ? "checked" : ""}>${x}</label>`).join("")}</div></fieldset>
      <label class="field"><span>Notas para el taller</span><textarea class="textarea" name="notes" placeholder="Ej: tiradores negros, espejo del lado derecho, medir el hueco antes de colocar">${esc(it.notes)}</textarea></label>
      <div class="field"><span>Fotos del espacio o croquis</span>
        <div class="attach" data-att>${it.attachments.map((a, i) => `<span style="position:relative"><img src="${esc(a)}" alt="Adjunto ${i + 1}"><button type="button" class="icon-btn" data-rm="${i}" style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;background:var(--ink);color:var(--bg);border-radius:50%" aria-label="Quitar">${icon("x")}</button></span>`).join("")}
        <label class="btn" style="height:72px">${icon("upload")}Subir fotos<input type="file" accept="image/*" multiple hidden data-file></label></div>
        <small>Se achican automáticamente antes de guardarse.</small></div>
      <p class="alert bad" data-err hidden>${icon("alert")}<span></span></p>
    </form>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>${editing ? "Guardar cambios" : "Agregar a la venta"}</button>`,
  });
  const f = m.el.querySelector("form");
  m.el.querySelectorAll("[data-line]").forEach((b) => (b.onclick = () => { it.line = b.dataset.line; m.el.querySelectorAll("[data-line]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }));
  const drawAtt = () => {
    const box = m.el.querySelector("[data-att]");
    box.querySelectorAll("span").forEach((s) => s.remove());
    box.insertAdjacentHTML("afterbegin", it.attachments.map((a, i) => `<span style="position:relative"><img src="${esc(a)}" alt="Adjunto ${i + 1}"><button type="button" class="icon-btn" data-rm="${i}" style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;background:var(--ink);color:var(--bg);border-radius:50%" aria-label="Quitar">${icon("x")}</button></span>`).join(""));
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { it.attachments.splice(+b.dataset.rm, 1); drawAtt(); }));
  };
  drawAtt();
  m.el.querySelector("[data-file]").addEventListener("change", async (e) => {
    for (const file of e.target.files) {
      try { it.attachments.push(await fileToDataURL(file, 900, 0.7)); } catch (err) { toast(err.message, { tone: "bad" }); }
    }
    e.target.value = "";
    drawAtt();
  });
  m.el.querySelector("[data-ok]").onclick = () => {
    const n = (v) => (String(v).trim() ? +String(v).replace(/\D/g, "") || null : null);
    if (it.custom) it.name = f.name.value.trim();
    const err = m.el.querySelector("[data-err]");
    if (!it.name) { err.querySelector("span").textContent = "Escribí qué se va a fabricar."; err.hidden = false; return; }
    Object.assign(it, {
      dims: { ...it.dims, w: n(f.w.value), h: n(f.h.value), d: n(f.d.value) },
      qty: Math.max(1, +f.qty.value || 1),
      material: f.material.value,
      color: f.color.value.trim() || "A definir",
      extras: [...f.querySelectorAll("[name=extras]:checked")].map((x) => x.value),
      notes: f.notes.value.trim(),
    });
    if (editing) d.items[index] = it; else d.items.push(it);
    m.close();
    redraw();
  };
}

/* Paso 3: entrega y pago */
function stepPayment(el, { next, back, draw }) {
  el.innerHTML = `<h2>Entrega y pago</h2>
    <form class="stack" style="margin-top:14px" novalidate>
      <div class="grid-2">
        <label class="field"><span>Fecha prometida de entrega</span><input class="input" type="date" name="due" min="${todayISO()}" value="${d.dueDate}"></label>
        <div class="field"><span>Entrega</span><div class="seg" role="group"><button type="button" data-dl="envio" aria-pressed="${d.delivery === "envio"}">${icon("truck")} Envío e instalación</button><button type="button" data-dl="retiro" aria-pressed="${d.delivery === "retiro"}">${icon("store")} Retira en showroom</button></div></div>
      </div>
      <label class="field" data-addr ${d.delivery === "retiro" ? "hidden" : ""}><span>Dirección de entrega</span><input class="input" name="address" value="${esc(d.address)}"></label>
      <hr style="border:0;border-top:1px solid var(--line);margin:4px 0">
      <label class="field"><span>Monto total acordado</span><span class="input-money" style="max-width:280px"><span>$</span><input name="total" inputmode="numeric" value="${d.total ? num(d.total) : ""}" placeholder="0"></span><small>Lo que se acordó con el cliente por todo el proyecto, sin recargos.</small></label>
      <div class="field"><span>Forma de pago</span>
        <div class="radio-cards">
          <label><input type="radio" name="method" value="contado" ${d.method === "contado" ? "checked" : ""}><b>Contado</b><small>Seña ahora y saldo a la entrega</small></label>
          <label><input type="radio" name="method" value="tarjeta" ${d.method === "tarjeta" ? "checked" : ""}><b>Tarjeta de crédito</b><small>3, 6, 9 o 12 cuotas con recargo</small></label>
          <label><input type="radio" name="method" value="semanal" ${d.method === "semanal" ? "checked" : ""}><b>Cuotas semanales</b><small>Financiación propia, 6 a 18 semanas</small></label>
        </div></div>
      <div data-plan></div>
      <label class="field"><span>Notas de la venta (opcional)</span><textarea class="textarea" name="notes" placeholder="Ej: el cliente prefiere que lo llamen antes de ir">${esc(d.notes)}</textarea></label>
      <p class="alert bad" data-err hidden>${icon("alert")}<span></span></p>
    </form>
    <div class="row" style="justify-content:space-between;margin-top:20px"><button class="btn" data-back>${icon("left")}Volver</button><button class="btn btn-primary btn-lg" data-next>Siguiente: confirmar ${icon("right")}</button></div>`;
  const f = el.querySelector("form");
  const aside = document.querySelector(".summary");
  const refresh = () => { aside.innerHTML = summary(); drawPlan(); };
  const drawPlan = () => {
    const box = el.querySelector("[data-plan]");
    if (d.method === "tarjeta") {
      const t = dueAmount();
      box.innerHTML = `<div class="grid-2"><label class="field"><span>Cuotas</span><select class="select" name="cuotas">${Object.entries(RATES).map(([c, r]) => `<option value="${c}" ${+c === d.cuotas ? "selected" : ""}>${c} cuotas (+${String((r * 100).toFixed(1)).replace(".", ",")}%)</option>`).join("")}</select></label>
        <div class="field"><span>Se cobra con la tarjeta</span><div class="input" style="display:flex;align-items:center;background:var(--surface-2)"><b class="tnum">${d.total ? ars(t) : "—"}</b>${d.total ? `<span class="muted small" style="margin-left:8px">${d.cuotas} cuotas de ${ars(t / d.cuotas)}</span>` : ""}</div></div></div>`;
      box.querySelector("[name=cuotas]").onchange = (e) => { d.cuotas = +e.target.value; refresh(); };
      return;
    }
    const weekly = d.total ? Math.ceil((d.total - d.deposit) / d.weeks / 100) * 100 : 0;
    box.innerHTML = `<div class="grid-3">
      <label class="field"><span>${d.method === "semanal" ? "Entrega inicial (seña)" : "Seña"}</span><span class="input-money"><span>$</span><input name="deposit" inputmode="numeric" value="${d.deposit ? num(d.deposit) : ""}" placeholder="0"></span></label>
      <label class="field"><span>Medio de la seña</span><select class="select" name="dm">${["efectivo", "transferencia", "debito"].map((k) => `<option value="${k}" ${k === d.depositMethod ? "selected" : ""}>${S.METHOD_LABEL[k]}</option>`).join("")}</select></label>
      ${d.method === "semanal" ? `<label class="field"><span>Semanas</span><select class="select" name="weeks">${[6, 8, 10, 12, 14, 16, 18].map((w) => `<option ${w === d.weeks ? "selected" : ""}>${w}</option>`).join("")}</select><small>${d.total ? `${d.weeks} cuotas de ${ars(weekly)}, la primera el ${fdateY(addDays(todayISO(), 7))}` : "&nbsp;"}</small></label>` : `<div></div>`}
    </div>
    ${d.method === "semanal" ? `<p class="small muted">El cliente se lleva el mueble pagando la primera cuota.</p>` : ""}`;
    const dep = box.querySelector("[name=deposit]");
    dep.addEventListener("input", () => { d.deposit = parseArs(dep.value); dep.value = d.deposit ? num(d.deposit) : ""; aside.innerHTML = summary(); const s = box.querySelector("small"); if (s && d.method === "semanal" && d.total) s.textContent = `${d.weeks} cuotas de ${ars(Math.ceil((d.total - d.deposit) / d.weeks / 100) * 100)}, la primera el ${fdateY(addDays(todayISO(), 7))}`; });
    box.querySelector("[name=dm]").onchange = (e) => (d.depositMethod = e.target.value);
    const w = box.querySelector("[name=weeks]");
    if (w) w.onchange = () => { d.weeks = +w.value; refresh(); };
  };
  drawPlan();
  f.due.onchange = () => { d.dueDate = f.due.value; aside.innerHTML = summary(); };
  el.querySelectorAll("[data-dl]").forEach((b) => (b.onclick = () => { d.delivery = b.dataset.dl; el.querySelectorAll("[data-dl]").forEach((x) => x.setAttribute("aria-pressed", x === b)); el.querySelector("[data-addr]").hidden = d.delivery === "retiro"; }));
  f.address.oninput = () => (d.address = f.address.value);
  f.total.addEventListener("input", () => { d.total = parseArs(f.total.value); f.total.value = d.total ? num(d.total) : ""; refresh(); });
  f.querySelectorAll("[name=method]").forEach((r) => (r.onchange = () => { d.method = r.value; refresh(); }));
  f.notes.oninput = () => (d.notes = f.notes.value);
  el.querySelector("[data-back]").onclick = back;
  el.querySelector("[data-next]").onclick = () => {
    const errs = [];
    if (!d.dueDate || d.dueDate < todayISO()) errs.push("La fecha de entrega tiene que ser hoy o más adelante.");
    if (!d.total) errs.push("Escribí el monto total acordado.");
    if (d.method !== "tarjeta" && d.deposit > d.total) errs.push("La seña no puede ser mayor que el total.");
    if (d.delivery === "envio" && !d.address.trim()) errs.push("Falta la dirección de entrega.");
    if (errs.length) { const a = el.querySelector("[data-err]"); a.querySelector("span").textContent = errs.join(" "); a.hidden = false; return; }
    next();
  };
}

/* Paso 4: confirmar */
function stepConfirm(el, { back, draw, ctx }) {
  const c = d.customer;
  const weekly = d.method === "semanal" ? Math.ceil((d.total - d.deposit) / d.weeks / 100) * 100 : 0;
  const planText = d.method === "contado" ? `Contado. Seña de ${ars(d.deposit)} (${S.METHOD_LABEL[d.depositMethod]}), saldo de ${ars(d.total - d.deposit)} a la entrega.`
    : d.method === "tarjeta" ? `Tarjeta de crédito en ${d.cuotas} cuotas de ${ars(dueAmount() / d.cuotas)}. Se cobran hoy ${ars(dueAmount())}.`
    : `Entrega inicial de ${ars(d.deposit)} y ${d.weeks} cuotas semanales de ${ars(weekly)}.`;
  el.innerHTML = `<h2>Revisá con el cliente</h2>
    <div class="stack" style="margin-top:14px">
      <dl class="specs">
        <dt>Cliente</dt><dd>${esc(c.name)} · ${phonePretty(c.phone)}</dd>
        <dt>Entrega</dt><dd>${fdateY(d.dueDate)} · ${d.delivery === "retiro" ? "Retira en el showroom" : `Envío e instalación en ${esc(d.address)}, ${esc(c.city)}`}</dd>
        <dt>Total acordado</dt><dd>${ars(d.total)}</dd>
        <dt>Pago</dt><dd>${planText}</dd>
        ${d.notes ? `<dt>Notas</dt><dd>${esc(d.notes)}</dd>` : ""}
      </dl>
      <div class="stack-sm">${d.items.map((it) => `<div class="card" style="padding:12px"><b>${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</b><div class="small muted">${esc(dimsText(it.dims) || "Medidas a definir")} · ${esc(it.material)} · ${esc(it.color)}${it.extras.length ? ` · ${esc(it.extras.join(", "))}` : ""}</div>${it.notes ? `<div class="small">${esc(it.notes)}</div>` : ""}</div>`).join("")}</div>
      <div class="alert info">${icon("info")}<span>Al guardar se crea la orden, el cobro ${d.method === "tarjeta" ? "con tarjeta" : "de la seña"} entra a la caja de hoy y los muebles pasan a la etapa 1 del taller.</span></div>
    </div>
    <div class="row" style="justify-content:space-between;margin-top:20px"><button class="btn" data-back>${icon("left")}Volver</button><button class="btn btn-primary btn-lg" data-save>${icon("check")}Guardar venta</button></div>`;
  el.querySelector("[data-back]").onclick = back;
  el.querySelector("[data-save]").onclick = (e) => {
    e.currentTarget.disabled = true;
    const o = S.createOrder({
      customer: c,
      items: d.items,
      dueDate: d.dueDate,
      delivery: d.delivery,
      address: d.delivery === "retiro" ? c.address : d.address,
      total: d.total,
      plan: d.method === "tarjeta" ? { method: "tarjeta", cuotas: d.cuotas, rate: RATES[d.cuotas] } : d.method === "semanal" ? { method: "semanal", weeks: d.weeks } : { method: "contado" },
      deposit: d.method === "tarjeta" ? { amount: dueAmount(), method: "credito" } : { amount: d.deposit, method: d.depositMethod },
      notes: d.notes,
    }, ctx.user.id);
    d.done = o.number;
    draw();
    scrollTo(0, 0);
  };
}

/* ---------------- Éxito ---------------- */
function success(main, ctx) {
  const o = S.order(d.done);
  const link = S.trackingUrl(o);
  const name = firstName(o.customer.name.split("·")[0]);
  const msg = `¡Hola ${name}! Gracias por tu compra en La Unión. Tu número de orden es ${o.number}. Podés ver cómo avanza la fabricación acá: ${link}`;
  main.innerHTML = `<div class="card success">
    <span class="big-check">${icon("check")}</span>
    <h1>Venta registrada</h1>
    <p class="muted">Número de orden</p>
    <div class="num">${esc(o.number)}</div>
    <div class="linkbox"><code>${esc(link)}</code><button class="btn btn-sm" data-copy>${icon("copy")}Copiar link</button></div>
    <div class="row" style="justify-content:center">
      <a class="btn btn-primary btn-lg" href="${waLink(o.customer.phone, msg)}" target="_blank" rel="noopener" data-wa>${icon("chat")}Enviar por WhatsApp</a>
      <a class="btn btn-lg" href="/admin/ordenes/${o.number}/imprimir" target="_blank" rel="noopener">${icon("print")}Imprimir orden de trabajo</a>
    </div>
    <details style="max-width:560px;text-align:left"><summary class="small muted" style="cursor:pointer">Ver el mensaje que se envía</summary><p class="small" style="margin-top:6px;background:var(--surface-2);padding:10px 12px;border-radius:10px">${esc(msg)}</p></details>
    <div class="row" style="justify-content:center;margin-top:8px"><a class="btn btn-ghost" href="/admin/ordenes/${o.number}">Ver la orden</a><button class="btn btn-ghost" data-again>${icon("plus")}Otra venta</button></div>
  </div>`;
  main.querySelector("[data-copy]").onclick = () => copyText(link, "Link copiado");
  main.querySelector("[data-wa]").addEventListener("click", () => setTimeout(() => S.markOrderNotif(o.number, "inicio"), 300));
  main.querySelector("[data-again]").onclick = () => { d = fresh(); ctx.rerender(); };
}
