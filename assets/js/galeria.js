/* Galería del detalle de producto (el modal de index.html): fotos + un visor 3D.
   Por ahora el 3D es un modelo de prueba y es el mismo para todos los productos. Rutas en MODELO_3D. */
const MODELO_3D = {
  // TEMPORAL: "GlamVelvetSofa" de Khronos glTF-Sample-Assets, © 2021 Wayfair, LLC (modelo de Eric Chadwick),
  // licencia CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). El poster es una captura de ese modelo.
  // https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa — reemplazar por el modelo propio.
  glb: "assets/productos/mock/modelo.glb",
  // iPhone (AR Quick Look): poné "assets/productos/mock/modelo.usdz" cuando lo agregues. Vacío = model-viewer lo genera desde el GLB.
  usdz: "",
  poster: "assets/productos/mock/poster.webp",
  alt: "Modelo 3D de un sillón tapizado. Arrastrá para girarlo.",
};
const MODEL_VIEWER_JS = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";

const Galeria = (() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduce ? "auto" : "smooth";
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const lb = () => document.getElementById("lightbox");
  const full = () => document.getElementById("visor3d");
  let g = null;       // galería abierta
  let mv = null;      // el único <model-viewer> montado
  let failed = false; // el GLB o el script no cargaron: no se reintenta hasta recargar
  let script = null;

  const img = (src, alt, eager) => `<img src="${esc(src)}" alt="${esc(alt)}" width="800" height="1000"${eager ? "" : ' loading="lazy"'} decoding="async" onerror="this.style.visibility='hidden'">`;

  /* fotos: URLs. El 3D va segundo, así se ve en las miniaturas sin tapar la foto principal. */
  function html(fotos, nombre) {
    const items = fotos.map((src, j) => ({src, alt: `${nombre}, foto ${j + 1}`}));
    items.splice(Math.min(1, items.length), 0, {is3d: true});
    const n = items.length;
    const slides = items.map((it, j) => it.is3d
      ? `<div class="g-slide g-3d" data-3d role="group" aria-label="Modelo 3D">${img(MODELO_3D.poster, "Vista previa del modelo 3D", j === 0)}
          <button class="btn btn-sm g-full" data-g-full aria-label="Ver en pantalla completa"><svg><use href="#i-expand"/></svg><span>Ver en pantalla completa</span></button>
          <div class="g-err" role="alert"><p>No se pudo cargar el modelo 3D</p>${n > 1 ? `<button class="btn btn-sm" data-g-photos>Volver a las fotos</button>` : ""}</div></div>`
      : `<button class="g-slide" data-zoom tabindex="-1" aria-label="Ampliar: ${esc(it.alt)}">${img(it.src, it.alt, j === 0)}</button>`).join("");
    const thumbs = items.map((it, j) => it.is3d
      ? `<button class="g-th3d" aria-label="Ver el modelo 3D">${img(MODELO_3D.poster, "")}<span class="g-tag">3D</span></button>`
      : `<button aria-label="Ver ${esc(it.alt)}">${img(it.src, "")}</button>`).join("");
    return `<div class="media g-stage"><div class="ph-mark"><svg viewBox="0 0 320 460"><use href="#mark"/></svg></div>
      <div class="slides">${slides}</div>
      ${n > 1 ? `<span class="pcount g-count" aria-hidden="true"></span>
      <button class="icon-btn g-nav g-prev" data-g-step="-1" aria-label="Anterior"><svg><use href="#i-back"/></svg></button>
      <button class="icon-btn g-nav g-next" data-g-step="1" aria-label="Siguiente"><svg><use href="#i-arrow"/></svg></button>` : ""}
    </div>
    ${n > 1 ? `<div class="thumbs" data-g-thumbs>${thumbs}</div>` : ""}`;
  }

  function bind(root) {
    stop();
    const track = root.querySelector(".g-stage .slides");
    if (!track) return;
    const slides = [...track.children];
    const gal = g = {track, slides, slide3d: slides.find(s => s.matches("[data-3d]")), count: root.querySelector(".g-count"), thumbs: [...root.querySelectorAll("[data-g-thumbs] button")], i: -1, t: 0};
    if (failed) g.slide3d.classList.add("g-failed");
    /* swipe = scroll nativo con scroll-snap; el slide activo se decide cuando el scroll se detiene */
    track.addEventListener("scroll", () => {
      clearTimeout(gal.t);
      gal.t = setTimeout(() => { const k = Math.round(track.scrollLeft / track.clientWidth); if (g === gal && k !== gal.i) setActive(k); }, 90);
    }, {passive: true});
    setActive(0);
  }

  function setActive(k) {
    g.i = k;
    const is3d = g.slides[k] === g.slide3d;
    g.track.classList.toggle("g-lock", is3d); // en el 3D arrastrar gira el modelo, no cambia de foto
    g.slides.forEach((s, j) => { if (s.matches("[data-zoom]")) s.tabIndex = j === k ? 0 : -1; });
    g.thumbs.forEach((b, j) => b.setAttribute("aria-current", j === k));
    if (g.count) g.count.textContent = `${k + 1} / ${g.slides.length}`;
    const th = g.thumbs[k];
    if (th) { const r = th.parentElement.getBoundingClientRect(), b = th.getBoundingClientRect(); th.parentElement.scrollBy({left: b.left - r.left - (r.width - b.width) / 2, behavior}); }
    if (is3d && !failed) mount(); else unmount();
  }

  function go(k) {
    const n = g.slides.length;
    k = (k + n) % n;
    if (k === g.i) return;
    setActive(k);
    g.track.scrollTo({left: k * g.track.clientWidth, behavior});
  }

  /* ---------- visor 3D ---------- */
  function mount() {
    if (mv) return;
    if (!script) {
      script = document.createElement("script");
      script.type = "module"; script.src = MODEL_VIEWER_JS; script.onerror = fail;
      document.head.append(script);
    }
    mv = document.createElement("model-viewer");
    const attrs = {
      src: MODELO_3D.glb, poster: MODELO_3D.poster, alt: MODELO_3D.alt, loading: "eager",
      "camera-controls": "", "disable-pan": "", "touch-action": "pan-y", "interaction-prompt": reduce ? "none" : "auto",
      "shadow-intensity": "1", exposure: "1.1", "environment-image": "neutral",
      // phi máx. 88deg: la cámara no baja del nivel del mueble. Radio "auto": no deja entrar al mueble ni alejarse más que la vista inicial.
      "camera-orbit": "-30deg 75deg 105%", "min-camera-orbit": "auto 20deg auto", "max-camera-orbit": "auto 88deg auto",
      ar: "", "ar-modes": "webxr scene-viewer quick-look",
    };
    if (MODELO_3D.usdz) attrs["ios-src"] = MODELO_3D.usdz;
    for (const k in attrs) mv.setAttribute(k, attrs[k]);
    mv.innerHTML = `<button slot="ar-button" class="btn btn-sm g-ar"><svg><use href="#i-cube"/></svg>Ver en tu espacio</button>
      <div slot="progress-bar" class="g-bar" role="progressbar" aria-label="Cargando modelo 3D"><i></i></div>`;
    const bar = mv.querySelector(".g-bar");
    mv.addEventListener("progress", e => {
      const p = e.detail.totalProgress;
      bar.firstChild.style.width = Math.max(p, .08) * 100 + "%";
      bar.setAttribute("aria-valuenow", Math.round(p * 100));
      bar.hidden = p >= 1;
    });
    mv.addEventListener("error", fail);
    g.slide3d.append(mv);
  }
  function unmount() {
    if (!mv) return;
    const m = mv; mv = null; // primero soltarlo, así el "close" del visor no lo vuelve a montar
    if (full()?.open) full().close();
    m.remove();
  }
  function fail() {
    failed = true;
    unmount();
    if (g) g.slide3d.classList.add("g-failed");
  }
  function openFull() {
    if (!mv) return;
    full().prepend(mv);
    full().showModal();
  }
  /* al cerrar la pantalla completa el visor vuelve a su lugar en la galería, con la misma cámara */
  function backFromFull() { if (mv && g && mv.parentElement !== g.slide3d) g.slide3d.append(mv); }

  /* ---------- lightbox ---------- */
  function showLb() {
    const im = g.slides[g.i].querySelector("img"), photos = g.slides.filter(s => s.matches("[data-zoom]"));
    lb().querySelector("img").src = im.src;
    lb().querySelector("img").alt = im.alt;
    lb().querySelector(".lb-n").textContent = `${photos.indexOf(g.slides[g.i]) + 1} / ${photos.length}`;
    lb().classList.toggle("lb-one", photos.length < 2);
  }
  function lbStep(d) {
    let k = g.i;
    do k = (k + d + g.slides.length) % g.slides.length; while (!g.slides[k].matches("[data-zoom]"));
    go(k); showLb();
  }

  /* modal cerrado o contenido reemplazado */
  function stop() {
    if (lb()?.open) lb().close();
    unmount();
    if (g) clearTimeout(g.t);
    g = null;
  }

  document.addEventListener("click", e => {
    if (!g) return;
    const t = e.target, step = t.closest("[data-g-step]"), th = t.closest("[data-g-thumbs] button"), zoom = t.closest("[data-zoom]");
    if (step) go(g.i + +step.dataset.gStep);
    else if (th) go(g.thumbs.indexOf(th));
    else if (zoom) { if (g.slides.indexOf(zoom) !== g.i) setActive(g.slides.indexOf(zoom)); showLb(); lb().showModal(); }
    else if (t.closest("[data-g-full]")) openFull();
    else if (t.closest("[data-g-photos]")) go(g.slides.findIndex(s => s.matches("[data-zoom]")));
    else if (t.closest("[data-lb-step]")) lbStep(+t.closest("[data-lb-step]").dataset.lbStep);
    else if (t === lb() || t.closest("[data-lb-close]")) lb().close();
    else if (t.closest("[data-full-close]")) { backFromFull(); full().close(); }
  });
  document.addEventListener("keydown", e => {
    if (!g || (e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (full().open || e.target.closest?.("input, textarea, select, model-viewer")) return; // en el 3D las flechas mueven la cámara
    e.preventDefault();
    const d = e.key === "ArrowRight" ? 1 : -1;
    if (lb().open) lbStep(d); else go(g.i + d);
  });
  // Escape dispara "cancel" (sincrónico); "close" cubre cualquier otro cierre
  for (const ev of ["cancel", "close"]) document.addEventListener(ev, e => { if (e.target === full()) backFromFull(); }, true);

  return {html, bind, stop};
})();
