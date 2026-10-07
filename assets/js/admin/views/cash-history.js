import * as S from "../../store.js";
import { esc, ars, fdate, ftime } from "../../format.js";
import { icon } from "../../ui.js";

export const title = "Historial de caja";
export const live = true;

export function render(main, ctx) {
  const all = S.cashHistory();
  const months = [...new Set(all.map((h) => h.date.slice(0, 7)))];
  const month = ctx.query.get("mes") || months[0];
  const list = all.filter((h) => h.date.startsWith(month));
  const tot = list.reduce((a, h) => ({ total: a.total + h.total, exp: a.exp + h.expenses, diff: a.diff + (h.day?.closedAt ? h.day.counted - h.day.expected : 0) }), { total: 0, exp: 0, diff: 0 });
  const monthName = (m) => new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(m + "-15T12:00:00")).replace(/^./, (c) => c.toUpperCase());

  main.innerHTML = `
    <div class="crumb"><a href="/admin/caja">Caja</a>${icon("right")}<span>Historial</span></div>
    <div class="page-head"><div><h1>Historial de cierres</h1><p>${list.length} días · ${ars(tot.total)} cobrados · diferencias acumuladas ${ars(tot.diff)}</p></div>
      <select class="select" style="width:auto" data-m aria-label="Mes">${months.map((m) => `<option value="${m}" ${m === month ? "selected" : ""}>${monthName(m)}</option>`).join("")}</select></div>
    <section class="card"><div class="table-wrap"><table class="table cards">
      <thead><tr><th>Día</th><th class="num">Efectivo</th><th class="num">Transferencia</th><th class="num">Débito</th><th class="num">Crédito</th><th class="num">Egresos</th><th class="num">Total</th><th class="num">Diferencia</th><th>Cerró</th></tr></thead>
      <tbody>${list.map((h) => {
        const closed = h.day?.closedAt;
        const diff = closed ? h.day.counted - h.day.expected : null;
        return `<tr>
          <td class="full"><span class="cell-title" style="text-transform:capitalize">${new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(h.date + "T12:00:00"))}</span>${closed ? "" : `<span class="cell-sub">${h.day ? "Abierta" : "Sin abrir"}</span>`}</td>
          <td class="num" data-label="Efectivo">${ars(h.by.efectivo)}</td><td class="num hide-m">${ars(h.by.transferencia)}</td><td class="num hide-m">${ars(h.by.debito)}</td><td class="num hide-m">${ars(h.by.credito)}</td>
          <td class="num" data-label="Egresos">${ars(h.expenses)}</td>
          <td class="num" data-label="Total"><b>${ars(h.total)}</b></td>
          <td class="num right" data-label="Diferencia">${diff == null ? "—" : diff === 0 ? `<span class="badge ok">Cuadra</span>` : `<span class="badge ${Math.abs(diff) < 5000 ? "warn" : "bad"}" title="${esc(h.day.note)}">${ars(diff)}</span>`}</td>
          <td class="hide-m small">${closed ? `${esc(S.user(h.day.closedBy)?.name.split(" ")[0] || "")} · ${ftime(h.day.closedAt)}` : ""}</td>
        </tr>`;
      }).join("")}</tbody></table></div></section>`;
  main.querySelector("[data-m]").onchange = (e) => ctx.go(`/admin/caja/historial?mes=${e.target.value}`, { replace: true });
  return { title };
}
