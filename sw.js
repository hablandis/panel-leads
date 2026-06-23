// Service worker mínimo — solo para que la PWA sea instalable.
// No cachea assets para evitar servir versiones antiguas al equipo.
const VERSION = 'v1';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Fetch: red primero, sin caché propia (el navegador gestiona su caché normal).
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response('Sin conexión', { status: 503 })));
});
