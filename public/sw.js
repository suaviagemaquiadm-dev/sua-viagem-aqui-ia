const CACHE_NAME = 'sua-viagem-aqui-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/src/layout.js',
  '/src/main.js',
  '/src/firebase.js',
  '/components/header.html',
  '/components/footer.html',
  '/offline.html'
  // Adicione outros recursos estáticos importantes aqui (imagens, fontes, etc.)
];

// Evento de instalação: abre o cache e armazena os arquivos principais.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de ativação: limpa caches antigos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de fetch: intercepta as requisições de rede.
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Tenta encontrar o recurso no cache.
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Se encontrou no cache, retorna a resposta do cache.
          return response;
        }

        // 2. Se não encontrou no cache, tenta buscar na rede.
        return fetch(event.request).then(
          networkResponse => {
            // Se a busca na rede foi bem-sucedida, clona a resposta.
            // Uma resposta só pode ser consumida uma vez, então precisamos cloná-la
            // para enviar ao navegador e também para salvar no cache.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(() => {
          // 3. Se a busca na rede falhar (offline), retorna a página de fallback.
          // Isso só acontece para requisições de navegação (páginas HTML).
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});
