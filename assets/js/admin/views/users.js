import * as S from "../../store.js";
import { esc, rel, phonePretty, normPhone } from "../../format.js";
import { icon, modal, toast, confirmDialog, initials } from "../../ui.js";

export const title = "Usuarios";
export const live = true;

export function render(main, ctx) {
  const me = ctx.user;
  const list = [...S.users()].sort((a, b) => b.active - a.active || a.name.localeCompare(b.name));
  main.innerHTML = `
    <div class="page-head"><div><h1>Usuarios</h1><p>Cada persona entra con su usuario. A quien ya no trabaja se lo desactiva: sus ventas y cambios siguen firmados con su nombre.</p></div>
      <button class="btn btn-primary" data-new>${icon("plus")}Nuevo usuario</button></div>
    <section class="card"><div class="table-wrap"><table class="table cards">
      <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Último ingreso</th><th>Estado</th><th></th></tr></thead>
      <tbody>${list.map((u) => `<tr style="${u.active ? "" : "opacity:.6"}">
        <td class="full"><div class="row" style="flex-wrap:nowrap"><span class="avatar">${initials(u.name)}</span><span><span class="cell-title">${esc(u.name)}${u.id === me.id ? ` <span class="badge plain">Vos</span>` : ""}</span><span class="cell-sub">${phonePretty(u.phone)}</span></span></div></td>
        <td data-label="Usuario"><code>${esc(u.username)}</code></td>
        <td data-label="Rol">${S.ROLE_LABEL[u.role]}</td>
        <td class="hide-m small muted">${u.lastLogin ? rel(u.lastLogin) : "Nunca"}</td>
        <td data-label="Estado">${u.active ? `<span class="badge ok">Activo</span>` : `<span class="badge">Inactivo</span>`}${u.mustChange && u.active ? ` <span class="badge warn plain">Contraseña temporal</span>` : ""}</td>
        <td class="right full"><div class="row" style="justify-content:flex-end"><button class="btn btn-sm" data-edit="${u.id}">${icon("edit")}Editar</button>${u.id !== me.id ? `<button class="btn btn-sm btn-ghost" data-toggle="${u.id}">${u.active ? "Desactivar" : "Activar"}</button>` : ""}</div></td>
      </tr>`).join("")}</tbody></table></div></section>`;
  main.querySelector("[data-new]").onclick = () => userModal(null);
  main.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => userModal(S.user(b.dataset.edit))));
  main.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = async () => {
    const u = S.user(b.dataset.toggle);
    if (u.active && !(await confirmDialog({ title: `Desactivar a ${u.name}`, text: "No va a poder ingresar al panel. Su historial queda guardado y lo podés volver a activar cuando quieras.", ok: "Desactivar" }))) return;
    S.setUserActive(u.id, !u.active);
    toast(u.active ? "Usuario desactivado" : "Usuario activado");
  }));
  return { title };
}

function userModal(u) {
  const temp = () => Math.random().toString(36).slice(2, 8);
  const m = modal({
    title: u ? `Editar · ${u.name}` : "Nuevo usuario",
    body: `<form class="stack" novalidate>
      <label class="field"><span>Nombre y apellido</span><input class="input" name="name" value="${esc(u?.name || "")}"></label>
      <div class="grid-2"><label class="field"><span>Usuario</span><input class="input" name="username" autocapitalize="none" value="${esc(u?.username || "")}" placeholder="ej: martin"></label>
      <label class="field"><span>Teléfono</span><input class="input" name="phone" inputmode="tel" value="${u ? esc(phonePretty(u.phone)) : ""}"></label></div>
      <div class="field"><span>Rol</span><div class="radio-cards">${Object.entries(S.ROLE_LABEL).map(([k, l]) => `<label><input type="radio" name="role" value="${k}" ${(u?.role || "vendedor") === k ? "checked" : ""}><b>${l}</b><small>${{ admin: "Todo, incluida caja y usuarios", vendedor: "Ventas, cobros y catálogo", taller: "Solo el panel del taller, sin montos" }[k]}</small></label>`).join("")}</div></div>
      <label class="field"><span>${u ? "Nueva contraseña temporal (opcional)" : "Contraseña temporal"}</span><div class="row" style="flex-wrap:nowrap"><input class="input" name="password" value="${u ? "" : temp()}" ${u ? 'placeholder="Dejar vacío para no cambiarla"' : ""}><button type="button" class="btn" data-gen>Generar</button></div><small>La persona la cambia en su primer ingreso.</small></label>
      <p class="alert bad" data-err hidden>${icon("alert")}<span></span></p>
    </form>`,
    foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" data-ok>${u ? "Guardar" : "Crear usuario"}</button>`,
  });
  const f = m.el.querySelector("form");
  m.el.querySelector("[data-gen]").onclick = () => (f.password.value = temp());
  m.el.querySelector("[data-ok]").onclick = () => {
    const err = m.el.querySelector("[data-err]");
    const fail = (t) => { err.querySelector("span").textContent = t; err.hidden = false; };
    if (f.name.value.trim().length < 3) return fail("Escribí el nombre completo.");
    if (!u && f.password.value.length < 6) return fail("La contraseña temporal lleva al menos 6 caracteres.");
    if (u && f.password.value && f.password.value.length < 6) return fail("La contraseña temporal lleva al menos 6 caracteres.");
    const r = S.saveUser({ id: u?.id, name: f.name.value, username: f.username.value, phone: normPhone(f.phone.value), role: f.role.value, password: f.password.value });
    if (!r.ok) return fail(r.error);
    m.close();
    toast(u ? "Usuario guardado" : `Usuario creado. Pasale: ${f.username.value.trim().toLowerCase()} / ${f.password.value}`, { timeout: 9000 });
  };
}
