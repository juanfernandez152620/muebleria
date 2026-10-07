import * as S from "../../store.js";
import { esc, ars, num, parseArs, todayISO, fdateLong, ftime, fdatetime } from "../../format.js";
import { icon, modal, toast } from "../../ui.js";

export const title = "Caja";
export const live = true;

const BILLS = [20000, 10000, 2000, 1000, 500, 200, 100];

export function render(main, ctx) {
  const u = ctx.user;
  const date = todayISO();
  const s = S.cashSummary(date);
  const head = `<div class="page-head"><div><h1>Caja de hoy</h1><p class="cap1">${fdateLong(date)}</p></div>
    <div class="row"><a class="btn" href="/admin/caja/historial">${icon("calendar")}Historial de cierres</a></div></div>`;

  if (!s.day) {
    const hist = S.cashHistory().find((h) => h.day?.closedAt);
    main.innerHTML = `${head}
      <section class="card card-pad stack" style="max-width:520px">
        <h2>Abrir la caja</h2>
        <p class="muted">Contá el efectivo con el que arranca el día (el cambio que quedó de ayer).</p>
        <label class="field"><span>Efectivo inicial</span><span class="input-money"><span>$</span><input name="o" inputmode="numeric" value="${num(hist?.day?.opening || 30000)}"></span></label>
        ${s.pays.length ? `<div class="alert info">${icon("info")}<span>Ya hay ${s.pays.length} ${s.pays.length === 1 ? "cobro registrado" : "cobros registrados"} hoy por ${ars(s.total)}. Se suman a esta caja.</span></div>` : ""}
        <button class="btn btn-primary btn-lg" data-open>Abrir la caja</button>
      </section>`;
    const inp = main.querySelector("[name=o]");
    inp.addEventListener("input", () => { const v = parseArs(inp.value); inp.value = v ? num(v) : ""; });
    main.querySelector("[data-open]").onclick = () => { S.openCash(parseArs(inp.value), u.id); toast("Caja abierta"); };
    return { title };
  }

  const closed = !!s.day.closedAt;
  const moves = [
    ...s.pays.map((p) => ({ at: p.at, kind: "in", text: p.concept, sub: `${p.orderNumber} · ${S.order(p.orderNumber)?.customer.name || ""}`, order: p.orderNumber, method: S.METHOD_LABEL[p.method], amount: p.amount, by: p.by })),
    ...s.day.expenses.map((e) => ({ at: e.at, kind: "out", text: e.reason, sub: "Egreso", method: "Efectivo", amount: -e.amount, by: e.by })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const diff = closed ? s.day.counted - s.day.expected : 0;

  main.innerHTML = `${head}
    ${closed ? `<div class="alert ${diff === 0 ? "ok" : Math.abs(diff) < 5000 ? "warn" : "bad"}" style="margin-bottom:16px">${icon(diff === 0 ? "check" : "alert")}<div class="grow"><b>Caja cerrada a las ${ftime(s.day.closedAt)} por ${esc(S.user(s.day.closedBy)?.name || "")}.</b> ${diff === 0 ? "El efectivo cuadró." : `Diferencia de ${ars(diff)}.`} ${s.day.note ? esc(s.day.note) : ""}<div class="small">Los cobros que se registren ahora entran en la caja de mañana.</div></div>
      <div class="row"><a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText(s))}">${icon("chat")}Compartir</a><button class="btn btn-sm" data-print>${icon("print")}PDF</button></div></div>` : ""}
    <div class="cash-top">
      <div class="kpi"><span>Efectivo inicial</span><b class="tnum">${ars(s.opening)}</b><small>abrió ${esc(S.user(s.day.openedBy)?.name.split(" ")[0] || "")} a las ${ftime(s.day.openedAt)}</small></div>
      ${Object.entries(S.METHOD_LABEL).map(([k, l]) => `<div class="kpi"><span>${l}</span><b class="tnum">${ars(s.by[k])}</b><small>${s.pays.filter((p) => p.method === k).length} cobros</small></div>`).join("")}
    </div>
    <div class="spread" style="margin:16px 0 12px">
      <p><b class="tnum">${ars(s.total)}</b> <span class="muted">cobrados hoy${s.cuotas ? ` · ${ars(s.cuotas)} en cuotas semanales` : ""} · egresos ${ars(s.expenses)} · efectivo esperado en caja <b class="tnum" style="color:var(--ink)">${ars(s.expected)}</b></span></p>
      ${closed ? "" : `<div class="row"><button class="btn" data-exp>${icon("plus")}Registrar egreso</button><button class="btn btn-primary" data-close>${icon("check")}Cerrar caja</button></div>`}
    </div>
    <section class="card">
      <div class="card-head"><h2>Movimientos</h2><span class="small muted">${moves.length}</span></div>
      ${moves.length ? `<div class="table-wrap"><table class="table cards"><thead><tr><th>Hora</th><th>Concepto</th><th>Medio</th><th>Registró</th><th class="num">Monto</th></tr></thead><tbody>
        ${moves.map((mv) => `<tr ${mv.order ? `class="click" data-o="${mv.order}"` : ""}><td class="tnum">${ftime(mv.at)}</td><td class="right"><span class="cell-title">${esc(mv.text)}</span><span class="cell-sub">${esc(mv.sub)}</span></td><td data-label="Medio">${mv.method}</td><td class="hide-m small">${esc(S.user(mv.by)?.name || "")}</td><td class="num right"><b style="${mv.amount < 0 ? "color:var(--bad)" : ""}">${ars(mv.amount)}</b></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty"><p>Todavía no hay movimientos hoy.</p></div>`}
    </section>`;

  main.querySelectorAll("tr[data-o]").forEach((tr) => tr.addEventListener("click", () => ctx.go(`/admin/ordenes/${tr.dataset.o}?tab=pagos`)));
  const exp = main.querySelector("[data-exp]");
  if (exp) exp.onclick = () => expenseModal(u);
  const cl = main.querySelector("[data-close]");
  if (cl) cl.onclick = () => closeWizard(u);
  const pr = main.querySelector("[data-print]");
  if (pr) pr.onclick = () => printSummary(s);
  return { title };
}

function shareText(s) {
  const d = s.day;
  return [
    `Cierre de caja La Unión · ${s.date.split("-").reverse().join("/")}`,
    `Efectivo inicial: ${ars(s.opening)}`,
    ...Object.entries(S.METHOD_LABEL).map(([k, l]) => `${l}: ${ars(s.by[k])}`),
    `Egresos: ${ars(s.expenses)}`,
    `Total cobrado: ${ars(s.total)}`,
    `Efectivo esperado: ${ars(d.expected)} · Contado: ${ars(d.counted)} · Diferencia: ${ars(d.counted - d.expected)}`,
    d.note ? `Nota: ${d.note}` : "",
  ].filter(Boolean).join("\n");
}

function printSummary(s) {
  const w = window.open("", "_blank");
  if (!w) return toast("El navegador bloqueó la ventana. Permití ventanas emergentes para descargar el PDF.");
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cierre de caja ${s.date}</title><style>body{font:14px/1.5 system-ui,sans-serif;padding:32px;color:#111;max-width:640px}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}</style></head><body>
    <h1>Cierre de caja · La Unión</h1><p>${fdateLong(s.date)} · Cerró ${esc(S.user(s.day.closedBy)?.name || "")} a las ${ftime(s.day.closedAt)}</p>
    <table>${shareText(s).split("\n").slice(1).map((l) => { const [a, ...b] = l.split(": "); return `<tr><td>${esc(a)}</td><td>${esc(b.join(": "))}</td></tr>`; }).join("")}</table>
    <h2 style="font-size:16px;margin-top:24px">Movimientos</h2><table>${s.pays.map((p) => `<tr><td>${ftime(p.at)} · ${esc(p.orderNumber)} · ${esc(p.concept)} (${S.METHOD_LABEL[p.method]})</td><td>${ars(p.amount)}</td></tr>`).join("")}${s.day.expenses.map((e) => `<tr><td>${ftime(e.at)} · Egreso: ${esc(e.reason)}</td><td>${ars(-e.amount)}</td></tr>`).join("")}</table>
    <script>window.print()<\/script></body></html>`);
  w.document.close();
}

function expenseModal(u) {
  const m = modal({
    title: "Registrar egreso",
    body: `<form class="stack" novalidate><label class="field"><span>Monto en efectivo</span><span class="input-money"><span>$</span><input name="a" inputmode="numeric"></span></label>
      <label class="field"><span>Motivo</span><input class="input" name="r" placeholder="Ej: flete, tornillos, retiro del dueño"></label><p class="field err" hidden></p></form>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Registrar egreso</button>`,
  });
  const f = m.el.querySelector("form");
  f.a.addEventListener("input", () => { const v = parseArs(f.a.value); f.a.value = v ? num(v) : ""; });
  m.el.querySelector("[data-ok]").onclick = () => {
    const a = parseArs(f.a.value), r = f.r.value.trim(), err = f.querySelector(".err");
    if (!a || !r) { err.textContent = "Completá el monto y el motivo."; err.hidden = false; return; }
    S.addExpense(a, r, u.id);
    m.close();
    toast("Egreso registrado");
  };
}

function closeWizard(u) {
  const s = S.cashSummary(todayISO());
  const counts = Object.fromEntries(BILLS.map((b) => [b, 0]));
  let mode = "bills", direct = 0, step = 1, note = "";
  const counted = () => (mode === "bills" ? BILLS.reduce((t, b) => t + b * counts[b], 0) : direct);
  const m = modal({ title: "Cerrar la caja", wide: true });
  const draw = () => {
    const c = counted(), diff = c - s.expected;
    const tone = diff === 0 ? "ok" : Math.abs(diff) < 5000 ? "warn" : "bad";
    m.el.querySelector(".modal-foot")?.remove();
    if (step === 1) {
      m.body.innerHTML = `<div class="stack"><p class="muted">Paso 1 de 3 · Contá el efectivo que hay en la caja.</p>
        <div class="seg" role="group"><button type="button" data-mode="bills" aria-pressed="${mode === "bills"}">Por billete</button><button type="button" data-mode="total" aria-pressed="${mode === "total"}">Total directo</button></div>
        ${mode === "bills" ? `<div class="bills">${BILLS.map((b) => `<label><span class="tnum"><b>${ars(b)}</b></span><input class="input tnum" type="number" min="0" inputmode="numeric" data-b="${b}" value="${counts[b] || ""}" placeholder="0" aria-label="Cantidad de billetes de ${b}"><span class="sub" data-sub="${b}">${ars(b * counts[b])}</span></label>`).join("")}</div>`
          : `<label class="field" style="max-width:280px"><span>Efectivo contado</span><span class="input-money"><span>$</span><input data-direct inputmode="numeric" value="${direct ? num(direct) : ""}"></span></label>`}
        <div class="spread" style="border-top:1px solid var(--line);padding-top:12px"><span class="muted">Total contado</span><b class="tnum" style="font-size:22px" data-total>${ars(c)}</b></div></div>`;
      m.body.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; draw(); }));
      m.body.querySelectorAll("[data-b]").forEach((inp) => inp.addEventListener("input", () => {
        counts[inp.dataset.b] = Math.max(0, +inp.value || 0);
        m.body.querySelector(`[data-sub="${inp.dataset.b}"]`).textContent = ars(inp.dataset.b * counts[inp.dataset.b]);
        m.body.querySelector("[data-total]").textContent = ars(counted());
      }));
      const di = m.body.querySelector("[data-direct]");
      if (di) di.addEventListener("input", () => { direct = parseArs(di.value); di.value = direct ? num(direct) : ""; m.body.querySelector("[data-total]").textContent = ars(direct); });
      foot(`<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-n>Siguiente</button>`);
    } else if (step === 2) {
      m.body.innerHTML = `<div class="stack"><p class="muted">Paso 2 de 3 · Comparamos con lo que debería haber.</p>
        <div class="compare">
          <div><span>Efectivo inicial</span><span>${ars(s.opening)}</span></div>
          <div><span>+ Cobros en efectivo</span><span>${ars(s.by.efectivo)}</span></div>
          <div><span>− Egresos</span><span>${ars(s.expenses)}</span></div>
          <div class="total"><span>Efectivo esperado</span><span>${ars(s.expected)}</span></div>
          <div class="total"><span>Efectivo contado</span><span>${ars(c)}</span></div>
        </div>
        <div class="diff ${tone}">${diff === 0 ? "Cuadra perfecto" : diff > 0 ? `Sobran ${ars(diff)}` : `Faltan ${ars(-diff)}`}</div>
        ${diff !== 0 ? `<label class="field"><span>¿Por qué hay diferencia? (obligatorio)</span><textarea class="textarea" data-note rows="2">${esc(note)}</textarea></label>` : ""}
        <p class="small muted">Transferencias, débito y crédito no se cuentan: se controlan en el banco.</p><p class="field err" hidden></p></div>`;
      const nt = m.body.querySelector("[data-note]");
      if (nt) nt.addEventListener("input", () => (note = nt.value));
      foot(`<button class="btn" data-b2>Volver</button><button class="btn btn-primary" data-n>Siguiente</button>`);
    } else {
      m.body.innerHTML = `<div class="stack"><p class="muted">Paso 3 de 3 · Confirmá el cierre.</p>
        <div class="compare"><div><span>Total cobrado hoy</span><b>${ars(s.total)}</b></div>${Object.entries(S.METHOD_LABEL).map(([k, l]) => `<div><span>${l}</span><span>${ars(s.by[k])}</span></div>`).join("")}<div><span>Egresos</span><span>${ars(s.expenses)}</span></div><div class="total"><span>Diferencia de efectivo</span><span>${ars(diff)}</span></div></div>
        <div class="alert info">${icon("info")}<span>Después del cierre los movimientos de hoy no se pueden editar. Una corrección se carga como ajuste mañana.</span></div></div>`;
      foot(`<button class="btn" data-b2>Volver</button><button class="btn btn-primary" data-ok>${icon("check")}Cerrar la caja</button>`);
    }
  };
  const foot = (html) => {
    m.el.querySelector(".modal").insertAdjacentHTML("beforeend", `<div class="modal-foot">${html}</div>`);
    const f = m.el.querySelector(".modal-foot");
    f.querySelector("[data-n]")?.addEventListener("click", () => {
      if (step === 2 && counted() !== s.expected && !note.trim()) { const e = m.body.querySelector(".err"); e.textContent = "Escribí el motivo de la diferencia."; e.hidden = false; return; }
      step++; draw();
    });
    f.querySelector("[data-b2]")?.addEventListener("click", () => { step--; draw(); });
    f.querySelector("[data-ok]")?.addEventListener("click", () => { S.closeCash(counted(), note.trim(), u.id); m.close(); toast("Caja cerrada"); });
  };
  draw();
}
