# La Unión Muebles · web + sistema interno (demo)

Proyecto estático listo para Vercel. No necesita build: HTML, CSS y JavaScript con módulos ES.
Todo funciona con **datos de ejemplo** guardados en el navegador, para mostrar el sistema completo antes de conectar una base de datos real.

## Qué hay

| Ruta | Qué es |
|---|---|
| `/` | Web pública (el rediseño). En el pie hay un link "Seguí tu pedido". |
| `/seguimiento` | Página pública donde el cliente ve el avance de su pedido. |
| `/seguimiento/LU-0142?c=CODIGO` | El link que le llega al cliente por WhatsApp. Entra directo, sin datos. |
| `/admin` | Panel interno: ventas, órdenes, taller, catálogo, caja, usuarios y configuración. |

## Estructura

```
index.html                 Web pública (solo usa assets/js/galeria.js y el modelo 3D)
seguimiento/index.html     Seguimiento del cliente
admin/index.html           Panel interno (una sola página con rutas)
assets/
  brand/logo.svg
  css/admin.css            Estilos del panel (claro y oscuro)
  css/tracking.css         Estilos del seguimiento
  js/format.js             Fechas, montos, teléfonos, links de WhatsApp
  js/store.js              Capa de datos (hoy: navegador; mañana: Supabase)
  js/ui.js                 Íconos, modales, avisos, foto ampliada
  js/tracking.js           Lógica del seguimiento
  js/galeria.js            Galería del detalle de producto + visor 3D (model-viewer)
  productos/mock/          Modelo 3D de prueba, el mismo para todos los productos (ver su README)
  js/data/catalog.js       Catálogo real extraído de la web actual
  js/data/seed.js          Usuarios, clientes, órdenes, cobros y caja de ejemplo
  js/admin/app.js          Rutas, permisos por rol y menú
  js/admin/views/*.js      Una pantalla por archivo
vercel.json                Rutas y encabezados para Vercel
serve.json                 Las mismas rutas para probar en la compu
```

## Probar en la compu

```bash
npx serve .
```

Abrí `http://localhost:3000`. Hace falta un servidor (no alcanza con abrir el archivo con doble clic) porque el panel usa módulos y rutas.

## Subir a Vercel

1. Subí la carpeta a un repositorio de GitHub (o arrastrala en vercel.com → Add New → Project).
2. Framework: **Other**. Build command: vacío. Output directory: `.` (la raíz).
3. Deploy. `vercel.json` ya se encarga de que `/admin/...` y `/seguimiento/...` funcionen al recargar la página.

## Usuarios de prueba

| Usuario | Contraseña | Rol | Ve |
|---|---|---|---|
| fernando | admin123 | Administrador | Todo, incluida caja y usuarios |
| patricia | admin123 | Administrador | Todo |
| valentina | venta123 | Vendedor | Ventas, órdenes, cobros, catálogo |
| lucas | taller123 | Taller | Solo el panel del taller, sin montos |
| diego | taller123 | Taller | Solo el panel del taller |

En la pantalla de ingreso también hay botones de acceso rápido para la demo.

Pedidos de ejemplo para el seguimiento: **LU-0133** con código **K7M2Q9**
(`/seguimiento/LU-0133?c=K7M2Q9`). También podés buscar cualquier orden con su número y los últimos 4 números del teléfono del cliente.

## Cómo mostrar el "en vivo"

Abrí el panel del taller en una pestaña y el link de seguimiento en otra (mismo navegador).
Al tocar **"Pasar a: …"** en el taller, la página del cliente cambia sola, con la foto si se sacó una.

## Límites del demo (a propósito)

- **Los datos viven en cada navegador.** Si lo abrís en otro celular arranca con los mismos datos de ejemplo, pero lo que cargues en uno no aparece en el otro. Por eso el "en vivo" se ve entre pestañas de la misma compu.
- **Los cambios del catálogo en el panel todavía no se ven en la web pública.** `index.html` tiene su catálogo propio; se conectan cuando haya base de datos.
- **Los avisos de WhatsApp** abren WhatsApp con el mensaje escrito y la persona lo envía. El envío automático requiere WhatsApp Business API (Meta) y es un paso posterior.
- **Contraseñas en texto plano** dentro del navegador: sirve para mostrar, no para producción.
- En **Configuración → Reiniciar los datos de ejemplo** se vuelve todo al estado inicial.

## Siguiente paso: datos reales

Todas las pantallas leen y escriben solo a través de `assets/js/store.js`. Para el sistema real:

1. Crear el proyecto en **Supabase** (base de datos, usuarios y almacenamiento de fotos).
2. Tablas: `users`, `customers`, `orders`, `order_items`, `item_log`, `payments`, `cash_days`, `expenses`, `products`, `rooms`, `works`, `notifs`, `config`.
3. Reemplazar el interior de las funciones de `store.js` por llamadas a Supabase, manteniendo los mismos nombres. Las pantallas no cambian.
4. Login con Supabase Auth y permisos por rol con Row Level Security (el taller no puede leer montos).
5. Seguimiento: una función del servidor que reciba número + código y devuelva solo los datos públicos (lo mismo que hoy hace `S.track()`).
6. En vivo: Supabase Realtime en lugar del evento `storage` del navegador.
7. Que `index.html` lea el catálogo de la base para que los cambios del panel se publiquen solos.
