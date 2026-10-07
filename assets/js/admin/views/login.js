import * as S from "../../store.js";
import { icon, logo } from "../../ui.js";

export const title = "Ingresar";

const DEMO = [
  { role: "Administrador", user: "fernando", pass: "admin123", note: "Ve todo: ventas, taller, caja y usuarios" },
  { role: "Vendedora", user: "valentina", pass: "venta123", note: "Registra ventas y cobros" },
  { role: "Taller", user: "lucas", pass: "taller123", note: "Actualiza las etapas desde el celular" },
];

export function render(main, ctx) {
  main.innerHTML = `<div class="login-page"><div class="login-col">
    <form class="card login-card" novalidate>
      ${logo("logo", 54)}
      <h1>Panel interno</h1>
      <p class="lead">Ingresá con tu usuario de La Unión.</p>
      <label class="field"><span>Usuario</span><input class="input" name="user" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label class="field"><span>Contraseña</span><span class="pass-wrap"><input class="input" name="pass" type="password" autocomplete="current-password" required><button type="button" class="icon-btn" data-eye aria-label="Mostrar contraseña">${icon("eye")}</button></span></label>
      <p class="alert bad" data-err hidden>${icon("alert")}<span></span></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Ingresar</button>
      <button class="btn btn-ghost btn-sm" type="button" data-forgot style="justify-self:center">¿Olvidaste tu contraseña?</button>
      <p class="muted small" data-forgot-msg hidden style="text-align:center">Pedile al administrador que te la restablezca desde la sección Usuarios.</p>
    </form>
    <div class="card demo-users">
      <div class="spread"><b>Usuarios de prueba</b><span class="badge gold plain">Demo</span></div>
      ${DEMO.map((d) => `<button type="button" data-user="${d.user}" data-pass="${d.pass}"><span><b>${d.role}</b><br><span class="small muted">${d.note}</span></span><code>${d.user} · ${d.pass}</code></button>`).join("")}
    </div>
  </div></div>`;

  const f = main.querySelector("form");
  const err = main.querySelector("[data-err]");
  const submit = () => {
    const r = S.login(f.user.value, f.pass.value);
    if (!r.ok) {
      err.querySelector("span").textContent = r.error;
      err.hidden = false;
      f.pass.select();
      return;
    }
    const next = ctx.query.get("next");
    const safe = next && next.startsWith("/admin") && !next.startsWith("/admin/ingresar") ? next : r.user.role === "taller" ? "/admin/taller" : "/admin";
    ctx.go(safe, { replace: true });
  };
  f.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  main.querySelector("[data-eye]").onclick = (e) => {
    const show = f.pass.type === "password";
    f.pass.type = show ? "text" : "password";
    e.currentTarget.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    e.currentTarget.innerHTML = icon(show ? "eyeoff" : "eye");
  };
  main.querySelector("[data-forgot]").onclick = () => (main.querySelector("[data-forgot-msg]").hidden = false);
  main.querySelectorAll("[data-user]").forEach((b) =>
    b.addEventListener("click", () => { f.user.value = b.dataset.user; f.pass.value = b.dataset.pass; submit(); })
  );
  setTimeout(() => f.user.focus(), 30);
  return { title };
}
