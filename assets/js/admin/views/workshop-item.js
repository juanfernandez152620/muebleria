import * as S from "../../store.js";
import { esc, dueLabel, dimsText, firstName, fdatetime, fdate } from "../../format.js";
import { icon, modal, toast, confirmDialog, fileToDataURL } from "../../ui.js";

export const live = true;

export function render(main, ctx) {
  const o = S.order(ctx.params[0]);
  const it = o?.items.find((i) => i.id === ctx.params[1]);
  if (!o || !it) {
    main.innerHTML = `<div class="empty card">${icon("search")}<h2>No encontramos ese mueble</h2><p>Puede que el QR sea de una orden vieja.</p><a class="btn" href="/admin/taller">Volver al taller</a></div>`;
    return { title: "No encontrado" };
  }
  const u = ctx.user;
  const due = dueLabel(o.dueDate);
  const paused = o.state === "pausa";
  const cancelled = o.state === "cancelada";
  const last = it.current === it.stages.length;
  const next = it.done ? null : last ? null : it.stages[it.current];
  const problem = it.problem && !it.problem.resolvedAt ? it.problem : null;

  main.innerHTML = `
    <div class="crumb"><a href="/admin/taller">Taller</a>${icon("right")}<span>${esc(o.number)}</span></div>
    <div class="page-head" style="margin-bottom:14px"><div><h1>${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</h1><p>${esc(o.number)} · ${esc(firstName(o.customer.name))} · ${esc(o.customer.city)}</p></div>
      <span class="badge ${due.tone === "bad" ? "bad" : due.tone === "warn" ? "warn" : ""}" style="font-size:13px;padding:5px 10px">${it.done ? "Entregado" : `${due.text} · ${fdate(o.dueDate)}`}</span></div>
    ${paused ? `<div class="alert warn" style="margin-bottom:14px">${icon("pause")}<span><b>Orden en pausa.</b> No avances hasta que la reanuden.</span></div>` : ""}
    ${cancelled ? `<div class="alert bad" style="margin-bottom:14px">${icon("ban")}<span><b>Orden cancelada.</b> No hay que fabricarla.</span></div>` : ""}
    ${problem ? `<div class="alert warn" style="margin-bottom:14px">${icon("alert")}<div class="grow"><b>Problema reportado:</b> ${esc(problem.text)}<div class="small muted">${esc(S.user(problem.by)?.name || "")}, ${fdatetime(problem.at)}</div></div><button class="btn btn-sm" data-solve>Ya se resolvió</button></div>` : ""}
    <div class="ws-item">
      <div class="stack">
        <section class="card card-pad stack">
          <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${it.photo ? `<img src="${esc(it.photo)}" alt="" data-zoom="${esc(it.photo)}" style="width:110px;height:136px;object-fit:cover;border-radius:12px;flex:none">` : ""}
          <dl class="specs" style="font-size:15.5px">
            <dt>Medidas</dt><dd><b>${esc(dimsText(it.dims) || "A definir")}</b></dd>
            <dt>Material</dt><dd>${esc(it.material)}</dd>
            <dt>Color</dt><dd>${esc(it.color)}</dd>
            ${it.extras.length ? `<dt>Extras</dt><dd>${esc(it.extras.join(", "))}</dd>` : ""}
            <dt>Entrega</dt><dd>${o.delivery === "retiro" ? "Retira en showroom" : "Envío e instalación"}</dd>
          </dl></div>
          ${it.notes ? `<div class="alert info">${icon("info")}<span><b>Notas del vendedor:</b> ${esc(it.notes)}</span></div>` : ""}
          ${it.attachments.length ? `<div><span class="label">Fotos y croquis</span><div class="attach" style="margin-top:6px">${it.attachments.map((a) => `<img src="${esc(a)}" alt="Adjunto" data-zoom="${esc(a)}" style="width:96px;height:96px">`).join("")}</div></div>` : ""}
        </section>
        ${o.items.length > 1 ? `<section class="card card-pad"><span class="label">Otros muebles de esta orden</span><div class="pick" style="margin-top:8px">${o.items.filter((x) => x.id !== it.id).map((x) => `<a class="btn" style="justify-content:flex-start;height:auto;padding:8px 10px" href="/admin/taller/${o.number}/${x.id}"><img class="thumb" src="${esc(x.photo)}" alt=""><span class="grow" style="text-align:left;white-space:normal"><b>${esc(x.name)}</b><br><span class="small muted">${x.done ? "Entregado" : `${x.current}. ${esc(x.stage.name)}`}</span></span></a>`).join("")}</div></section>` : ""}
      </div>
      <div class="stack">
        <ol class="ws-stages">${it.stages.map((s, i) => {
          const n = i + 1;
          const entry = [...it.log].reverse().find((l) => l.stage === n);
          const cls = n < it.current ? (entry?.action === "skip" ? "skip" : "done") : n === it.current ? "cur" : "";
          return `<li class="${cls}"><span class="dot">${cls === "done" ? icon("check") : n}</span><span>${esc(s.name)}</span>${entry ? `<span class="when">${entry.action === "skip" ? "Salteada" : fdate(entry.at)}${entry.photo ? " · foto" : ""}</span>` : n === it.current && !it.done ? `<span class="when" style="color:var(--gold-ink);font-weight:700">Ahora</span>` : ""}</li>`;
        }).join("")}</ol>
        ${it.done || cancelled ? "" : `<div class="ws-action">
          <button class="btn btn-primary btn-xl btn-block" data-advance ${paused ? "disabled" : ""}>${icon("check")}${last ? "Marcar como entregado" : `Pasar a: ${esc(next.name)}`}</button>
          <div class="row" style="justify-content:space-between">
            <button class="btn btn-lg grow" data-problem>${icon("alert")}Reportar un problema</button>
            ${!last ? `<button class="btn btn-lg btn-ghost" data-skip ${paused ? "disabled" : ""}>${icon("skip")}Saltear etapa</button>` : ""}
          </div>
        </div>`}
      </div>
    </div>`;

  const adv = main.querySelector("[data-advance]");
  if (adv) adv.onclick = () => advanceModal(o, it, u);
  const sk = main.querySelector("[data-skip]");
  if (sk) sk.onclick = async () => {
    if (await confirmDialog({ title: "Saltear etapa", text: `¿«${esc(it.stage.name)}» no aplica a este mueble? Queda marcada como salteada y pasa a «${esc(next.name)}».`, ok: "Saltear" })) {
      S.skipStage(o.number, it.id, u.id);
      toast("Etapa salteada");
    }
  };
  const pr = main.querySelector("[data-problem]");
  if (pr) pr.onclick = () => problemModal(o, it, u);
  const so = main.querySelector("[data-solve]");
  if (so) so.onclick = () => { S.resolveProblem(o.number, it.id, u.id); toast("Problema marcado como resuelto"); };
  return { title: `${o.number} · ${it.name}` };
}

function advanceModal(o, it, u) {
  const last = it.current === it.stages.length;
  const next = last ? null : it.stages[it.current];
  let photo = "";
  const m = modal({
    title: last ? "¿Ya se entregó?" : `¿Terminó «${it.stage.name}»?`,
    body: `<div class="stack">
      <label class="photo-pick" data-pick>${icon("camera")}<span>Sacar una foto del avance (opcional)</span><small class="muted" style="font-weight:500">El cliente la ve en su seguimiento.</small><input type="file" accept="image/*" capture="environment" hidden></label>
      <label class="field"><span>Nota interna (opcional)</span><textarea class="textarea" name="note" rows="2" placeholder="Ej: falta una manija, se coloca en la entrega"></textarea></label>
    </div>`,
    foot: `<button class="btn btn-lg" data-x>Todavía no</button><button class="btn btn-primary btn-lg" data-ok>${icon("check")}${last ? "Sí, se entregó" : `Sí, pasar a ${esc(next.short)}`}</button>`,
  });
  const pick = m.el.querySelector("[data-pick]");
  async function onPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    pick.innerHTML = `<span class="muted">Procesando foto…</span>`;
    try {
      photo = await fileToDataURL(file, 1000, 0.7);
      pick.innerHTML = `<img src="${photo}" alt="Foto del avance"><span class="small muted">Tocá para cambiarla</span><input type="file" accept="image/*" capture="environment" hidden>`;
    } catch (err) {
      pick.innerHTML = `${icon("camera")}<span>Sacar una foto del avance (opcional)</span><input type="file" accept="image/*" capture="environment" hidden>`;
      toast(err.message, { tone: "bad" });
    }
    pick.querySelector("input").addEventListener("change", onPick);
  }
  pick.querySelector("input").addEventListener("change", onPick);
  m.el.querySelector("[data-ok]").onclick = () => {
    const note = m.el.querySelector("[name=note]").value.trim();
    const token = S.advanceItem(o.number, it.id, { photo, note }, u.id);
    m.close();
    if (!token) return;
    const label = last ? "Marcado como entregado" : `Pasó a ${next.name}`;
    toast(label, { action: "Deshacer", timeout: 10000, onAction: () => (S.undoAdvance(token) ? toast("Cambio deshecho") : toast("Ya no se puede deshacer", { tone: "bad" })) });
  };
}

function problemModal(o, it, u) {
  const m = modal({
    title: "Reportar un problema",
    body: `<div class="stack"><div class="chips" data-q>${["Falta material", "Medida que no cierra", "Pieza dañada", "Falta definición del cliente"].map((x) => `<button type="button" class="chip">${x}</button>`).join("")}</div>
      <label class="field"><span>Qué pasó</span><textarea class="textarea" name="t" rows="3" placeholder="Contá en una línea qué falta o qué está mal"></textarea></label>
      <p class="small muted">Le avisamos al administrador y la orden queda marcada.</p></div>`,
    foot: `<button class="btn btn-lg" data-x>Cancelar</button><button class="btn btn-primary btn-lg" data-ok>Avisar</button>`,
  });
  const t = m.el.querySelector("[name=t]");
  m.el.querySelectorAll("[data-q] .chip").forEach((c) => (c.onclick = () => { t.value = c.textContent + ": "; t.focus(); }));
  m.el.querySelector("[data-ok]").onclick = () => {
    if (!t.value.trim()) return t.focus();
    S.reportProblem(o.number, it.id, t.value.trim(), u.id);
    m.close();
    toast("Problema reportado");
  };
}
