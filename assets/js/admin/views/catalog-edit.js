import * as S from "../../store.js";
import { esc, dimsText, fdatetime } from "../../format.js";
import { icon, toast, fileToDataURL, confirmDialog } from "../../ui.js";

export const title = "Modelo";

export function render(main, ctx) {
  const isNew = ctx.params[0] === "nuevo";
  const src = isNew ? null : S.product(ctx.params[0]);
  if (!isNew && !src) {
    main.innerHTML = `<div class="empty card"><h2>No existe ese modelo</h2><a class="btn" href="/admin/catalogo">Volver al catálogo</a></div>`;
    return { title: "No encontrado" };
  }
  const rooms = S.rooms();
  const p = src ? JSON.parse(JSON.stringify(src)) : { name: "", room: rooms[0].id, type: "", kind: "", sub: "", w: null, h: null, d: null, diam: null, dimText: "", dimDetail: "", features: [], note: "", code: "", priceRange: "", photos: [], visible: false, featured: false };
  let dirty = false;

  main.innerHTML = `
    <div class="crumb"><a href="/admin/catalogo">Catálogo</a>${icon("right")}<span>${isNew ? "Nuevo modelo" : esc(p.name)}</span></div>
    <div class="page-head"><div><h1>${isNew ? "Nuevo modelo" : esc(p.name)}</h1>${src?.updatedAt ? `<p>Última modificación: ${fdatetime(src.updatedAt)}</p>` : ""}</div>
      <div class="row"><a class="btn" href="/admin/catalogo">Cancelar</a><button class="btn btn-primary" data-save>${icon("check")}Guardar</button></div></div>
    <form class="cat-form" novalidate>
      <div class="stack">
        <section class="card card-pad stack">
          <label class="field"><span>Nombre</span><input class="input" name="name" value="${esc(p.name)}" required></label>
          <div class="grid-2">
            <label class="field"><span>Ambiente</span><select class="select" name="room">${rooms.map((r) => `<option value="${r.id}" ${r.id === p.room ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
            <label class="field"><span>Tipo de mueble</span><input class="input" name="type" list="types" value="${esc(p.type)}" placeholder="Ej: Cómodas"><datalist id="types"></datalist></label>
          </div>
          <label class="field"><span>Frase corta</span><input class="input" name="kind" value="${esc(p.kind)}" placeholder="Ej: Para exhibir golosinas a la vista"><small>Se muestra debajo del nombre en la web. Hablale al cliente: para qué le sirve.</small></label>
          <label class="field"><span>Variante (opcional)</span><input class="input" name="sub" value="${esc(p.sub)}" placeholder="Ej: Estilo Hollywood"></label>
        </section>
        <section class="card card-pad stack">
          <h2>Medidas</h2>
          <div class="grid-4">
            <label class="field"><span>Ancho (cm)</span><input class="input" name="w" inputmode="numeric" value="${p.w ?? ""}"></label>
            <label class="field"><span>Alto (cm)</span><input class="input" name="h" inputmode="numeric" value="${p.h ?? ""}"></label>
            <label class="field"><span>Profundidad (cm)</span><input class="input" name="d" inputmode="numeric" value="${p.d ?? ""}"></label>
            <label class="field"><span>Diámetro (cm)</span><input class="input" name="diam" inputmode="numeric" value="${p.diam ?? ""}"></label>
          </div>
          <label class="field"><span>Detalle de medidas (opcional)</span><input class="input" name="dimDetail" value="${esc(p.dimDetail)}" placeholder="Ej: maquillador 100 · espejo 60"></label>
          <label class="field"><span>Si no tiene medidas fijas</span><input class="input" name="dimText" value="${esc(p.dimText)}" placeholder="Ej: Medidas a consultar"></label>
        </section>
        <section class="card card-pad stack">
          <h2>Características</h2>
          <label class="field"><span>Una por línea</span><textarea class="textarea" name="features" rows="4" placeholder="4 cajones con correderas telescópicas&#10;Patas regulables">${esc(p.features.join("\n"))}</textarea><small>Las dos primeras aparecen como etiquetas en la tarjeta del celular.</small></label>
          <label class="field"><span>Nota (opcional)</span><input class="input" name="note" value="${esc(p.note)}" placeholder="Ej: colores a elección"></label>
          <div class="grid-2">
            <label class="field"><span>Código de producto (opcional)</span><input class="input" name="code" value="${esc(p.code)}"></label>
            <label class="field"><span>Texto de precio (opcional)</span><input class="input" name="priceRange" value="${esc(p.priceRange)}" placeholder="Ej: Desde $ 850.000"><small>Vacío = “Consultar”. No es un precio de venta.</small></label>
          </div>
          <div class="row" style="gap:20px"><label class="switch"><input type="checkbox" name="visible" ${p.visible ? "checked" : ""}>Visible en la web</label><label class="switch"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}>Destacado en la home</label></div>
        </section>
      </div>
      <div class="stack">
        <section class="card card-pad stack">
          <div class="spread"><h2>Fotos</h2><span class="small muted">La primera es la principal. Arrastrá para ordenar.</span></div>
          <div class="photo-grid" data-photos></div>
          <input type="file" accept="image/*" multiple hidden data-file>
        </section>
        <section class="card card-pad stack">
          <h2>Así se ve en el celular</h2>
          <div data-preview></div>
        </section>
      </div>
    </form>`;

  const f = main.querySelector("form");
  const typeList = main.querySelector("#types");
  const fillTypes = () => (typeList.innerHTML = S.typesOf(f.room.value).map((t) => `<option value="${esc(t)}">`).join(""));
  fillTypes();
  f.room.addEventListener("change", fillTypes);

  const collect = () => {
    const n = (v) => (String(v).trim() ? +String(v).replace(/[^\d]/g, "") || null : null);
    Object.assign(p, {
      name: f.name.value.trim(), room: f.room.value, type: f.type.value.trim(), kind: f.kind.value.trim(), sub: f.sub.value.trim(),
      w: n(f.w.value), h: n(f.h.value), d: n(f.d.value), diam: n(f.diam.value), dimDetail: f.dimDetail.value.trim(), dimText: f.dimText.value.trim(),
      features: f.features.value.split("\n").map((s) => s.trim()).filter(Boolean), note: f.note.value.trim(), code: f.code.value.trim(), priceRange: f.priceRange.value.trim(),
      visible: f.visible.checked, featured: f.featured.checked,
    });
  };
  const preview = () => {
    collect();
    const chips = (p.features.length ? p.features : p.note ? [p.note] : []).slice(0, 2);
    main.querySelector("[data-preview]").innerHTML = `<div class="preview-card">${p.photos[0] ? `<img src="${esc(p.photos[0])}" alt="">` : `<div style="aspect-ratio:3/4;border-radius:12px;background:var(--surface-2);display:grid;place-items:center;color:var(--faint)">${icon("image")}</div>`}
      <div class="stack-sm" style="align-content:center"><h4>${esc(p.name || "Nombre del modelo")}</h4><span class="small muted">${esc(p.kind || "Frase corta")}</span><span class="small tnum">${esc(dimsText({ w: p.w, h: p.h, d: p.d, diam: p.diam }) || p.dimText || "Medidas")}</span>
      ${chips.length ? `<div class="row">${chips.map((c) => `<span class="badge plain">${esc(c)}</span>`).join("")}</div>` : ""}
      ${p.priceRange ? `<b class="small">${esc(p.priceRange)}</b>` : ""}<span class="btn btn-primary btn-sm" style="pointer-events:none">Consultar</span></div></div>
      ${!p.visible ? `<p class="small muted" style="margin-top:8px">${icon("eyeoff")} Oculto: no aparece en la web hasta que lo actives.</p>` : ""}`;
  };
  let dragFrom = null;
  const drawPhotos = () => {
    const box = main.querySelector("[data-photos]");
    box.innerHTML = p.photos.map((x, i) => `<div class="ph ${i === 0 ? "first" : ""}" draggable="true" data-i="${i}">
        <img src="${esc(x)}" alt="Foto ${i + 1}">${i === 0 ? `<span class="tag">Principal</span>` : ""}
        <div class="tools">${i > 0 ? `<button type="button" data-first="${i}" title="Hacer principal" aria-label="Hacer principal">${icon("up")}</button>` : ""}<button type="button" data-rm="${i}" title="Quitar" aria-label="Quitar foto">${icon("trash")}</button></div>
      </div>`).join("") + `<button type="button" class="add" data-add>${icon("upload")}<span>Subir fotos</span></button>`;
    box.querySelector("[data-add]").onclick = () => main.querySelector("[data-file]").click();
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { p.photos.splice(+b.dataset.rm, 1); dirty = true; drawPhotos(); preview(); }));
    box.querySelectorAll("[data-first]").forEach((b) => (b.onclick = () => { const [x] = p.photos.splice(+b.dataset.first, 1); p.photos.unshift(x); dirty = true; drawPhotos(); preview(); }));
    box.querySelectorAll(".ph").forEach((ph) => {
      ph.addEventListener("dragstart", () => (dragFrom = +ph.dataset.i));
      ph.addEventListener("dragover", (e) => e.preventDefault());
      ph.addEventListener("drop", (e) => {
        e.preventDefault();
        const to = +ph.dataset.i;
        if (dragFrom == null || dragFrom === to) return;
        const [x] = p.photos.splice(dragFrom, 1);
        p.photos.splice(to, 0, x);
        dragFrom = null;
        dirty = true;
        drawPhotos();
        preview();
      });
    });
  };
  main.querySelector("[data-file]").addEventListener("change", async (e) => {
    for (const file of e.target.files) {
      try { p.photos.push(await fileToDataURL(file, 1200, 0.74)); dirty = true; } catch (err) { toast(err.message, { tone: "bad" }); }
    }
    e.target.value = "";
    drawPhotos();
    preview();
  });
  f.addEventListener("input", () => { dirty = true; preview(); });
  drawPhotos();
  preview();

  main.querySelector("[data-save]").onclick = () => {
    collect();
    if (!p.name || !p.type) { toast("Completá el nombre y el tipo de mueble.", { tone: "bad" }); (p.name ? f.type : f.name).focus(); return; }
    if (!p.photos.length && p.visible) toast("Ojo: el modelo está visible y no tiene fotos.");
    const saved = S.saveProduct(p);
    dirty = false;
    toast(isNew ? "Modelo creado" : "Cambios guardados");
    ctx.go(`/admin/catalogo/${saved.id}`, { replace: true });
  };
  const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
  addEventListener("beforeunload", warn);
  return { title: isNew ? "Nuevo modelo" : p.name, cleanup: () => removeEventListener("beforeunload", warn) };
}
