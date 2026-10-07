// Service worker mínimo. Solo existe para que Chrome considere al sitio
// "instalable" como app de verdad (uno de los requisitos técnicos junto con
// el manifest.json). No cachea absolutamente nada: cada pedido va directo a
// la red, para no arriesgar que alguien vea datos viejos del CRM.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});