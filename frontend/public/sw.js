// Service worker mínimo — só existe para satisfazer o critério de instalabilidade do PWA.
// Sem cache proposital: a API e os dados do app devem sempre vir da rede.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
