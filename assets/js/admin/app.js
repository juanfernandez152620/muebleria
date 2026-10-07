// Panel interno: estructura, menú y navegación entre pantallas.
import * as S from "../store.js";
import { esc } from "../format.js";
import { injectIcons, icon, logo, toast, hasOpenModal, modal, initials } from "../ui.js";

import * as Login from "./views/login.js";
import * as Dashboard from "./views/dashboard.js";
import * as Orders from "./views/orders.js";
import * as OrderDetail from "./views/order.js";
import * as PrintOrder from "./views/print.js";
import * as NewSale from "./views/newsale.js";
import * as Catalog from "./views/catalog.js";
import * as CatalogEdit from "./views/catalog-edit.js";
import * as Workshop from "./views/workshop.js";
import * as WorkshopItem from "./views/workshop-item.js";
import * as Cash from "./views/cash.js";
import * as CashHistory from "./views/cash-history.js";
import * as Users from "./views/users.js";
import * as Settings from "./views/settings.js";

const ALL = ["admin", "vendedor", "taller"];
const SALES = ["admin", "vendedor"];
const ADMIN = ["admin"];
const SHOP = ["admin", "taller"];

const ROUTES = [
  { re: /^\/admin\/ingresar$/, view: Login, public: true, bare: true },
  { re: /^\/admin$/, view: Dashboard, roles: ALL },
  { re: /^\/admin\/ordenes$/, view: Orders, roles: SALES },
  { re: /^\/admin\/ordenes\/(LU-\d+)$/i, view: OrderDetail, roles: SALES },
  { re: /^\/admin\/ordenes\/(LU-\d+)\/imprimir$/i, view: PrintOrder, roles: ALL, bare: true },
  { re: /^\/admin\/ventas\/nueva$/, view: NewSale, roles: SALES },
  { re: /^\/admin\/catalogo$/, view: Catalog, roles: ALL },
  { re: /^\/admin\/catalogo\/(nuevo|m\d+)$/, view: CatalogEdit, roles: ADMIN },
  { re: /^\/admin\/taller$/, view: Workshop, roles: SHOP },
  { re: /^\/admin\/taller\/(LU-\d+)\/([\w-]+)$/i, view: WorkshopItem, roles: SHOP },
  { re: /^\/admin\/caja$/, view: Cash, roles: ADMIN },
  { re: /^\/admin\/caja\/historial$/, view: CashHistory, roles: ADMIN },
  { re: /^\/admin\/usuarios$/, view: Users, roles: ADMIN },
  { re: /^\/admin\/configuracion$/, view: Settings, roles: ADMIN },
];

const NAV = [
  { href: "/admin", label: "Inicio", icon: "home", roles: SALES, match: /^\/admin$/ },
  { href: "/admin/ordenes", label: "Órdenes", icon: "orders", roles: SALES, match: /^\/admin\/ordenes/ },
  { href: "/admin/ventas/nueva", label: "Nueva venta", icon: "plus", roles: SALES, match: /^\/admin\/ventas/, plus: true },
  { href: "/admin/taller", label: "Taller", icon: "tool", roles: SHOP, match: /^\/admin\/taller/ },
  { href: "/admin/catalogo", label: "Catálogo", icon: "catalog", roles: ALL, match: /^\/admin\/catalogo/ },
  { href: "/admin/caja", label: "Caja", icon: "cash", roles: ADMIN, match: /^\/admin\/caja/ },
  { href: "/admin/usuarios", label: "Usuarios", icon: "users", roles: ADMIN, match: /^\/admin\/usuarios/ },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings", roles: ADMIN, match: /^\/admin\/configuracion/ },
];

injectIcons();
const app = document.getElementById("app");
let current = null; // { view, params, path, cleanup }

export const homeOf = (u) => (u.role === "taller" ? "/admin/taller" : "/admin");

export function go(path, { replace = false } = {}) {
  if (path === location.pathname + location.search && !replace) return render();
  history[replace ? "replaceState" : "pushState"]({}, "", path);
  render();
}

function normalizedPath() {
  let p = location.pathname.replace(/\/+$/, "") || "/admin";
  if (p === "/admin/index.html" || p === "/admin/index") p = "/admin";
  return p;
}

function render({ soft = false } = {}) {
  const path = normalizedPath();
  const route = ROUTES.find((r) => r.re.test(path));
  const u = S.currentUser();

  if (!route) return renderShell(u, path, null, notFound);
  if (!route.public && !u) {
    const next = encodeURIComponent(location.pathname + location.search);
    history.replaceState({}, "", `/admin/ingresar?next=${next}`);
    return render();
  }
  if (route.public && u && route.view === Login) {
    history.replaceState({}, "", homeOf(u));
    return render();
  }
  if (route.roles && !route.roles.includes(u.role)) {
    history.replaceState({}, "", homeOf(u));
    toast("Tu usuario no tiene acceso a esa sección.");
    return render();
  }
  if (u && u.role === "taller" && path === "/admin") {
    history.replaceState({}, "", "/admin/taller");
    return render();
  }
  const params = path.match(route.re).slice(1);
  const ctx = { user: u, go, params, query: new URLSearchParams(location.search), rerender: () => render({ soft: true }) };

  if (current?.cleanup) { try { current.cleanup(); } catch (e) { console.error(e); } }
  const scrollY = soft ? window.scrollY : 0;
  let main;
  if (route.bare) {
    app.innerHTML = "";
    main = app;
  } else {
    main = renderShell(u, path);
  }
  const res = route.view.render(main, ctx) || {};
  current = { route, path, cleanup: res.cleanup };
  document.title = `${res.title || route.view.title || "Panel"} · La Unión`;
  if (soft) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);
  if (u?.mustChange) askNewPassword(u);
}

function notFound(main) {
  main.innerHTML = `<div class="empty card"><svg class="i big"><use href="#i-alert"/></svg><h2>No encontramos esta página</h2><p>Puede que el link esté incompleto.</p><a class="btn" href="/admin">Ir al inicio</a></div>`;
  return { title: "No encontrada" };
}

function renderShell(u, path, _r, fallback) {
  if (!u) {
    history.replaceState({}, "", "/admin/ingresar");
    return render();
  }
  const items = NAV.filter((n) => n.roles.includes(u.role));
  const pend = S.pendingNotifs(u).length;
  const navLink = (n) =>
    `<a href="${n.href}" ${n.match.test(path) ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span>${n.href === "/admin" && pend ? `<span class="count" title="Avisos por enviar">${pend}</span>` : ""}</a>`;

  // menú inferior en celular: hasta 4 accesos + "Más"
  const mob = u.role === "taller" ? items : items.slice(0, 4);
  const rest = items.filter((n) => !mob.includes(n));
  const showMore = rest.length > 0 || u.role === "taller";
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

  app.innerHTML = `<div class="app">
    <aside class="side" aria-label="Menú principal">
      <a class="brand" href="${homeOf(u)}">${logo("", 34)}<span><b>La Unión</b><small>Panel interno</small></span></a>
      <nav class="nav">${items.map(navLink).join("")}</nav>
      <div class="foot">
        <div class="me"><span class="avatar">${initials(u.name)}</span><span class="grow"><b>${esc(u.name)}</b><span>${S.ROLE_LABEL[u.role]}</span></span></div>
        <div class="row" style="padding:0 4px">
          <button class="btn btn-ghost btn-sm" data-theme-toggle>${icon(theme === "dark" ? "sun" : "moon")}${theme === "dark" ? "Modo claro" : "Modo oscuro"}</button>
          <button class="btn btn-ghost btn-sm" data-logout>${icon("logout")}Salir</button>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <a class="m-brand" href="${homeOf(u)}" aria-label="Inicio">${logo("", 30)}</a>
        ${u.role === "taller" ? `<div class="grow"><b>Taller</b></div>` : `<form class="gsearch" role="search" data-gsearch>${icon("search")}<label class="sr" for="gq">Buscar órdenes</label><input id="gq" type="search" placeholder="Buscar orden, cliente o teléfono" autocomplete="off"></form>`}
        <div class="actions">
          <a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener" title="Abrir la web pública">${icon("ext")}<span class="hide-s">Ver web</span></a>
        </div>
      </header>
      <main class="content" id="view" tabindex="-1"></main>
    </div>
    <nav class="bottom-nav" style="--n:${mob.length + (showMore ? 1 : 0)}" aria-label="Menú">
      ${mob.map((n) => `<a href="${n.href}" class="${n.plus ? "plus" : ""}" ${n.match.test(path) ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.plus ? "Vender" : n.label}</span></a>`).join("")}
      ${showMore ? `<button type="button" data-more>${icon("menu")}<span>Más</span></button>` : ""}
    </nav>
  </div>`;

  app.querySelector("[data-logout]").onclick = logout;
  app.querySelector("[data-theme-toggle]").onclick = toggleTheme;
  const gs = app.querySelector("[data-gsearch]");
  if (gs) {
    const q = new URLSearchParams(location.search).get("q");
    if (q && path === "/admin/ordenes") gs.querySelector("input").value = q;
    gs.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = gs.querySelector("input").value.trim();
      go(`/admin/ordenes${v ? `?q=${encodeURIComponent(v)}` : ""}`);
    });
  }
  const more = app.querySelector("[data-more]");
  if (more) more.onclick = () => openMore(u, rest, theme);

  const main = app.querySelector("#view");
  if (fallback) { fallback(main); return main; }
  return main;
}

function openMore(u, rest, theme) {
  const m = modal({
    title: u.name,
    body: `<p class="muted" style="margin-bottom:12px">${S.ROLE_LABEL[u.role]}</p>
      <nav class="nav" style="display:grid;gap:2px">${rest.map((n) => `<a href="${n.href}">${icon(n.icon)}<span>${n.label}</span></a>`).join("")}
      <a href="/" target="_blank" rel="noopener">${icon("ext")}<span>Ver la web pública</span></a></nav>
      <div class="row" style="margin-top:14px"><button class="btn" data-t>${icon(theme === "dark" ? "sun" : "moon")}${theme === "dark" ? "Modo claro" : "Modo oscuro"}</button><button class="btn" data-l>${icon("logout")}Cerrar sesión</button></div>`,
  });
  m.el.querySelectorAll(".nav a[href^='/admin']").forEach((a) => a.addEventListener("click", () => m.close()));
  m.el.querySelector("[data-t]").onclick = () => { m.close(); toggleTheme(); };
  m.el.querySelector("[data-l]").onclick = () => { m.close(); logout(); };
}

function toggleTheme() {
  const dark = document.documentElement.getAttribute("data-theme") !== "dark";
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  try { localStorage.setItem("lu-admin-theme", dark ? "dark" : ""); } catch {}
  render({ soft: true });
}

function logout() {
  S.logout();
  go("/admin/ingresar", { replace: true });
}

function askNewPassword(u) {
  if (document.querySelector("[data-newpass]")) return;
  const m = modal({
    title: "Elegí tu contraseña",
    body: `<form class="stack" data-newpass novalidate><p class="muted">Es tu primer ingreso. Cambiá la contraseña temporal por una propia.</p>
      <label class="field"><span>Nueva contraseña</span><input class="input" type="password" name="p1" minlength="6" autocomplete="new-password" required></label>
      <label class="field"><span>Repetila</span><input class="input" type="password" name="p2" autocomplete="new-password" required></label>
      <p class="err small" style="color:var(--bad)" hidden></p><button class="btn btn-primary">Guardar contraseña</button></form>`,
  });
  const f = m.el.querySelector("form");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const p1 = f.p1.value, p2 = f.p2.value, err = f.querySelector(".err");
    if (p1.length < 6) { err.textContent = "Usá al menos 6 caracteres."; err.hidden = false; return; }
    if (p1 !== p2) { err.textContent = "Las dos contraseñas no coinciden."; err.hidden = false; return; }
    S.changePassword(u.id, p1);
    m.close();
    toast("Contraseña guardada");
  });
}

/* Navegación sin recargar para links internos */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const href = a.getAttribute("href");
  if (!href.startsWith("/admin")) return;
  e.preventDefault();
  go(href);
});
addEventListener("popstate", () => render());

/* Cambios desde otra pestaña (o desde la misma) */
let stale = false; // hubo cambios mientras había un modal abierto
addEventListener("lu:modals-closed", () => {
  if (stale && current && current.route.view.live) { stale = false; render({ soft: true }); }
});
S.subscribe(() => {
  if (!current) return;
  const u = S.currentUser();
  if (!u && !current.route.public) return render();
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.closest("[data-gsearch]");
  if (current.route.view.live && !hasOpenModal() && !typing) return render({ soft: true });
  if (hasOpenModal()) stale = true;
  if (!current.route.bare) {
    const badge = document.querySelector('.nav a[href="/admin"] .count');
    const pend = u ? S.pendingNotifs(u).length : 0;
    if (badge && !pend) badge.remove();
  }
});
S.onError((msg) => toast(msg, { tone: "bad", timeout: 6000 }));

render();
