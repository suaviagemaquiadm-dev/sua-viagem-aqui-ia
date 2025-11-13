// AVISO: NÃO VOLTAR A USAR UM ARRAY ESTÁTICO DE URLs (urlsToCache).
// A estratégia dinâmica abaixo é mais robusta, performática e fácil de manter.
// Ela garante que novos arquivos sejam cacheados e que os usuários recebam
// atualizações sem a necessidade de alterar este arquivo manualmente.

const CACHE_NAME = 'sua-viagem-aqui-cache-v4'; // Incrementar a versão para forçar a atualização
const OFFLINE_URL = '/offline.html';
const NOT_FOUND_URL = '/404.html';

// Evento de instalação: pré-cache da página offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL, NOT_FOUND_URL]);
    })
  );
  self.skipWaiting();
});

// Evento de ativação: limpa caches antigos.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora requisições que não são GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para o Firebase para evitar problemas de autenticação e dados em tempo real.
  if (request.url.includes('firebase') || request.url.includes('googleapis.com')) {
    return;
  }

  // Estratégia para PÁGINAS (HTML): Network First, fallback para Cache e depois para Offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
           // Respostas de erro (como 404) não devem ser cacheadas
           if (!response.ok) {
               return caches.match(NOT_FOUND_URL);
           }
           // Cache da resposta bem-sucedida
           const cacheCopy = response.clone();
           caches.open(CACHE_NAME).then(cache => cache.put(request, cacheCopy));
           return response;
        })
        .catch(() => {
          // Se a rede falhar, tenta o cache. Se também falhar, mostra a página offline.
          return caches.match(request).then(response => response || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Estratégia para ASSETS (CSS, JS, Imagens): Stale-While-Revalidate.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Se a resposta da rede for válida, atualiza o cache.
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Retorna a resposta do cache imediatamente (se existir),
        // enquanto a busca na rede acontece em segundo plano para atualizar o cache.
        return cachedResponse || fetchPromise;
      });
    })
  );
});