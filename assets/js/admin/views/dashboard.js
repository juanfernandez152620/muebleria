import * as S from "../../store.js";
import { esc, ars, fdate, rel, todayISO, dueLabel, firstName } from "../../format.js";
import { icon, stateBadge, orderProgress } from "../../ui.js";

export const title = "Inicio";
export const live = true;

function notifList(u) {
  const list = S.pendingNotifs(u);
  if (!list.length) return "";
  return `<section class="card">
    <div class="card-head"><h2>Avisos para mandar por WhatsApp</h2><span class="badge bad plain">${list.length}</span></div>
    <ul class="list">${list.map((n) => `<li><div class="li">
      ${icon("chat", "tone-warn")}
      <div class="grow"><b>${esc(n.order.number)} · ${esc(n.order.customer.name)}</b><div class="small muted">${S.NOTIF_LABEL[n.kind]} · ${rel(n.createdAt)}</div></div>
      <a class="btn btn-sm btn-primary" href="${S.notifLink(n)}" target="_blank" rel="noopener" data-sent="${n.id}">${icon("chat")}Enviar</a>
    </div></li>`).join("")}</ul></section>`;
}

function bindNotifs(main) {
  main.querySelectorAll("[data-sent]").forEach((a) => a.addEventListener("click", () => setTimeout(() => S.markNotifSent(a.dataset.sent), 300)));
}

function orderRow(o) {
  const due = dueLabel(o.dueDate);
  return `<li><a class="li" href="/admin/ordenes/${o.number}">
    <div class="grow"><b>${esc(o.number)}</b> <span class="muted">· ${esc(o.customer.name)}</span><div class="small muted">${esc(o.items.map((i) => i.name).join(", "))}</div></div>
    <div style="width:140px">${orderProgress(o)}</div>
    <span class="small nowrap ${o.late ? "" : "muted"}" style="${o.late ? "color:var(--bad);font-weight:700" : ""}">${o.state === "entregada" ? "Entregada" : due.text}</span>
  </a></li>`;
}

export function render(main, ctx) {
  const u = ctx.user;
  return u.role === "admin" ? admin(main, u) : seller(main, u);
}

function admin(main, u) {
  const all = S.orders();
  const open = all.filter((o) => !["entregada", "cancelada"].includes(o.state));
  const inProd = all.filter((o) => o.state === "fabricacion");
  const late = open.filter((o) => o.late);
  const ready = all.filter((o) => o.state === "lista");
  const today = todayISO();
  const cash = S.cashSummary(today);
  const cashState = !cash.day ? "Sin abrir" : cash.day.closedAt ? "Cerrada" : "Abierta";

  // Tablero: muebles por etapa (melamina y tapicería juntos)
  const labels = S.stagesOf("melamina").map((s) => s.short);
  const counts = labels.map(() => 0);
  open.filter((o) => o.state !== "pausa").forEach((o) => o.items.forEach((it) => { if (!it.done) counts[it.current - 1] += it.qty; }));

  const attention = [];
  late.forEach((o) => attention.push({ o, tone: "bad", icon: "clock", text: `${dueLabel(o.dueDate).text} · entrega prometida el ${fdate(o.dueDate)}` }));
  open.filter((o) => o.problem).forEach((o) => attention.push({ o, tone: "warn", icon: "alert", text: `Problema en el taller: ${o.problem.text}` }));
  open.filter((o) => o.stalled && !o.late).forEach((o) => attention.push({ o, tone: "warn", icon: "pause", text: `Sin avances ${rel(o.lastMove)}` }));
  ready.filter((o) => o.balance > 0).forEach((o) => attention.push({ o, tone: "warn", icon: "cash", text: `Lista para entregar con saldo de ${ars(o.balance)}` }));
  open.filter((o) => o.overdueCuotas).forEach((o) => attention.push({ o, tone: "warn", icon: "calendar", text: `${o.overdueCuotas} ${o.overdueCuotas === 1 ? "cuota semanal vencida" : "cuotas semanales vencidas"}` }));
  open.filter((o) => o.state === "pausa").forEach((o) => attention.push({ o, tone: "warn", icon: "pause", text: `En pausa: ${o.statusReason}` }));

  main.innerHTML = `<div class="dash">
    <div class="page-head"><div><h1>Hola, ${esc(firstName(u.name))}</h1><p>${new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p></div>
      <a class="btn btn-primary" href="/admin/ventas/nueva">${icon("plus")}Nueva venta</a></div>

    <div class="kpis">
      <a class="kpi" href="/admin/ordenes?filtro=fabricacion"><span>En fabricación</span><b>${inProd.length}</b><small>órdenes activas en el taller</small></a>
      <a class="kpi ${late.length ? "bad" : ""}" href="/admin/ordenes?filtro=atrasadas"><span>Atrasadas</span><b>${late.length}</b><small>pasaron la fecha prometida</small></a>
      <a class="kpi ${ready.length ? "ok" : ""}" href="/admin/ordenes?filtro=listas"><span>Listas para entregar</span><b>${ready.length}</b><small>coordinar entrega o retiro</small></a>
      <a class="kpi" href="/admin/caja"><span>Caja de hoy · ${cashState}</span><b class="tnum">${ars(cash.total)}</b><small>cobrado hoy, en ${cash.pays.length} ${cash.pays.length === 1 ? "cobro" : "cobros"}</small></a>
    </div>

    <section class="card">
      <div class="card-head"><h2>Muebles en cada etapa</h2><a class="btn btn-ghost btn-sm" href="/admin/taller">Ver taller ${icon("right")}</a></div>
      <div class="board">${labels.map((l, i) => `<a href="/admin/ordenes?etapa=${i + 1}"><span class="k">ETAPA ${i + 1}</span><span class="n">${counts[i]}</span><span class="s">${esc(l)}</span></a>`).join("")}</div>
    </section>

    ${notifList(u)}

    <div class="dash-2">
      <section class="card">
        <div class="card-head"><h2>Requieren atención</h2><span class="muted small">${attention.length} ${attention.length === 1 ? "orden" : "órdenes"}</span></div>
        ${attention.length ? `<ul class="list">${attention.map((a) => `<li><a class="li" href="/admin/ordenes/${a.o.number}">${icon(a.icon, "tone-" + a.tone)}<div class="grow"><b>${esc(a.o.number)} · ${esc(a.o.customer.name)}</b><div class="small muted">${esc(a.text)}</div></div>${icon("right", "faint")}</a></li>`).join("")}</ul>`
          : `<div class="empty">${icon("check")}<p>Todo al día. No hay órdenes atrasadas ni frenadas.</p></div>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>Últimas ventas</h2><a class="btn btn-ghost btn-sm" href="/admin/ordenes">Ver todas</a></div>
        <ul class="list">${all.slice(0, 7).map((o) => `<li><a class="li" href="/admin/ordenes/${o.number}"><div class="grow"><b>${esc(o.number)}</b> <span class="muted">· ${esc(o.customer.name)}</span><div class="small muted">${fdate(o.createdAt)} · ${esc(o.seller?.name || "")}</div></div><span class="tnum nowrap">${ars(o.total)}</span></a></li>`).join("")}</ul>
      </section>
    </div>
  </div>`;
  bindNotifs(main);
  return { title };
}

function seller(main, u) {
  const mine = S.orders().filter((o) => o.sellerId === u.id);
  const open = mine.filter((o) => !["entregada", "cancelada"].includes(o.state));
  const today = todayISO();
  const cobrado = S.cashSummary(today).pays.filter((p) => p.by === u.id);
  const total = cobrado.reduce((s, p) => s + p.amount, 0);
  main.innerHTML = `<div class="dash">
    <div class="page-head"><div><h1>Hola, ${esc(firstName(u.name))}</h1><p>${open.length} ${open.length === 1 ? "orden abierta" : "órdenes abiertas"} a tu nombre</p></div></div>
    <section class="card hero-sale">
      <div><h2>Registrar una venta</h2><p class="muted">Cargá el cliente, el proyecto y la seña. Al guardar te damos el link de seguimiento para mandarle.</p></div>
      <a class="btn btn-primary btn-lg" href="/admin/ventas/nueva">${icon("plus")}Nueva venta</a>
    </section>
    <div class="kpis">
      <div class="kpi"><span>Cobraste hoy</span><b class="tnum">${ars(total)}</b><small>${cobrado.length} ${cobrado.length === 1 ? "cobro" : "cobros"}</small></div>
      <a class="kpi" href="/admin/ordenes?filtro=mias"><span>Tus órdenes abiertas</span><b>${open.length}</b><small>en fabricación o listas</small></a>
      <a class="kpi ${open.filter((o) => o.late).length ? "bad" : ""}" href="/admin/ordenes?filtro=mias"><span>Atrasadas</span><b>${open.filter((o) => o.late).length}</b><small>pasaron la fecha prometida</small></a>
      <a class="kpi ${open.filter((o) => o.state === "lista").length ? "ok" : ""}" href="/admin/ordenes?filtro=listas"><span>Listas para entregar</span><b>${open.filter((o) => o.state === "lista").length}</b><small>avisale al cliente</small></a>
    </div>
    ${notifList(u)}
    <section class="card">
      <div class="card-head"><h2>Tus órdenes abiertas</h2><a class="btn btn-ghost btn-sm" href="/admin/ordenes?filtro=mias">Ver todas</a></div>
      ${open.length ? `<ul class="list">${open.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(orderRow).join("")}</ul>` : `<div class="empty"><p>No tenés órdenes abiertas.</p></div>`}
    </section>
  </div>`;
  bindNotifs(main);
  return { title };
}
