// ══════════════════════════════════════════════════
// Service Worker — Inspeção de Correia PWA
// Estratégia: Network First (sempre busca versão nova)
// ══════════════════════════════════════════════════

const CACHE_NAME = 'inspecao-v4';

const ARQUIVOS_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css'
];

// Instala e faz cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ARQUIVOS_CACHE).catch(() =>
        cache.addAll(['./index.html', './manifest.json'])
      )
    )
  );
  // Ativa imediatamente sem esperar fechar abas antigas
  self.skipWaiting();
});

// Ativa e apaga caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// NETWORK FIRST — sempre tenta rede, cache só como fallback offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Para o index.html e arquivos do app: sempre network first
  const url = new URL(event.request.url);
  const isAppFile = url.pathname.endsWith('.html') ||
                    url.pathname.endsWith('.json') ||
                    url.pathname.endsWith('.js') ||
                    url.pathname === '/' ||
                    url.pathname.endsWith('/');

  if (isAppFile) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          // Atualiza o cache com a versão nova
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: usa cache
          return caches.match(event.request).then(cached =>
            cached || caches.match('./index.html')
          );
        })
    );
    return;
  }

  // Para recursos externos (ícones CSS etc): cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
