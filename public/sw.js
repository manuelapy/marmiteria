// Service worker mínimo: só habilita a instalação do PWA. Sem cache offline (decisão do briefing).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
