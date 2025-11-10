
const CACHE_NAME = 'sua-viagem-aqui-cache-v3'; // Versão do cache atualizada
const urlsToCache = [
  '/',
  '/index.html',
  '/404.html',
  '/offline.html',
  '/ad_details.html',
  '/admin.html',
  '/admin_dashboard.html',
  '/buscar_parceiros.html',
  '/cadastro_anunciantes.html',
  '/cadastro_viajante.html',
  '/cadastro_viajante_plus.html',
  '/codigo_de_conduta.html',
  '/contato.html',
  '/faq.html',
  '/meu_feed.html',
  '/meus_favoritos.html',
  '/meus_roteiros.html',
  '/painel_anunciante.html',
  '/pagina_login.html',
  '/perfil.html',
  '/politica_de_privacidade.html',
  '/roteiro_ia.html',
  '/roteiro_publico.html',
  '/sobre_nos.html',
  '/termos_de_servico.html',
  '/css/styles.css',
  '/manifest.json',
  '/src/layout.js',
  '/src/app.js',
  '/src/firebase.js',
  '/src/auth.js',
  '/src/ui/alert.js',
  '/src/main.js',
  '/src/search.js',
  '/src/utils.js',
  '/src/ui.js',
  '/components/header.html',
  '/components/footer.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

// Evento de instalação: abre o cache e armazena os arquivos principais.
self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo Service Worker a ativar
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto, adicionando arquivos principais.');
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
            console.log(`[SW] Deletando cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Torna o SW o controlador de todas as abas abertas
  );
});

// Evento de fetch: intercepta as requisições de rede.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET (ex: POST para APIs)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para o Firebase Auth e Firestore para evitar problemas de cache
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    // 1. Tenta encontrar o recurso no cache.
    caches.match(event.request)
      .then(response => {
        // Se encontrou no cache, retorna a resposta do cache.
        if (response) {
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
