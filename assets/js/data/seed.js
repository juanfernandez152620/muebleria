// Datos de ejemplo del demo. Las fechas se calculan desde "hoy" para que el demo siempre se vea actual.
import { CATALOG } from "./catalog.js";
import { localDate, addDays } from "../format.js";

export const SEED_VERSION = 3;

export const TAPICERIA_TYPES = ["Sillas y sillones", "Banquitos", "Respaldos de cama", "Bauleras"];

export const DEFAULT_STAGES = {
  melamina: [
    { name: "Diseño confirmado y corte de placas", short: "Corte", client: "Estamos cortando las piezas de tu mueble." },
    { name: "Canteado y perforado", short: "Canteado", client: "Estamos terminando los bordes de cada pieza." },
    { name: "Armado de la estructura", short: "Armado", client: "Tu mueble ya tiene forma." },
    { name: "Puertas, cajones y herrajes", short: "Herrajes", client: "Le estamos colocando puertas, cajones y correderas." },
    { name: "Detalles: LED, vidrio, espejo, tiradores", short: "Detalles", client: "Estamos sumando los detalles finales." },
    { name: "Control de calidad y embalaje", short: "Control", client: "Lo estamos revisando y embalando." },
    { name: "Entregado e instalado", short: "Entrega", client: "Coordinamos la entrega con vos." },
  ],
  tapiceria: [
    { name: "Corte y preparación de madera", short: "Corte", client: "Estamos cortando la madera de tu mueble." },
    { name: "Armado del esqueleto", short: "Esqueleto", client: "Estamos armando la estructura." },
    { name: "Encinchado y cubierta protectora", short: "Encinchado", client: "Estamos colocando cinchas y la cubierta." },
    { name: "Barnizado o tapizado de estructura", short: "Tapizado", client: "Estamos tapizando la estructura." },
    { name: "Confección de almohadones y ensamblado", short: "Almohadones", client: "Estamos armando almohadones y patas." },
    { name: "Control de calidad y embalaje", short: "Control", client: "Lo estamos revisando y embalando." },
    { name: "Entregado", short: "Entrega", client: "Coordinamos la entrega con vos." },
  ],
};

export const LINE_LABEL = { melamina: "Melamina y MDF", tapiceria: "Tapicería" };
export const lineOfType = (type) => (TAPICERIA_TYPES.includes(type) ? "tapiceria" : "melamina");

const WORK_TITLES = { "placares-a-medida": "Placard a medida", "cocinas-a-medida": "Cocina a medida", "estetica-proyectos": "Salón a medida" };

let _n = 0;
const uid = (p = "x") => `${p}${(++_n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function buildCatalog() {
  const base = CATALOG.photoBase;
  const products = CATALOG.products.map((p, i) => {
    const d = p.d || [];
    return {
      id: "m" + String(i + 1).padStart(3, "0"),
      name: p.n,
      room: p.r,
      type: p.t,
      kind: p.k,
      sub: p.s || "",
      w: d[0] ?? null, h: d[1] ?? null, d: d[2] ?? null, diam: d[3] ?? null,
      dimText: p.mt || "",
      dimDetail: p.dx || "",
      features: p.f || [],
      note: p.no || "",
      code: p.c || "",
      priceRange: p.pr || "",
      photos: p.ph.map((x) => base + x),
      visible: true,
      featured: false,
      updatedAt: null,
    };
  });
  const rooms = CATALOG.rooms.map((r, i) => ({ id: r.id, name: r.l, side: r.side, blurb: r.b, cover: base + r.cover, order: i }));
  const works = [];
  Object.entries(CATALOG.projects).forEach(([kind, list]) =>
    list.forEach((photos, i) => works.push({ id: `${kind}-${i + 1}`, kind, title: `${WORK_TITLES[kind]} · ${String(i + 1).padStart(2, "0")}`, photos: photos.map((x) => base + x), visible: true }))
  );
  return { products, rooms, works };
}

export function buildSeed(now = new Date()) {
  _n = 0;
  const today = localDate(now);
  const at = (daysAgo, h = 10, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const catalog = buildCatalog();
  const P = (name) => catalog.products.find((p) => p.name === name);

  const users = [
    { id: "u1", name: "Fernando Sanabria", username: "fernando", password: "admin123", role: "admin", phone: "5493812194874", active: true, mustChange: false, lastLogin: at(1, 18, 40) },
    { id: "u2", name: "Patricia Díaz", username: "patricia", password: "admin123", role: "admin", phone: "5493815550102", active: true, mustChange: false, lastLogin: at(2, 9, 12) },
    { id: "u3", name: "Valentina Sánchez", username: "valentina", password: "venta123", role: "vendedor", phone: "5493812194874", active: true, mustChange: false, lastLogin: at(0, 9, 3) },
    { id: "u4", name: "Lucas Medina", username: "lucas", password: "taller123", role: "taller", phone: "5493815550104", active: true, mustChange: false, lastLogin: at(0, 8, 1) },
    { id: "u5", name: "Diego Romero", username: "diego", password: "taller123", role: "taller", phone: "5493815550105", active: true, mustChange: false, lastLogin: at(1, 8, 4) },
    { id: "u6", name: "Camila Ortiz", username: "camila", password: "venta123", role: "vendedor", phone: "5493815550106", active: false, mustChange: false, lastLogin: at(64, 17, 30) },
  ];

  const C = (id, name, phone, city, kind, address, dni = "") => ({ id, name, phone, city, kind, address, dni, createdAt: at(40) });
  const customers = [
    C("c1", "María Gómez", "5493815551201", "Yerba Buena", "casa", "Av. Aconquija 1450"),
    C("c2", "Carlos Juárez · Kiosco El Paso", "5493815551202", "Tafí Viejo", "negocio", "Av. Alem 312"),
    C("c3", "Lucía Paz", "5493815551203", "San Miguel de Tucumán", "casa", "Laprida 980, 4°B"),
    C("c4", "Romina Herrera · Salón Nácar", "5493815551204", "Banda del Río Salí", "negocio", "Belgrano 155"),
    C("c5", "Jorge Albornoz", "5493815551205", "Tafí Viejo", "casa", "Pasaje Las Rosas 44"),
    C("c6", "Florencia Ruiz", "5493815551206", "Yerba Buena", "casa", "Perú 2210"),
    C("c7", "Ana Medina · Panadería La Espiga", "5493815551207", "Las Talitas", "negocio", "Av. Juan B. Justo 3120"),
    C("c8", "Sofía Ledesma", "5493815551208", "San Miguel de Tucumán", "casa", "Bolívar 615"),
    C("c9", "Martín Costilla", "5493815551209", "Lomas de Tafí", "casa", "Manzana 14, Lote 9"),
    C("c10", "Gabriela Núñez", "5493815551210", "Yerba Buena", "casa", "Solano Vera 87"),
    C("c11", "Hugo Brandán · Estudio Contable", "5493815551211", "San Miguel de Tucumán", "negocio", "25 de Mayo 450, of. 3"),
    C("c12", "Valeria Soria", "5493815551212", "Tafí Viejo", "casa", "Sáenz Peña 1022"),
  ];

  const stagePhotos = [
    ...CATALOG.projects["placares-a-medida"].slice(0, 8).map((x) => CATALOG.photoBase + x[0]),
    ...CATALOG.projects["cocinas-a-medida"].map((x) => CATALOG.photoBase + x[0]),
  ];
  let photoIdx = 0;
  const workers = ["u4", "u5"];

  const orders = [];
  const payments = [];
  const notifs = [];

  function item(name, opts = {}) {
    const p = P(name);
    return {
      id: uid("i"),
      productId: p ? p.id : null,
      name: p ? p.name : name,
      custom: !p,
      line: opts.line || (p ? lineOfType(p.type) : "melamina"),
      dims: opts.dims || (p ? { w: p.w, h: p.h, d: p.d, diam: p.diam } : {}),
      material: opts.material || (p && lineOfType(p.type) === "tapiceria" ? "Tapizado en pana" : "Melamina blanca"),
      color: opts.color || "Blanco",
      extras: opts.extras || [],
      qty: opts.qty || 1,
      notes: opts.notes || "",
      attachments: opts.attachments || [],
      photo: p ? p.photos[0] || "" : opts.photo || "",
      current: opts.stage || 1,
      log: [],
      problem: opts.problem || null,
      _lastDaysAgo: opts.lastDaysAgo,
    };
  }

  function order(o) {
    const createdAt = at(o.daysAgo, 10 + (o.daysAgo % 6), 15);
    const items = o.items;
    items.forEach((it) => {
      const done = it.current - 1;
      const span = Math.max(o.daysAgo - (it._lastDaysAgo ?? 0), 1);
      for (let s = 1; s <= done; s++) {
        const daysAgo = Math.round(o.daysAgo - (span * s) / Math.max(done, 1));
        const hasPhoto = s === 3 || s === 5 || s === 6;
        it.log.push({
          stage: s,
          action: "done",
          at: at(Math.max(daysAgo, it._lastDaysAgo ?? 0), 11 + (s % 5), 20 + s),
          by: workers[s % 2],
          photo: hasPhoto ? stagePhotos[photoIdx++ % stagePhotos.length] : "",
          note: s === 3 ? "Estructura armada y escuadrada." : "",
        });
      }
      delete it._lastDaysAgo;
    });
    const rec = {
      id: uid("o"),
      number: o.number,
      code: o.code,
      customerId: o.customer,
      sellerId: o.seller,
      createdAt,
      dueDate: addDays(today, o.dueIn),
      delivery: o.delivery || "envio",
      address: customers.find((c) => c.id === o.customer).address,
      status: o.status || "activa",
      statusReason: o.statusReason || "",
      total: o.total,
      plan: o.plan,
      notes: o.notes || "",
      items,
      log: [{ at: createdAt, by: o.seller, text: "Venta registrada" }],
    };
    if (rec.plan.method === "semanal") {
      const dep = o.deposit || 0;
      rec.plan.weekly = Math.ceil((rec.total - dep) / rec.plan.weeks / 100) * 100;
      rec.plan.start = addDays(localDate(createdAt), 7);
    }
    orders.push(rec);
    (o.pays || []).forEach((p) =>
      payments.push({ id: uid("p"), orderNumber: o.number, at: at(p.daysAgo, p.h || 11, 30), cashDate: addDays(today, -p.daysAgo), amount: p.amount, method: p.method, concept: p.concept, kind: p.kind, by: p.by || o.seller })
    );
    return rec;
  }

  // 12 órdenes en distintos momentos de la fabricación
  order({ number: "LU-0131", code: "R4TB8M", customer: "c1", seller: "u3", daysAgo: 26, dueIn: -3, total: 1450000, plan: { method: "contado" },
    items: [item("Placard Luna 2 Puertas", { stage: 8, color: "Blanco con espejo", extras: ["Cierre suave"] }), item("Mesa de Luz Flotante", { stage: 8, qty: 2, color: "Roble Dakar" })],
    pays: [{ daysAgo: 26, amount: 700000, method: "transferencia", concept: "Seña", kind: "sena" }, { daysAgo: 3, amount: 750000, method: "efectivo", concept: "Saldo", kind: "saldo" }] });

  order({ number: "LU-0132", code: "H2WQ7C", customer: "c2", seller: "u3", daysAgo: 19, dueIn: 1, total: 1680000, plan: { method: "semanal", weeks: 12 }, deposit: 300000,
    items: [item("Caramelera Doble Baja Negra", { stage: 7, color: "Negro con neón rojo", extras: ["LED"] }), item("Góndola Doble", { stage: 7, color: "Blanco" })],
    pays: [{ daysAgo: 19, amount: 300000, method: "efectivo", concept: "Seña", kind: "sena" }, { daysAgo: 12, amount: 115000, method: "efectivo", concept: "Cuota 1 de 12", kind: "cuota" }, { daysAgo: 5, amount: 115000, method: "transferencia", concept: "Cuota 2 de 12", kind: "cuota" }] });

  order({ number: "LU-0133", code: "K7M2Q9", customer: "c3", seller: "u3", daysAgo: 14, dueIn: 6, total: 890000, plan: { method: "tarjeta", cuotas: 6, rate: 0.246 },
    items: [item("Maquillador Wid", { stage: 5, color: "Blanco", extras: ["LED", "Espejo"], notes: "Luz LED fría. Espejo con touch del lado derecho." })],
    pays: [{ daysAgo: 14, amount: Math.round(890000 * 1.246), method: "credito", concept: "Pago total con tarjeta (6 cuotas)", kind: "pago" }] });

  order({ number: "LU-0134", code: "N9PD3X", customer: "c4", seller: "u2", daysAgo: 9, dueIn: 12, total: 1240000, plan: { method: "semanal", weeks: 8 }, deposit: 240000,
    items: [item("Puesto de Manicura Modelo Premium", { stage: 3, qty: 2, color: "Blanco y rosa viejo", extras: ["Vidrio"] }), item("Ayudante de Manicura 3 Cajones", { stage: 3, color: "Blanco", extras: ["Ruedas"] })],
    pays: [{ daysAgo: 9, amount: 240000, method: "transferencia", concept: "Seña", kind: "sena" }, { daysAgo: 2, amount: 125000, method: "efectivo", concept: "Cuota 1 de 8", kind: "cuota" }] });

  order({ number: "LU-0135", code: "B6YH4K", customer: "c5", seller: "u3", daysAgo: 24, dueIn: -2, total: 960000, plan: { method: "contado" },
    items: [item("Rack de TV Aura", { stage: 4, color: "Gris grafito y paraíso", extras: ["LED", "Cierre suave"], problem: { text: "Falta el panel varillado: el proveedor lo entrega el viernes.", at: at(1, 15, 10), by: "u4" } })],
    pays: [{ daysAgo: 24, amount: 480000, method: "efectivo", concept: "Seña", kind: "sena" }] });

  order({ number: "LU-0136", code: "T3VF8L", customer: "c6", seller: "u2", daysAgo: 6, dueIn: 15, total: 720000, plan: { method: "tarjeta", cuotas: 3, rate: 0.174 },
    items: [item("Cómoda 8 Cajones Premium", { stage: 2, color: "Combinación blanco y verde salvia" })],
    pays: [{ daysAgo: 6, amount: Math.round(720000 * 1.174), method: "credito", concept: "Pago total con tarjeta (3 cuotas)", kind: "pago" }] });

  order({ number: "LU-0137", code: "D8QW2N", customer: "c7", seller: "u3", daysAgo: 1, dueIn: 25, total: 2350000, plan: { method: "semanal", weeks: 18 }, deposit: 470000,
    items: [item("Panera 3 Divisiones de Lujo MDF", { stage: 1, color: "MDF nogal", extras: ["LED"] }), item("Mostrador Panadero Doble", { stage: 1, color: "MDF nogal", extras: ["LED", "Vidrio"] })],
    pays: [{ daysAgo: 1, amount: 470000, method: "transferencia", concept: "Seña", kind: "sena" }] });

  order({ number: "LU-0138", code: "P5KC9R", customer: "c8", seller: "u3", daysAgo: 16, dueIn: 9, total: 610000, plan: { method: "contado" }, status: "pausa", statusReason: "La clienta está eligiendo otro color de pana.",
    items: [item("Respaldo Capitoné", { stage: 4, color: "Pana verde inglés", notes: "Medida 2 plazas (160 cm)." }), item("Banquito Pétalos", { stage: 4, color: "Pana verde inglés" })],
    pays: [{ daysAgo: 16, amount: 300000, method: "efectivo", concept: "Seña", kind: "sena" }] });

  order({ number: "LU-0139", code: "F2LM6S", customer: "c9", seller: "u1", daysAgo: 21, dueIn: 4, total: 2900000, plan: { method: "contado" },
    items: [item("Placard a medida de 3 puertas corredizas", { stage: 3, lastDaysAgo: 9, dims: { w: 240, h: 260, d: 60 }, material: "Melamina", color: "Blanco y roble", extras: ["Espejo", "Cierre suave"], notes: "Hueco de pared irregular: medir de nuevo antes de colocar.", photo: CATALOG.photoBase + CATALOG.projects["placares-a-medida"][13][0] })],
    pays: [{ daysAgo: 21, amount: 1500000, method: "transferencia", concept: "Seña", kind: "sena" }] });

  order({ number: "LU-0140", code: "W7GZ3H", customer: "c10", seller: "u2", daysAgo: 18, dueIn: 2, total: 1180000, plan: { method: "contado" },
    items: [item("Vajillero Modelo Indiana", { stage: 6, color: "MDF verde petróleo", extras: ["Cierre suave"] })],
    pays: [{ daysAgo: 18, amount: 590000, method: "efectivo", concept: "Seña", kind: "sena" }] });

  order({ number: "LU-0141", code: "M3XR7J", customer: "c11", seller: "u3", daysAgo: 4, dueIn: 17, total: 1320000, plan: { method: "semanal", weeks: 10 }, deposit: 320000,
    items: [item("Mostrador Recepción Modelo Lía", { stage: 2, color: "Blanco con varillado roble", extras: ["Cajón con llave"] })],
    pays: [{ daysAgo: 4, amount: 320000, method: "transferencia", concept: "Seña", kind: "sena" }, { daysAgo: 0, h: 10, amount: 100000, method: "efectivo", concept: "Cuota 1 de 10", kind: "cuota" }] });

  order({ number: "LU-0142", code: "Y4BN8V", customer: "c12", seller: "u3", daysAgo: 0, dueIn: 21, total: 830000, plan: { method: "contado" },
    items: [item("Mesa de Luz Nature", { stage: 1, qty: 2, color: "Blanco y roble" }), item("Cómoda 4 Cajones Retro", { stage: 1, color: "Blanco y roble" })],
    pays: [{ daysAgo: 0, h: 11, amount: 400000, method: "efectivo", concept: "Seña", kind: "sena" }] });

  // Otros cobros de hoy
  payments.push({ id: uid("p"), orderNumber: "LU-0132", at: at(0, 12, 5), cashDate: today, amount: 115000, method: "efectivo", concept: "Cuota 3 de 12", kind: "cuota", by: "u3" });
  payments.push({ id: uid("p"), orderNumber: "LU-0135", at: at(0, 12, 40), cashDate: today, amount: 200000, method: "debito", concept: "Pago a cuenta", kind: "pago", by: "u1" });

  // Aviso pendiente: LU-0132 quedó lista para entregar
  notifs.push({ id: uid("n"), orderNumber: "LU-0132", kind: "lista", createdAt: at(0, 9, 10), sentAt: null });
  notifs.push({ id: uid("n"), orderNumber: "LU-0131", kind: "entregada", createdAt: at(3, 16, 0), sentAt: at(3, 16, 5) });

  // Caja: días anteriores cerrados, hoy abierta
  const cash = {};
  for (let d = 12; d >= 1; d--) {
    const date = addDays(today, -d);
    const wd = new Date(date + "T12:00:00").getDay();
    if (wd === 0) continue; // domingo cerrado
    const opening = 30000;
    const efectivo = payments.filter((p) => p.cashDate === date && p.method === "efectivo").reduce((s, p) => s + p.amount, 0);
    const expenses = d % 4 === 0 ? [{ id: uid("e"), at: at(d, 13, 0), amount: 18000, reason: "Flete de placas", by: "u1" }] : [];
    const exp = expenses.reduce((s, e) => s + e.amount, 0);
    const expected = opening + efectivo - exp;
    const diff = d === 5 ? -2000 : 0;
    cash[date] = { date, opening, openedAt: at(d, 9, 0), openedBy: "u1", expenses, closedAt: at(d, 19, 10), closedBy: d % 3 ? "u1" : "u2", counted: expected + diff, expected, note: diff ? "Faltan $ 2.000, posible vuelto mal dado." : "" };
  }
  cash[today] = { date: today, opening: 30000, openedAt: at(0, 9, 0), openedBy: "u1", expenses: [{ id: uid("e"), at: at(0, 11, 20), amount: 6500, reason: "Tornillos y tarugos", by: "u1" }], closedAt: null, closedBy: null, counted: null, expected: null, note: "" };

  return {
    version: SEED_VERSION,
    seededAt: now.toISOString(),
    counters: { order: 142 },
    config: { stages: JSON.parse(JSON.stringify(DEFAULT_STAGES)) },
    users,
    customers,
    orders,
    payments,
    notifs,
    cash,
    catalog,
  };
}
