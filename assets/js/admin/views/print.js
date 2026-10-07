import * as S from "../../store.js";
import { esc, fdateY, dimsText, firstName } from "../../format.js";
import { icon, logo } from "../../ui.js";

export const title = "Orden de trabajo";

// Hoja A4 para el taller: datos técnicos y un QR por mueble. Sin montos ni datos de contacto.
export function render(main, ctx) {
  const o = S.order(ctx.params[0]);
  if (!o) { main.innerHTML = `<p style="padding:24px">No existe la orden.</p>`; return; }
  main.innerHTML = `
    <div class="print-bar"><a class="btn" href="/admin/ordenes/${o.number}">${icon("left")}Volver a la orden</a><button class="btn btn-primary" data-print>${icon("print")}Imprimir</button></div>
    <article class="print-page">
      <header class="wo-head">
        <div><div style="display:flex;gap:10px;align-items:center">${logo("", 40)}<div><b style="font-family:var(--f-brand);letter-spacing:.1em;font-size:16px">LA UNIÓN</b><div style="font-size:11px">Orden de trabajo para el taller</div></div></div></div>
        <div style="text-align:right"><h1>${esc(o.number)}</h1><div>Entrega prometida: <b>${fdateY(o.dueDate)}</b></div><div>${o.delivery === "retiro" ? "Retira en showroom" : `Envío e instalación · ${esc(o.customer.city)}`}</div><div>Cliente: ${esc(firstName(o.customer.name))} · Vendió: ${esc(o.seller?.name || "")}</div></div>
      </header>
      ${o.items.map((it) => `<section class="wo-item">
        <div>
          <h2>${it.qty > 1 ? `${it.qty}× ` : ""}${esc(it.name)}</h2>
          <table style="font-size:13px;border-collapse:collapse"><tbody>
            <tr><td style="padding:2px 12px 2px 0;color:#555">Medidas</td><td><b>${esc(dimsText(it.dims) || "A definir")}</b></td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#555">Material</td><td>${esc(it.material)}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#555">Color</td><td>${esc(it.color)}</td></tr>
            ${it.extras.length ? `<tr><td style="padding:2px 12px 2px 0;color:#555">Extras</td><td>${esc(it.extras.join(", "))}</td></tr>` : ""}
            ${it.notes ? `<tr><td style="padding:2px 12px 2px 0;color:#555;vertical-align:top">Notas</td><td>${esc(it.notes)}</td></tr>` : ""}
          </tbody></table>
          <div class="wo-checks">${it.stages.map((s, i) => `<span>${i + 1}. ${esc(s.name)}</span>`).join("")}</div>
          ${it.attachments.length ? `<div class="wo-attach">${it.attachments.map((a) => `<img src="${esc(a)}" alt="">`).join("")}</div>` : ""}
        </div>
        <div class="qr"><div data-qr="${location.origin}/admin/taller/${o.number}/${it.id}"></div><span>Escaneá para actualizar la etapa</span></div>
      </section>`).join("")}
    </article>`;
  main.querySelector("[data-print]").onclick = () => window.print();
  let tries = 0;
  const drawQRs = () => {
    if (!main.isConnected) return;
    if (!window.QRCode) {
      // Sin internet o sin la librería: queda el link escrito para tipearlo a mano.
      if (++tries > 40) main.querySelectorAll("[data-qr]").forEach((el) => (el.innerHTML = `<small class="qr-fallback">${el.dataset.qr.replace(location.origin, "")}</small>`));
      else setTimeout(drawQRs, 150);
      return;
    }
    main.querySelectorAll("[data-qr]").forEach((el) => {
      el.innerHTML = "";
      new window.QRCode(el, { text: el.dataset.qr, width: 280, height: 280, correctLevel: window.QRCode.CorrectLevel.M });
    });
  };
  drawQRs();
  return { title: `Orden de trabajo ${o.number}` };
}
