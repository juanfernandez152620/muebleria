import * as S from "../../store.js";
import { esc, fdate, dimsText, norm } from "../../format.js";
import { icon, modal, toast } from "../../ui.js";

export const title = "Catálogo";

const PAGE = 40;
let shown = PAGE;

export function render(main, ctx) {
  const u = ctx.user;
  const admin = u.role === "admin";
  const tab = ctx.query.get("tab") || "modelos";
  main.innerHTML = `
    <div class="page-head"><div><h1>Catálogo</h1><p>${admin ? "Lo que cambies acá es lo que va a mostrar la web pública." : "Consultá modelos, medidas y fotos."}</p></div>
      ${admin && tab === "modelos" ? `<a class="btn btn-primary" href="/admin/catalogo/nuevo">${icon("plus")}Nuevo modelo</a>` : ""}</div>
    ${admin ? `<nav class="tabs"><a href="/admin/catalogo" ${tab === "modelos" ? 'aria-current="page"' : ""}>Modelos<span class="n">${S.products().length}</span></a><a href="/admin/catalogo?tab=ambientes" ${tab === "ambientes" ? 'aria-current="page"' : ""}>Ambientes</a><a href="/admin/catalogo?tab=trabajos" ${tab === "trabajos" ? 'aria-current="page"' : ""}>Trabajos realizados<span class="n">${S.works().length}</span></a></nav>` : ""}
    <div data-body></div>`;
  const body = main.querySelector("[data-body]");
  if (tab === "ambientes" && admin) roomsTab(body);
  else if (tab === "trabajos" && admin) worksTab(body);
  else modelsTab(body, ctx, admin);
  return { title, cleanup: () => (shown = PAGE) };
}

function modelsTab(el, ctx, admin) {
  const rooms = S.rooms();
  const state = { q: ctx.query.get("q") || "", room: ctx.query.get("ambiente") || "", type: "", vis: "" };
  el.innerHTML = `
    <div class="card card-pad" style="margin-bottom:14px;padding:12px">
      <div class="row">
        <label class="gsearch grow" style="width:auto;min-width:220px">${icon("search")}<span class="sr">Buscar modelos</span><input data-q type="search" placeholder="Buscar por nombre, tipo o código" value="${esc(state.q)}"></label>
        <select class="select" style="width:auto" data-room aria-label="Ambiente"><option value="">Todos los ambientes</option>${rooms.map((r) => `<option value="${r.id}" ${r.id === state.room ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>
        <select class="select" style="width:auto" data-type aria-label="Tipo"></select>
        ${admin ? `<select class="select" style="width:auto" data-vis aria-label="Visibilidad"><option value="">Visibles y ocultos</option><option value="1">Solo visibles</option><option value="0">Solo ocultos</option><option value="nofoto">Sin fotos</option></select>` : ""}
      </div>
    </div>
    <div class="card"><div data-list></div></div>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="btn" data-more hidden>Ver más modelos</button></div>`;
  const q = el.querySelector("[data-q]"), roomSel = el.querySelector("[data-room]"), typeSel = el.querySelector("[data-type]"), visSel = el.querySelector("[data-vis]");
  const fillTypes = () => {
    const types = S.typesOf(state.room);
    typeSel.innerHTML = `<option value="">Todos los tipos</option>` + types.map((t) => `<option ${t === state.type ? "selected" : ""}>${esc(t)}</option>`).join("");
  };
  const list = () => {
    const nq = norm(state.q.trim());
    return S.products().filter((p) =>
      (!state.room || p.room === state.room) &&
      (!state.type || p.type === state.type) &&
      (state.vis === "" || (state.vis === "nofoto" ? !p.photos.length : String(+p.visible) === state.vis)) &&
      (!nq || nq.split(/\s+/).every((t) => norm(`${p.name} ${p.type} ${p.kind} ${p.code}`).includes(t)))
    );
  };
  const draw = () => {
    const all = list();
    const items = all.slice(0, shown);
    el.querySelector("[data-list]").innerHTML = items.length ? `<div class="table-wrap"><table class="table cards">
      <thead><tr><th style="width:56px"></th><th>Modelo</th><th>Ambiente</th><th>Medidas</th><th>Fotos</th>${admin ? "<th>En la web</th>" : ""}</tr></thead>
      <tbody>${items.map((p) => `<tr class="${admin ? "click" : ""}" data-id="${p.id}">
        <td class="hide-m">${p.photos[0] ? `<img class="thumb" src="${esc(p.photos[0])}" alt="" loading="lazy">` : `<span class="thumb" style="display:grid;place-items:center;color:var(--warn)">${icon("image")}</span>`}</td>
        <td class="full"><div class="row" style="flex-wrap:nowrap">${p.photos[0] ? `<img class="thumb" src="${esc(p.photos[0])}" alt="" loading="lazy" style="display:none" data-mthumb>` : ""}<span><span class="cell-title">${esc(p.name)}</span><span class="cell-sub">${esc(p.type)}${p.code ? ` · Cód. ${esc(p.code)}` : ""}${p.featured ? " · Destacado" : ""}</span></span></div></td>
        <td data-label="Ambiente"><span class="small">${esc(S.room(p.room)?.name || "")}</span></td>
        <td data-label="Medidas"><span class="small tnum">${esc(dimsText({ w: p.w, h: p.h, d: p.d, diam: p.diam }) || p.dimText)}</span></td>
        <td data-label="Fotos">${p.photos.length ? `<span class="tnum">${p.photos.length}</span>` : `<span class="badge warn">Sin fotos</span>`}</td>
        ${admin ? `<td class="right"><label class="switch" title="Visible en la web"><input type="checkbox" data-vis-id="${p.id}" ${p.visible ? "checked" : ""}><span class="sr">Visible en la web</span></label></td>` : ""}
      </tr>`).join("")}</tbody></table></div>`
      : `<div class="empty">${icon("search")}<p>No hay modelos con estos filtros.</p></div>`;
    const more = el.parentElement.querySelector("[data-more]");
    more.hidden = all.length <= shown;
    more.textContent = `Ver más modelos (${all.length - shown} más)`;
    el.querySelectorAll("[data-vis-id]").forEach((c) =>
      c.addEventListener("change", (e) => {
        e.stopPropagation();
        S.setProductVisible(c.dataset.visId, c.checked);
        toast(c.checked ? "Visible en la web" : "Oculto en la web");
      })
    );
    el.querySelectorAll("[data-vis-id]").forEach((c) => c.closest("label").addEventListener("click", (e) => e.stopPropagation()));
    el.querySelectorAll("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => (admin ? ctx.go(`/admin/catalogo/${tr.dataset.id}`) : viewProduct(S.product(tr.dataset.id)))));
  };
  fillTypes();
  q.addEventListener("input", () => { state.q = q.value; shown = PAGE; draw(); });
  roomSel.onchange = () => { state.room = roomSel.value; state.type = ""; shown = PAGE; fillTypes(); draw(); };
  typeSel.onchange = () => { state.type = typeSel.value; shown = PAGE; draw(); };
  if (visSel) visSel.onchange = () => { state.vis = visSel.value; shown = PAGE; draw(); };
  el.parentElement.querySelector("[data-more]").onclick = () => { shown += PAGE; draw(); };
  draw();
}

function viewProduct(p) {
  modal({
    title: p.name,
    wide: true,
    body: `<div class="cat-form"><div class="photo-grid">${p.photos.map((x) => `<div class="ph"><img src="${esc(x)}" alt="" data-zoom="${esc(x)}"></div>`).join("") || `<p class="muted">Sin fotos.</p>`}</div>
      <dl class="specs"><dt>Tipo</dt><dd>${esc(p.type)}</dd><dt>Para qué sirve</dt><dd>${esc(p.kind)}</dd><dt>Medidas</dt><dd>${esc(dimsText({ w: p.w, h: p.h, d: p.d, diam: p.diam }) || p.dimText)}</dd>${p.features.length ? `<dt>Características</dt><dd>${esc(p.features.join(" · "))}</dd>` : ""}${p.note ? `<dt>Nota</dt><dd>${esc(p.note)}</dd>` : ""}${p.code ? `<dt>Código</dt><dd>${esc(p.code)}</dd>` : ""}</dl></div>`,
  });
}

function roomsTab(el) {
  const rooms = S.rooms();
  el.innerHTML = `<p class="muted" style="margin-bottom:12px">Los ambientes son el menú de la web: “Dormitorio”, “Kiosco y almacén”… Cambiá el nombre, la frase o el orden.</p>
    <div class="card"><div class="table-wrap"><table class="table cards"><thead><tr><th style="width:56px"></th><th>Ambiente</th><th>Para</th><th>Modelos</th><th>Orden</th></tr></thead><tbody>
    ${rooms.map((r, i) => `<tr class="click" data-r="${r.id}"><td class="hide-m"><img class="thumb" src="${esc(r.cover)}" alt=""></td><td class="full"><span class="cell-title">${esc(r.name)}</span><span class="cell-sub">${esc(r.blurb)}</span></td><td data-label="Para">${r.side === "casa" ? "Casa" : "Negocio"}</td><td data-label="Modelos" class="tnum">${S.products().filter((p) => p.room === r.id).length}</td>
      <td class="right"><button class="icon-btn" data-up="${i}" aria-label="Subir" ${i === 0 ? "disabled" : ""}>${icon("up")}</button><button class="icon-btn" data-down="${i}" aria-label="Bajar" ${i === rooms.length - 1 ? "disabled" : ""}>${icon("down")}</button></td></tr>`).join("")}
    </tbody></table></div></div>`;
  const swap = (i, j) => { const a = rooms[i], b = rooms[j]; const t = a.order; S.saveRoom({ ...a, order: b.order }); S.saveRoom({ ...b, order: t }); roomsTab(el); };
  el.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); swap(+b.dataset.up, +b.dataset.up - 1); }));
  el.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); swap(+b.dataset.down, +b.dataset.down + 1); }));
  el.querySelectorAll("tr[data-r]").forEach((tr) => tr.addEventListener("click", () => {
    const r = S.room(tr.dataset.r);
    const m = modal({
      title: `Editar · ${r.name}`,
      body: `<form class="stack"><label class="field"><span>Nombre</span><input class="input" name="name" value="${esc(r.name)}"></label><label class="field"><span>Frase</span><textarea class="textarea" name="blurb">${esc(r.blurb)}</textarea></label></form>`,
      foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>Guardar</button>`,
    });
    m.el.querySelector("[data-ok]").onclick = () => { const f = m.el.querySelector("form"); S.saveRoom({ ...r, name: f.name.value.trim() || r.name, blurb: f.blurb.value.trim() }); m.close(); toast("Ambiente guardado"); roomsTab(el); };
  }));
}

function worksTab(el) {
  const works = S.works();
  el.innerHTML = `<p class="muted" style="margin-bottom:12px">Fotos de trabajos hechos a clientes que se muestran en la web. Las que llegan desde una orden entran ocultas hasta que las revises.</p>
    <div class="ws-list">${works.map((w) => `<div class="card" style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:12px;align-items:center">
      <img src="${esc(w.photos[0])}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:10px" data-zoom="${esc(w.photos[0])}">
      <div class="stack-sm"><b>${esc(w.title)}</b><span class="small muted">${w.photos.length} ${w.photos.length === 1 ? "foto" : "fotos"}</span>
      <label class="switch"><input type="checkbox" data-w="${w.id}" ${w.visible ? "checked" : ""}>Visible en la web</label></div></div>`).join("")}</div>`;
  el.querySelectorAll("[data-w]").forEach((c) => (c.onchange = () => { S.setWorkVisible(c.dataset.w, c.checked); toast(c.checked ? "Visible en la web" : "Oculto en la web"); }));
}
