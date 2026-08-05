// sw.js - Service Worker para PWA
const CACHE_NAME = 'gabinete247-v1.0.1'; // Versão atualizada
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto com sucesso');
        // Usamos catch para evitar que um arquivo ausente quebre a instalação do PWA
        return cache.addAll(urlsToCache).catch(err => console.warn('Aviso no cache inicial:', err));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignora requisições de API (como o Google Apps Script) para não cachear respostas de banco de dados
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            // Verifica se recebemos uma resposta válida antes de cachear
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        ).catch(err => {
            console.warn('Erro ao buscar recurso:', event.request.url);
        });
      })
  );
});

self.addEventListener('push', event => {
  let data = {
    title: 'Gabinete 247',
    body: 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      tag: data.tag || 'notification',
      data: data.data || { url: '/' },
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: true,
      silent: false
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data.url || '/';

  if (action === 'open') {
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(windowClients => {
        for (let client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});
