import * as S from "../../store.js";
import { esc, ars, fdate, dueLabel, norm } from "../../format.js";
import { icon, stateBadge, orderProgress } from "../../ui.js";

export const title = "Órdenes";
export const live = true;

const FILTERS = [
  ["abiertas", "Abiertas"],
  ["mias", "Mías"],
  ["atrasadas", "Atrasadas"],
  ["listas", "Listas"],
  ["saldo", "Con saldo"],
  ["pausa", "En pausa"],
  ["entregadas", "Entregadas"],
  ["todas", "Todas"],
];

function apply(list, f, u) {
  switch (f) {
    case "abiertas": return list.filter((o) => !["entregada", "cancelada"].includes(o.state));
    case "fabricacion": return list.filter((o) => o.state === "fabricacion");
    case "mias": return list.filter((o) => o.sellerId === u.id && o.state !== "cancelada");
    case "atrasadas": return list.filter((o) => o.late);
    case "listas": return list.filter((o) => o.state === "lista");
    case "saldo": return list.filter((o) => o.balance > 0 && o.state !== "cancelada");
    case "pausa": return list.filter((o) => o.state === "pausa");
    case "entregadas": return list.filter((o) => o.state === "entregada");
    case "canceladas": return list.filter((o) => o.state === "cancelada");
    default: return list;
  }
}

export function render(main, ctx) {
  const u = ctx.user;
  const q = ctx.query.get("q") || "";
  const etapa = +ctx.query.get("etapa") || 0;
  const filtro = ctx.query.get("filtro") || (u.role === "vendedor" ? "mias" : "abiertas");
  const vendedor = ctx.query.get("vendedor") || "";
  const all = S.orders();

  let list = q ? all : apply(all, filtro, u);
  if (q) {
    const nq = norm(q), digits = q.replace(/\D/g, "");
    list = list.filter((o) => norm(o.number).includes(nq) || norm(o.customer.name).includes(nq) || (digits.length >= 3 && o.customer.phone.includes(digits)) || o.items.some((i) => norm(i.name).includes(nq)));
  }
  if (etapa) list = list.filter((o) => !["entregada", "cancelada", "pausa"].includes(o.state) && o.items.some((i) => i.current === etapa));
  if (vendedor) list = list.filter((o) => o.sellerId === vendedor);
  list.sort((a, b) => (a.state === "entregada") - (b.state === "entregada") || a.dueDate.localeCompare(b.dueDate));

  const sellers = S.users().filter((x) => x.role !== "taller");
  const setParam = (k, v) => {
    const p = new URLSearchParams(location.search);
    v ? p.set(k, v) : p.delete(k);
    if (k === "filtro") { p.delete("q"); p.delete("etapa"); }
    ctx.go(`/admin/ordenes${p.toString() ? "?" + p : ""}`, { replace: true });
  };
  const stageNames = S.stagesOf("melamina");

  main.innerHTML = `
    <div class="page-head"><div><h1>Órdenes</h1><p>${list.length} ${list.length === 1 ? "orden" : "órdenes"}${q ? ` para “${esc(q)}”` : ""}${etapa ? ` en la etapa ${etapa} (${esc(stageNames[etapa - 1].short)})` : ""}</p></div>
      <a class="btn btn-primary" href="/admin/ventas/nueva">${icon("plus")}Nueva venta</a></div>
    <div class="stack-sm" style="margin-bottom:14px">
      <div class="chips" role="group" aria-label="Filtrar órdenes">${FILTERS.map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${!q && filtro === k}">${l}<span class="n">${apply(all, k, u).length}</span></button>`).join("")}</div>
      <div class="row">
        ${q ? `<span class="badge gold plain">Búsqueda: ${esc(q)} <button class="icon-btn" style="width:20px;height:20px" data-clear="q" aria-label="Quitar búsqueda">${icon("x")}</button></span>` : ""}
        ${etapa ? `<span class="badge gold plain">Etapa ${etapa}: ${esc(stageNames[etapa - 1].short)} <button class="icon-btn" style="width:20px;height:20px" data-clear="etapa" aria-label="Quitar etapa">${icon("x")}</button></span>` : ""}
        ${u.role === "admin" ? `<label class="row small"><span class="muted">Vendedor</span><select class="select" style="height:32px;width:auto" data-seller><option value="">Todos</option>${sellers.map((s) => `<option value="${s.id}" ${s.id === vendedor ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>` : ""}
      </div>
    </div>
    <div class="card">
      ${list.length ? `<div class="table-wrap"><table class="table cards">
        <thead><tr><th>Orden</th><th>Cliente</th><th>Muebles</th><th>Vendedor</th><th>Entrega</th><th style="min-width:150px">Etapa</th><th class="num">Saldo</th></tr></thead>
        <tbody>${list.map((o) => {
          const due = dueLabel(o.dueDate);
          return `<tr class="click ${o.late ? "late" : ""}" data-href="/admin/ordenes/${o.number}">
            <td><a href="/admin/ordenes/${o.number}" class="cell-title" style="text-decoration:none">${esc(o.number)}</a><span class="cell-sub">${fdate(o.createdAt)}</span></td>
            <td class="right"><span class="cell-title">${esc(o.customer.name)}</span><span class="cell-sub">${esc(o.customer.city)}</span></td>
            <td class="full"><span class="small">${esc(o.items.map((i) => (i.qty > 1 ? `${i.qty}× ` : "") + i.name).join(" · "))}</span></td>
            <td class="hide-m"><span class="small">${esc(o.seller?.name || "")}</span></td>
            <td data-label="Entrega"><span class="nowrap">${fdate(o.dueDate)}</span>${["entregada", "cancelada"].includes(o.state) ? "" : `<span class="cell-sub" style="${due.tone === "bad" ? "color:var(--bad);font-weight:700" : ""}">${due.text}</span>`}</td>
            <td class="full">${["pausa", "cancelada", "lista"].includes(o.state) ? stateBadge(o.state) + " " : ""}${o.state === "cancelada" ? "" : orderProgress(o)}</td>
            <td class="num right" data-label="Saldo">${o.state === "cancelada" ? "—" : o.balance > 0 ? ars(o.balance) : `<span class="badge ok">Pagada</span>`}</td>
          </tr>`;
        }).join("")}</tbody></table></div>`
        : `<div class="empty">${icon("search")}<p>No hay órdenes con este filtro.</p></div>`}
    </div>`;

  main.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => setParam("filtro", b.dataset.f)));
  main.querySelectorAll("[data-clear]").forEach((b) => (b.onclick = () => setParam(b.dataset.clear, "")));
  const sel = main.querySelector("[data-seller]");
  if (sel) sel.onchange = () => setParam("vendedor", sel.value);
  main.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a")) ctx.go(tr.dataset.href); }));
  return { title };
}
