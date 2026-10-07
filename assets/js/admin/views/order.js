import * as S from "../../store.js";
import { esc, ars, fdate, fdateY, fdatetime, dueLabel, phonePretty, waLink, firstName, dimsText, parseArs, num, normPhone, todayISO } from "../../format.js";
import { icon, stateBadge, progressBar, modal, toast, confirmDialog, copyText } from "../../ui.js";

export const live = true;

const TABS = [["proyecto", "Proyecto"], ["fabricacion", "Fabricación"], ["pagos", "Pagos"], ["historial", "Historial"]];
const PLAN_LABEL = (p) =>
  p.method === "contado" ? "Contado (seña y saldo)" : p.method === "tarjeta" ? `Tarjeta en ${p.cuotas} cuotas (+${String((p.rate * 100).toFixed(1)).replace(".", ",")}%)` : `Cuotas semanales: ${p.weeks} de ${ars(p.weekly)}`;

export function render(main, ctx) {
  const o = S.order(ctx.params[0]);
  if (!o) {
    main.innerHTML = `<div class="empty card">${icon("search")}<h2>No existe la orden ${esc(ctx.params[0])}</h2><a class="btn" href="/admin/ordenes">Ver órdenes</a></div>`;
    return { title: "Orden no encontrada" };
  }
  const u = ctx.user;
  const tab = ctx.query.get("tab") || "proyecto";
  const isAdmin = u.role === "admin";
  const own = o.sellerId === u.id;
  const untouched = o.items.every((i) => i.current === 1 && !i.log.length);
  const canEdit = (isAdmin || (own && untouched)) && !["cancelada", "entregada"].includes(o.state);
  const canPay = (isAdmin || own) && o.state !== "cancelada";
  const due = dueLabel(o.dueDate);
  const link = S.trackingUrl(o);
  const name = firstName(o.customer.name.split("·")[0]);
  const waIntro = waLink(o.customer.phone, `¡Hola ${name}! Tu número de orden en La Unión es ${o.number}. Podés ver cómo avanza la fabricación acá: ${link}`);

  main.innerHTML = `
    <div class="crumb"><a href="/admin/ordenes">Órdenes</a>${icon("right")}<span>${esc(o.number)}</span></div>
    <div class="o-head">
      <div class="spread">
        <div class="row"><h1 class="tnum">${esc(o.number)}</h1>${stateBadge(o.state)}${o.late ? `<span class="badge bad">${due.text}</span>` : ""}</div>
        <div class="row">
          <a class="btn" href="${waIntro}" target="_blank" rel="noopener" data-intro>${icon("chat")}Enviar link</a>
          <button class="btn" data-copy>${icon("link")}Copiar link</button>
          <a class="btn" href="/admin/ordenes/${o.number}/imprimir" target="_blank" rel="noopener">${icon("print")}Orden de trabajo</a>
          ${isAdmin || own ? `<button class="btn btn-ghost" data-more aria-label="Más acciones">${icon("more")}</button>` : ""}
        </div>
      </div>
      ${o.state === "pausa" ? `<div class="alert warn">${icon("pause")}<div><b>Orden en pausa.</b> ${esc(o.statusReason)} El cliente ve «En pausa» en su seguimiento, sin el motivo.</div></div>` : ""}
      ${o.state === "cancelada" ? `<div class="alert bad">${icon("ban")}<div><b>Orden cancelada.</b> ${esc(o.statusReason)}</div></div>` : ""}
      ${o.problem ? `<div class="alert warn">${icon("alert")}<div><b>Problema reportado por el taller:</b> ${esc(o.problem.text)} <span class="muted small">· ${esc(S.user(o.problem.by)?.name || "")}, ${fdatetime(o.problem.at)}</span></div></div>` : ""}
      <div class="o-meta">
        <div><span>Cliente</span><b>${esc(o.customer.name)}</b><a class="small" style="color:var(--gold-ink);font-weight:600" href="${waLink(o.customer.phone, `Hola ${name}, te escribimos de La Unión por tu pedido ${o.number}.`)}" target="_blank" rel="noopener">${phonePretty(o.customer.phone)}</a></div>
        <div><span>Entrega prometida</span><b>${fdateY(o.dueDate)}</b><span class="small" style="${o.late ? "color:var(--bad);font-weight:700" : ""}">${o.state === "entregada" ? "Entregada" : due.text} · ${o.delivery === "retiro" ? "Retira en showroom" : "Envío e instalación"}</span></div>
        <div><span>Vendedor</span><b>${esc(o.seller?.name || "—")}</b><span class="small muted">Venta del ${fdate(o.createdAt)}</span></div>
        <div><span>Saldo</span><b class="tnum" style="${o.balance > 0 ? "" : "color:var(--ok)"}">${o.balance > 0 ? ars(o.balance) : "Pagada"}</b><span class="small muted">de ${ars(o.due)}</span></div>
      </div>
    </div>
    <nav class="tabs" aria-label="Secciones de la orden">${TABS.map(([k, l]) => `<a href="/admin/ordenes/${o.number}?tab=${k}" ${tab === k ? 'aria-current="page"' : ""}>${l}${k === "pagos" && o.overdueCuotas ? `<span class="n" style="background:var(--bad-soft);color:var(--bad)">${o.overdueCuotas}</span>` : ""}</a>`).join("")}</nav>
    <div data-tab></div>`;

  const body = main.querySelector("[data-tab]");
  if (tab === "proyecto") renderProject(body, o, canEdit, u);
  else if (tab === "fabricacion") renderProduction(body, o);
  else if (tab === "pagos") renderPayments(body, o, canPay, u);
  else renderLog(body, o);

  main.querySelector("[data-copy]").onclick = () => copyText(link, "Link de seguimiento copiado");
  main.querySelector("[data-intro]").addEventListener("click", () => setTimeout(() => S.markOrderNotif(o.number, "inicio"), 300));
  const more = main.querySelector("[data-more]");
  if (more) more.onclick = () => moreActions(o, u, ctx);
  return { title: o.number };
}

function renderProject(el, o, canEdit, u) {
  el.innerHTML = `<div class="stack">
    <section class="card">
      <div class="card-head"><h2>Cliente</h2>${canEdit ? `<button class="btn btn-sm" data-edit-client>${icon("edit")}Editar</button>` : ""}</div>
      <div class="card-body"><dl class="specs">
        <dt>Nombre</dt><dd>${esc(o.customer.name)}</dd>
        <dt>WhatsApp</dt><dd>${phonePretty(o.customer.phone)}</dd>
        ${o.customer.dni ? `<dt>DNI</dt><dd>${esc(o.customer.dni)}</dd>` : ""}
        <dt>Dirección</dt><dd>${esc(o.address || o.customer.address)} · ${esc(o.customer.city)}</dd>
        <dt>Tipo</dt><dd>${o.customer.kind === "negocio" ? "Negocio" : "Casa"}</dd>
      </dl></div>
    </section>
    ${o.items.map((it) => `<section class="card">
      <div class="item-card">
        ${it.photo ? `<img class="cover" src="${esc(it.photo)}" alt="" data-zoom="${esc(it.photo)}">` : `<div class="cover" style="width:96px;height:120px;border-radius:10px;background:var(--surface-2)"></div>`}
        <div class="stack-sm" style="min-width:0">
          <div class="spread"><div><h2>${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</h2><span class="small muted">${it.custom ? "Mueble a medida" : "Del catálogo"} · ${S.LINE_LABEL?.[it.line] || (it.line === "tapiceria" ? "Tapicería" : "Melamina y MDF")}</span></div>
            ${canEdit ? `<button class="btn btn-sm" data-edit-item="${it.id}">${icon("edit")}Editar</button>` : ""}</div>
          <dl class="specs">
            <dt>Medidas</dt><dd>${esc(dimsText(it.dims)) || "A definir"}</dd>
            <dt>Material</dt><dd>${esc(it.material)}</dd>
            <dt>Color</dt><dd>${esc(it.color)}</dd>
            ${it.extras.length ? `<dt>Extras</dt><dd>${esc(it.extras.join(", "))}</dd>` : ""}
            ${it.notes ? `<dt>Notas para el taller</dt><dd>${esc(it.notes)}</dd>` : ""}
          </dl>
          ${it.attachments.length ? `<div><span class="label">Fotos y croquis del cliente</span><div class="attach" style="margin-top:6px">${it.attachments.map((a) => `<img src="${esc(a)}" alt="Adjunto" data-zoom="${esc(a)}">`).join("")}</div></div>` : ""}
          <div style="max-width:320px">${progressBar(it, o.state === "pausa")}<span class="prog-label">${it.done ? "Entregado" : `Etapa ${it.current} de ${it.stages.length}: ${esc(it.stage.name)}`}</span></div>
        </div>
      </div>
    </section>`).join("")}
    ${o.notes ? `<section class="card card-pad"><span class="label">Notas de la venta</span><p style="margin-top:4px">${esc(o.notes)}</p></section>` : ""}
  </div>`;
  const ec = el.querySelector("[data-edit-client]");
  if (ec) ec.onclick = () => editClient(o, u);
  el.querySelectorAll("[data-edit-item]").forEach((b) => (b.onclick = () => editItem(o, o.items.find((i) => i.id === b.dataset.editItem), u)));
}

function renderProduction(el, o) {
  el.innerHTML = `<div class="stack">${o.items.map((it) => `<section class="card">
    <div class="card-head"><div><h2>${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</h2><span class="small muted">${it.line === "tapiceria" ? "Recorrido de tapicería" : "Recorrido de melamina y MDF"}</span></div>
      ${!it.done && o.state !== "cancelada" ? `<a class="btn btn-sm" href="/admin/taller/${o.number}/${it.id}">${icon("tool")}Abrir en el taller</a>` : ""}</div>
    <div class="card-body"><ol class="tl">${it.stages.map((s, i) => {
      const n = i + 1;
      const entry = [...it.log].reverse().find((l) => l.stage === n);
      const cls = n < it.current ? (entry?.action === "skip" ? "skip" : "done") : n === it.current ? "cur" : "";
      return `<li class="${cls}"><span class="dot">${cls === "done" ? icon("check") : n}</span><div>
        <b>${esc(s.name)}</b>
        <div class="meta">${entry ? `${entry.action === "skip" ? "Salteada" : "Terminada"} el ${fdatetime(entry.at)} · ${esc(S.user(entry.by)?.name || "")}` : n === it.current ? (o.state === "pausa" ? "En pausa" : "En curso") : "Pendiente"}</div>
        ${entry?.note ? `<div class="small">${esc(entry.note)}</div>` : ""}
        ${entry?.photo ? `<div class="ph"><img src="${esc(entry.photo)}" alt="Foto del avance" data-zoom="${esc(entry.photo)}"></div>` : ""}
      </div></li>`;
    }).join("")}</ol></div>
  </section>`).join("")}</div>`;
}

function renderPayments(el, o, canPay, u) {
  const pays = S.paymentsOf(o.number);
  el.innerHTML = `<div class="stack">
    <div class="money-sum">
      <div class="kpi"><span>Monto acordado</span><b class="tnum">${ars(o.total)}</b><small>${o.plan.method === "tarjeta" ? `Con recargo: ${ars(o.due)}` : "&nbsp;"}</small></div>
      <div class="kpi"><span>Cobrado</span><b class="tnum">${ars(o.paid)}</b><small>${pays.length} ${pays.length === 1 ? "cobro" : "cobros"}</small></div>
      <div class="kpi ${o.balance > 0 ? "" : "ok"}"><span>Saldo</span><b class="tnum">${o.balance > 0 ? ars(o.balance) : "Pagada"}</b><small>&nbsp;</small></div>
      <div class="kpi"><span>Forma de pago</span><b style="font-size:16px;line-height:1.3">${PLAN_LABEL(o.plan)}</b></div>
    </div>
    ${canPay && o.balance > 0 ? `<div><button class="btn btn-primary" data-pay>${icon("plus")}Registrar cobro</button></div>` : ""}
    ${o.schedule.length ? `<section class="card"><div class="card-head"><h2>Cuotas semanales</h2><span class="small muted">${o.schedule.filter((c) => c.status === "pagada").length} de ${o.schedule.length} pagas</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Cuota</th><th>Vence</th><th class="num">Monto</th><th>Estado</th></tr></thead><tbody>
      ${o.schedule.map((c) => `<tr><td>${c.n} de ${o.schedule.length}</td><td>${fdate(c.due)}</td><td class="num">${ars(c.amount)}</td><td>${c.status === "pagada" ? '<span class="badge ok">Pagada</span>' : c.status === "vencida" ? '<span class="badge bad">Vencida</span>' : c.status === "hoy" ? '<span class="badge warn">Vence hoy</span>' : '<span class="badge">Pendiente</span>'}</td></tr>`).join("")}
      </tbody></table></div></section>` : ""}
    <section class="card"><div class="card-head"><h2>Cobros registrados</h2></div>
      ${pays.length ? `<div class="table-wrap"><table class="table cards"><thead><tr><th>Fecha</th><th>Concepto</th><th>Medio</th><th>Cobró</th><th class="num">Monto</th></tr></thead><tbody>
      ${pays.map((p) => `<tr><td>${fdatetime(p.at)}</td><td class="right">${esc(p.concept)}</td><td data-label="Medio">${S.METHOD_LABEL[p.method]}</td><td class="hide-m">${esc(S.user(p.by)?.name || "")}</td><td class="num right"><b>${ars(p.amount)}</b></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty"><p>Todavía no hay cobros.</p></div>`}
    </section>
  </div>`;
  const b = el.querySelector("[data-pay]");
  if (b) b.onclick = () => payModal(o, u);
}

function renderLog(el, o) {
  el.innerHTML = `<section class="card"><ul class="list">${[...o.log].reverse().map((l) => `<li><div class="li"><span class="avatar" style="width:28px;height:28px;font-size:11px">${esc((S.user(l.by)?.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join(""))}</span><div class="grow"><div>${esc(l.text)}</div><div class="small muted">${fdatetime(l.at)} · ${esc(S.user(l.by)?.name || "Sistema")}</div></div></div></li>`).join("")}</ul></section>`;
}

/* ---------- Modales ---------- */

export function payModal(o, u, onDone) {
  const nextCuota = o.schedule.find((c) => c.status !== "pagada");
  const suggested = o.plan.method === "semanal" && nextCuota ? Math.min(nextCuota.amount, o.balance) : o.balance;
  const concept = o.plan.method === "semanal" && nextCuota ? `Cuota ${nextCuota.n} de ${o.schedule.length}` : "Saldo";
  const m = modal({
    title: `Registrar cobro · ${o.number}`,
    body: `<form class="stack" novalidate>
      <p class="muted">Saldo pendiente: <b class="tnum">${ars(o.balance)}</b></p>
      <div class="grid-2">
        <label class="field"><span>Monto</span><span class="input-money"><span>$</span><input name="amount" inputmode="numeric" value="${num(suggested)}" required></span></label>
        <label class="field"><span>Medio de pago</span><select class="select" name="method">${Object.entries(S.METHOD_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
      </div>
      <label class="field"><span>Concepto</span><input class="input" name="concept" value="${esc(concept)}"></label>
      <p class="field err" hidden></p>
      ${S.cashDay(todayISO())?.closedAt ? `<div class="alert info">${icon("info")}<span>La caja de hoy ya está cerrada: este cobro entra en la caja de mañana.</span></div>` : ""}
    </form>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Registrar cobro</button>`,
  });
  const f = m.el.querySelector("form");
  f.amount.addEventListener("input", () => { const v = parseArs(f.amount.value); f.amount.value = v ? num(v) : ""; });
  const save = () => {
    const amount = parseArs(f.amount.value);
    const err = f.querySelector(".err");
    if (!amount) { err.textContent = "Escribí el monto que cobraste."; err.hidden = false; return; }
    if (amount > o.balance) { err.textContent = `El monto supera el saldo (${ars(o.balance)}).`; err.hidden = false; return; }
    const c = f.concept.value.trim() || "Pago a cuenta";
    S.addPayment(o.number, { amount, method: f.method.value, concept: c, kind: /^cuota/i.test(c) ? "cuota" : /saldo/i.test(c) ? "saldo" : "pago" }, u.id);
    m.close();
    toast(`Cobro de ${ars(amount)} registrado`);
    onDone && onDone();
  };
  m.el.querySelector("[data-ok]").onclick = save;
  f.addEventListener("submit", (e) => { e.preventDefault(); save(); });
}

function editClient(o, u) {
  const c = o.customer;
  const m = modal({
    title: "Editar cliente",
    body: `<form class="stack" novalidate>
      <label class="field"><span>Nombre y apellido</span><input class="input" name="name" value="${esc(c.name)}" required></label>
      <div class="grid-2"><label class="field"><span>WhatsApp</span><input class="input" name="phone" inputmode="tel" value="${esc(phonePretty(c.phone))}" required></label>
      <label class="field"><span>DNI (opcional)</span><input class="input" name="dni" inputmode="numeric" value="${esc(c.dni || "")}"></label></div>
      <div class="grid-2"><label class="field"><span>Dirección</span><input class="input" name="address" value="${esc(c.address)}"></label>
      <label class="field"><span>Localidad</span><input class="input" name="city" value="${esc(c.city)}"></label></div>
      <p class="field err" hidden></p></form>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>`,
  });
  const f = m.el.querySelector("form");
  m.el.querySelector("[data-ok]").onclick = () => {
    const phone = normPhone(f.phone.value);
    if (!f.name.value.trim() || phone.length < 12) { const e = f.querySelector(".err"); e.textContent = "Revisá el nombre y el teléfono (con código de área)."; e.hidden = false; return; }
    S.saveCustomer({ id: c.id, name: f.name.value.trim(), phone, dni: f.dni.value.trim(), address: f.address.value.trim(), city: f.city.value.trim() }, u.id);
    m.close();
    toast("Cliente actualizado");
  };
}

function editItem(o, it, u) {
  const m = modal({
    title: `Editar · ${it.name}`,
    body: `<form class="stack" novalidate>
      <div class="grid-3">
        <label class="field"><span>Ancho (cm)</span><input class="input" name="w" inputmode="numeric" value="${it.dims.w ?? ""}"></label>
        <label class="field"><span>Alto (cm)</span><input class="input" name="h" inputmode="numeric" value="${it.dims.h ?? ""}"></label>
        <label class="field"><span>Profundidad (cm)</span><input class="input" name="d" inputmode="numeric" value="${it.dims.d ?? ""}"></label>
      </div>
      <div class="grid-2"><label class="field"><span>Material</span><input class="input" name="material" value="${esc(it.material)}"></label>
      <label class="field"><span>Color o combinación</span><input class="input" name="color" value="${esc(it.color)}"></label></div>
      <label class="field"><span>Notas para el taller</span><textarea class="textarea" name="notes">${esc(it.notes)}</textarea></label>
    </form>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>`,
  });
  const f = m.el.querySelector("form");
  m.el.querySelector("[data-ok]").onclick = () => {
    const n = (v) => (v.trim() ? +v.replace(/\D/g, "") : null);
    S.updateItem(o.number, it.id, { dims: { ...it.dims, w: n(f.w.value), h: n(f.h.value), d: n(f.d.value) }, material: f.material.value.trim(), color: f.color.value.trim(), notes: f.notes.value.trim() }, u.id);
    m.close();
    toast("Proyecto actualizado");
  };
}

function moreActions(o, u, ctx) {
  const isAdmin = u.role === "admin";
  const acts = [];
  if (!["cancelada", "entregada"].includes(o.state)) acts.push(["due", "calendar", "Cambiar fecha de entrega"]);
  if (o.state === "pausa") acts.push(["resume", "play", "Reanudar la fabricación"]);
  else if (!["cancelada", "entregada"].includes(o.state)) acts.push(["pause", "pause", "Poner en pausa"]);
  if (o.problem && isAdmin) acts.push(["solve", "check", "Marcar problema como resuelto"]);
  if (isAdmin && o.state === "entregada") acts.push(["works", "image", "Publicar fotos en Trabajos realizados"]);
  if (isAdmin && !["cancelada", "entregada"].includes(o.state)) acts.push(["cancel", "ban", "Cancelar la orden"]);
  const m = modal({ title: `Acciones · ${o.number}`, body: `<div class="pick">${acts.map(([k, i, l]) => `<button type="button" data-a="${k}">${icon(i)}<span>${l}</span></button>`).join("")}</div>` });
  m.el.querySelectorAll("[data-a]").forEach((b) =>
    (b.onclick = async () => {
      m.close();
      const a = b.dataset.a;
      if (a === "due") return dueModal(o, u);
      if (a === "pause" || a === "cancel") return reasonModal(o, u, a);
      if (a === "resume") { S.setStatus(o.number, "activa", "", u.id); toast("Orden reanudada"); }
      if (a === "solve") { const it = o.items.find((i) => i.problem && !i.problem.resolvedAt); S.resolveProblem(o.number, it.id, u.id); toast("Problema marcado como resuelto"); }
      if (a === "works") { const r = S.addWorkFromOrder(o.number); toast(r.ok ? "Fotos agregadas. Revisalas en Catálogo › Trabajos realizados." : r.error); }
    })
  );
}

function dueModal(o, u) {
  const m = modal({
    title: "Cambiar fecha de entrega",
    body: `<label class="field"><span>Nueva fecha prometida</span><input class="input" type="date" name="d" value="${o.dueDate}"></label><p class="muted small" style="margin-top:8px">El cliente ve la nueva fecha en su seguimiento.</p>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>`,
  });
  m.el.querySelector("[data-ok]").onclick = () => {
    const v = m.el.querySelector("[name=d]").value;
    if (!v) return;
    S.updateOrderMeta(o.number, { dueDate: v }, u.id);
    m.close();
    toast("Fecha actualizada");
  };
}

function reasonModal(o, u, kind) {
  const cancel = kind === "cancel";
  const m = modal({
    title: cancel ? `Cancelar ${o.number}` : `Poner en pausa ${o.number}`,
    body: `<label class="field"><span>Motivo ${cancel ? "(obligatorio)" : ""}</span><textarea class="textarea" name="r" placeholder="${cancel ? "Ej: el cliente desistió de la compra" : "Ej: la clienta está eligiendo otro color"}"></textarea><small>${cancel ? "Los cobros ya registrados quedan en la caja. Si hay que devolver plata, cargalo como egreso." : "El taller deja de ver la orden como urgente y el cliente ve «En pausa»."}</small></label><p class="field err" hidden></p>`,
    foot: `<button class="btn" data-x>Volver</button><button class="btn ${cancel ? "btn-dark" : "btn-primary"}" data-ok>${cancel ? "Cancelar la orden" : "Poner en pausa"}</button>`,
  });
  m.el.querySelector("[data-ok]").onclick = () => {
    const r = m.el.querySelector("[name=r]").value.trim();
    if (cancel && !r) { const e = m.el.querySelector(".err"); e.textContent = "Escribí el motivo de la cancelación."; e.hidden = false; return; }
    S.setStatus(o.number, cancel ? "cancelada" : "pausa", r, u.id);
    m.close();
    toast(cancel ? "Orden cancelada" : "Orden en pausa");
  };
}
