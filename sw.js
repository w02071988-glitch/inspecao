// ══════════════════════════════════════════════════
// Service Worker — Inspeção de Correia PWA
// Versão: 1.0
// ══════════════════════════════════════════════════

const CACHE_NAME = 'inspecao-v3'; // atualizado para forçar refresh

// Arquivos que ficam disponíveis offline
const ARQUIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css'
];

// Instala o service worker e faz cache dos arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARQUIVOS_CACHE).catch(() => {
        // Se algum arquivo externo falhar, ignora e continua
        return cache.addAll(['./index.html', './manifest.json']);
      });
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições — serve do cache quando offline
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET e extensões do Chrome
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Tenta buscar da rede
      return fetch(event.request).then(response => {
        // Faz cache de respostas válidas (não faz cache de erros)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline e não está no cache — retorna página principal
        return caches.match('./index.html');
      });
    })
  );
});
