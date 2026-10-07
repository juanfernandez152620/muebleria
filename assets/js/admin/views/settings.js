import * as S from "../../store.js";
import { esc, fdatetime } from "../../format.js";
import { icon, toast, confirmDialog } from "../../ui.js";

export const title = "Configuración";

export function render(main, ctx) {
  const line = ctx.query.get("linea") || "melamina";
  const stages = S.stagesOf(line);
  main.innerHTML = `
    <div class="page-head"><div><h1>Configuración</h1><p>Etapas de fabricación y datos del demo.</p></div></div>
    <section class="card" style="margin-bottom:18px">
      <div class="card-head"><div><h2>Etapas de fabricación</h2><p class="small muted">Cada mueble toma el recorrido de su tipo. El cliente lee el texto de la derecha en su seguimiento.</p></div>
        <div class="seg" role="group"><a class="btn btn-sm ${line === "melamina" ? "" : "btn-ghost"}" href="/admin/configuracion?linea=melamina">Melamina y MDF</a><a class="btn btn-sm ${line === "tapiceria" ? "" : "btn-ghost"}" href="/admin/configuracion?linea=tapiceria">Tapicería</a></div></div>
      <form class="card-body stack" novalidate>
        <div class="table-wrap"><table class="table"><thead><tr><th style="width:40px">#</th><th>Nombre en el taller</th><th style="width:150px">Nombre corto</th><th>Lo que lee el cliente</th></tr></thead><tbody>
          ${stages.map((s, i) => `<tr><td class="tnum"><b>${i + 1}</b></td><td><input class="input" name="name${i}" value="${esc(s.name)}" aria-label="Nombre de la etapa ${i + 1}"></td><td><input class="input" name="short${i}" value="${esc(s.short)}" maxlength="14" aria-label="Nombre corto de la etapa ${i + 1}"></td><td><input class="input" name="client${i}" value="${esc(s.client)}" aria-label="Texto para el cliente en la etapa ${i + 1}"></td></tr>`).join("")}
        </tbody></table></div>
        <p class="small muted">Son 7 etapas fijas para que las órdenes en curso no se desordenen. La última siempre es la entrega.</p>
        <div class="row"><button class="btn btn-primary">${icon("check")}Guardar etapas</button><button type="button" class="btn btn-ghost" data-reset-st>Volver a las etapas originales</button></div>
      </form>
    </section>
    <section class="card card-pad stack">
      <h2>Datos de ejemplo</h2>
      <p class="muted">Este demo guarda todo en este navegador. Los datos se cargaron el ${fdatetime(JSON.parse(localStorage.getItem("lu-demo-db") || "{}").seededAt)}. Si lo abrís en otro navegador o celular, arranca con los mismos datos de ejemplo.</p>
      <p class="small muted">Espacio usado: ${(S.storageSize() / 1024).toFixed(0)} KB de unos 5.000 KB disponibles. Las fotos que subas son lo que más ocupa.</p>
      <div><button class="btn btn-danger" data-reset>${icon("refresh")}Reiniciar los datos de ejemplo</button></div>
    </section>`;
  const f = main.querySelector("form");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const list = stages.map((s, i) => ({ name: f[`name${i}`].value.trim() || s.name, short: f[`short${i}`].value.trim() || s.short, client: f[`client${i}`].value.trim() || s.client }));
    S.saveStages(line, list);
    toast("Etapas guardadas");
  });
  main.querySelector("[data-reset-st]").onclick = async () => {
    if (await confirmDialog({ title: "Volver a las etapas originales", text: "Se reemplazan los nombres de las dos líneas por los del documento original.", ok: "Volver a las originales" })) { S.resetStages(); toast("Etapas originales restauradas"); ctx.rerender(); }
  };
  main.querySelector("[data-reset]").onclick = async () => {
    if (!(await confirmDialog({ title: "Reiniciar los datos de ejemplo", text: "Se borran las ventas, cobros, cambios del catálogo y usuarios que cargaste en este navegador, y vuelven los datos de ejemplo. Tu sesión se mantiene.", ok: "Reiniciar", danger: true }))) return;
    const u = ctx.user;
    S.resetDemo();
    localStorage.setItem("lu-demo-session", JSON.stringify({ userId: u.id, at: Date.now() }));
    toast("Datos de ejemplo reiniciados");
    ctx.go("/admin");
  };
  return { title };
}
