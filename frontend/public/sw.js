// frontend/public/sw.js

const CACHE_NAME = 'always-connected-cache-v1';
const urlsToCache = [
  '/',
  '/index.html', // This should be correct if index.html is in the root of the frontend project
  '/manifest.json'
  // Add other critical static assets if needed
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete, app shell cached.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Caching failed during install:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated and old caches cleared.');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Only handle GET requests and skip non-http/https requests (like chrome-extension://)
  if (event.request.method !== 'GET' || !requestUrl.protocol.startsWith('http')) {
    // Let the browser handle it directly
    return;
  }

  // For navigation requests (e.g., loading a page), try network first, then cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('Service Worker: Network failed for navigation, trying cache for:', event.request.url);
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other requests (assets), try cache first, then network.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        // console.log('Service Worker: Not in cache, fetching from network:', event.request.url);
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response to cache
          // Only cache responses from your own origin or CDNs you trust if needed
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
            // console.log('Service Worker: Not caching invalid or non-basic/cors response:', event.request.url, networkResponse.type);
            return networkResponse;
          }

          // IMPORTANT: Check if the request URL is something we actually want to cache.
          // Avoid caching everything, especially API calls if their responses change frequently
          // and shouldn't be served from cache unless specifically designed for it.
          // For this app, we primarily cache the app shell.
          // You might want to be more specific about what gets cached here.
          // For example, only cache if requestUrl.origin === self.location.origin

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              // console.log('Service Worker: Caching new resource:', event.request.url);
              cache.put(event.request, responseToCache);
            });
          return networkResponse;
        }).catch(error => {
          console.error('Service Worker: Error fetching and caching new data:', event.request.url, error);
          // Optionally return a fallback offline page here for assets if appropriate
          // return caches.match('/offline-asset.png');
        });
      })
  );
});


self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received.');
  let notificationData = {
    title: 'Always Connected',
    body: 'You have a new message!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png', // You'll need to create this if you want to use it
    data: {
        url: self.registration.scope
    }
  };

  if (event.data) {
    try {
      const pushPayload = event.data.json();
      notificationData.title = pushPayload.title || notificationData.title;
      notificationData.body = pushPayload.body || notificationData.body;
      notificationData.icon = pushPayload.icon || notificationData.icon;
      if (pushPayload.data && pushPayload.data.url) {
        notificationData.data.url = pushPayload.data.url;
      }
      if (pushPayload.sender) {
        notificationData.data.sender = pushPayload.sender;
      }
    } catch (e) {
      console.error('Service Worker: Error parsing push data', e);
      notificationData.body = event.data.text() || 'You have a new message!';
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    tag: 'always-connected-notification',
    renotify: true,
    data: notificationData.data
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .catch(err => console.error('Service Worker: Error displaying notification:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked.');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }).catch(err => console.error('Service Worker: Error handling notification click:', err))
  );
});

self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Service Worker: Push subscription changed.');
  // Re-subscribe and send to server
});
