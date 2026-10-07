import * as S from "../../store.js";
import { esc, dueLabel, dimsText, firstName } from "../../format.js";
import { icon, modal, toast } from "../../ui.js";

export const title = "Taller";
export const live = true;

let filter = 0;

export function render(main, ctx) {
  const orders = S.orders().filter((o) => ["fabricacion", "lista", "pausa"].includes(o.state));
  const cards = [];
  orders.forEach((o) => o.items.forEach((it) => { if (!it.done) cards.push({ o, it }); }));
  cards.sort((a, b) => (a.o.state === "pausa") - (b.o.state === "pausa") || a.o.dueDate.localeCompare(b.o.dueDate));
  const labels = S.stagesOf("melamina").map((s) => s.short);
  const counts = labels.map((_, i) => cards.filter((c) => c.it.current === i + 1 && c.o.state !== "pausa").length);
  const list = filter ? cards.filter((c) => c.it.current === filter) : cards;

  main.innerHTML = `
    <div class="ws-head">
      <div class="spread"><div><h1>Taller</h1><p class="muted">${cards.length} ${cards.length === 1 ? "mueble" : "muebles"} en fabricación · lo más urgente arriba</p></div>
        <button class="btn btn-primary btn-lg" data-scan>${icon("qr")}Escanear QR</button></div>
      <div class="ws-filters" role="group" aria-label="Filtrar por etapa">
        <button class="chip" data-f="0" aria-pressed="${!filter}">Todos<span class="n">${cards.length}</span></button>
        ${labels.map((l, i) => `<button class="chip" data-f="${i + 1}" aria-pressed="${filter === i + 1}">${i + 1}. ${esc(l)}<span class="n">${counts[i]}</span></button>`).join("")}
      </div>
    </div>
    ${list.length ? `<div class="ws-list">${list.map(({ o, it }) => {
      const due = dueLabel(o.dueDate);
      const paused = o.state === "pausa";
      return `<a class="ws-card ${o.late && !paused ? "late" : ""} ${it.problem && !it.problem.resolvedAt ? "problem" : ""}" href="/admin/taller/${o.number}/${it.id}" style="${paused ? "opacity:.6" : ""}">
        ${it.photo ? `<img src="${esc(it.photo)}" alt="" loading="lazy">` : `<span style="width:84px;border-radius:10px;background:var(--surface-2)"></span>`}
        <div class="stack-sm" style="gap:4px;align-content:start;min-width:0">
          <span class="small muted tnum">${esc(o.number)} · ${esc(firstName(o.customer.name))}</span>
          <span class="t">${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</span>
          <span class="small muted">${esc(dimsText(it.dims))} · ${esc(it.color)}</span>
          <span class="stage">${paused ? "En pausa" : `${it.current}. ${esc(it.stage.name)}`}</span>
          <span class="small" style="${due.tone === "bad" ? "color:var(--bad);font-weight:700" : due.tone === "warn" ? "color:var(--warn);font-weight:700" : "color:var(--muted)"}">${due.text}${it.problem && !it.problem.resolvedAt ? ` · <span style="color:var(--warn)">Problema reportado</span>` : ""}</span>
        </div></a>`;
    }).join("")}</div>` : `<div class="empty card">${icon("check")}<p>No hay muebles en esta etapa.</p></div>`}`;

  main.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { filter = +b.dataset.f; ctx.rerender(); }));
  main.querySelector("[data-scan]").onclick = () => scan(ctx);
  return { title };
}

export function scan(ctx) {
  let stream = null, stop = false;
  const m = modal({
    title: "Escanear la orden de trabajo",
    body: `<div class="stack">
      <div data-cam><video class="qr-video" playsinline muted></video><p class="small muted" style="margin-top:6px">Apuntá al código QR de la hoja impresa.</p></div>
      <form class="stack-sm" data-manual><label class="field"><span>O escribí el número de orden</span><input class="input" name="n" placeholder="Ej: 0142" inputmode="numeric" autocomplete="off"></label><button class="btn btn-primary btn-lg btn-block">Abrir</button></form>
    </div>`,
    onClose: () => { stop = true; stream && stream.getTracks().forEach((t) => t.stop()); },
  });
  const open = (text) => {
    const mUrl = String(text).match(/\/admin\/taller\/(LU-\d+)\/([\w-]+)/i);
    if (mUrl) { m.close(); return ctx.go(`/admin/taller/${mUrl[1].toUpperCase()}/${mUrl[2]}`); }
    const digits = String(text).replace(/\D/g, "");
    const o = digits && S.order("LU-" + digits.padStart(4, "0"));
    if (!o) return toast("No encontramos esa orden.", { tone: "bad" });
    const pending = o.items.filter((i) => !i.done);
    if (pending.length === 1) { m.close(); return ctx.go(`/admin/taller/${o.number}/${pending[0].id}`); }
    m.body.innerHTML = `<p class="muted" style="margin-bottom:10px">${o.number} tiene ${pending.length} muebles. ¿Cuál vas a actualizar?</p><div class="pick">${pending.map((i) => `<button type="button" data-i="${i.id}"><img class="thumb" src="${esc(i.photo)}" alt=""><span class="grow"><b>${esc(i.name)}</b><br><span class="small muted">${i.current}. ${esc(i.stage.name)}</span></span>${icon("right")}</button>`).join("")}</div>`;
    m.body.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { m.close(); ctx.go(`/admin/taller/${o.number}/${b.dataset.i}`); }));
  };
  m.el.querySelector("[data-manual]").addEventListener("submit", (e) => { e.preventDefault(); open(e.target.n.value); });
  const cam = m.el.querySelector("[data-cam]");
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    cam.innerHTML = `<div class="alert info">${icon("info")}<span>Este navegador no puede leer QR con la cámara. Escribí el número de orden, o abrí el link del QR con la cámara del celular.</span></div>`;
    return;
  }
  const video = cam.querySelector("video");
  const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
    stream = s;
    video.srcObject = s;
    video.play();
    const tick = async () => {
      if (stop) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length) return open(codes[0].rawValue);
      } catch {}
      requestAnimationFrame(tick);
    };
    tick();
  }).catch(() => {
    cam.innerHTML = `<div class="alert warn">${icon("camera")}<span>No pudimos usar la cámara. Revisá el permiso del navegador o escribí el número de orden.</span></div>`;
  });
}
