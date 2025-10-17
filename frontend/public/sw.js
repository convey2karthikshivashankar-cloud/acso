// Advanced Service Worker for ACSO UI Frontend
const CACHE_NAME = 'acso-ui-v2';
const STATIC_CACHE = 'acso-static-v2';
const DYNAMIC_CACHE = 'acso-dynamic-v2';
const IMAGE_CACHE = 'acso-images-v2';
const API_CACHE = 'acso-api-v2';
const OFFLINE_URL = '/offline.html';

// Cache configuration
const CACHE_CONFIG = {
  maxAge: {
    static: 30 * 24 * 60 * 60 * 1000, // 30 days
    dynamic: 24 * 60 * 60 * 1000, // 1 day
    api: 5 * 60 * 1000, // 5 minutes
    images: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  maxEntries: {
    dynamic: 100,
    api: 50,
    images: 200,
  },
};

// URLs to cache on install
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  OFFLINE_URL,
];

// API endpoints with caching strategies
const API_CACHE_STRATEGIES = {
  '/api/user/profile': { strategy: 'staleWhileRevalidate', maxAge: 60000 },
  '/api/dashboard/widgets': { strategy: 'networkFirst', maxAge: 30000 },
  '/api/agents/status': { strategy: 'networkFirst', maxAge: 10000 },
  '/api/incidents': { strategy: 'networkFirst', maxAge: 30000 },
  '/api/search': { strategy: 'networkFirst', maxAge: 60000 },
};

// URLs to exclude from caching
const URLS_TO_EXCLUDE = [
  '/auth/',
  '/socket.io/',
  '/sw.js',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages
      return self.clients.claim();
    }).then(() => {
      // Notify clients that the service worker is ready
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'OFFLINE_READY',
            payload: { ready: true }
          });
        });
      });
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip excluded URLs
  if (URLS_TO_EXCLUDE.some(excludeUrl => url.pathname.startsWith(excludeUrl))) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If we got a response, clone it and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If fetch fails, try to serve from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cached version, serve offline page
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Handle other requests with stale-while-revalidate strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // If we have a cached version, serve it immediately
      if (cachedResponse) {
        // But also fetch a fresh version in the background
        fetch(request).then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, fetchResponse.clone());
            });
          }
        }).catch(() => {
          // Fetch failed, but we already have cached version
        });
        
        return cachedResponse;
      }

      // No cached version, fetch from network
      return fetch(request).then((fetchResponse) => {
        // If successful, cache the response
        if (fetchResponse.status === 200) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => {
        // Network failed and no cache - return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match(OFFLINE_URL);
        }
        // For other requests, just fail
        throw new Error('Network failed and no cache available');
      });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'PREFETCH_URLS':
      if (payload && payload.urls) {
        prefetchUrls(payload.urls);
      }
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;

    case 'GET_CACHE_INFO':
      getCacheInfo().then((info) => {
        event.ports[0]?.postMessage(info);
      });
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ACSO Notification', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
async function prefetchUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  
  const prefetchPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        await cache.put(url, response);
        console.log('Prefetched:', url);
      }
    } catch (error) {
      console.warn('Failed to prefetch:', url, error);
    }
  });

  await Promise.allSettled(prefetchPromises);
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const cacheInfo = await Promise.all(
    cacheNames.map(async (name) => {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      return {
        name,
        size: requests.length,
        urls: requests.map(req => req.url)
      };
    })
  );

  return {
    caches: cacheInfo,
    totalCaches: cacheNames.length
  };
}

async function doBackgroundSync() {
  try {
    // Get any pending sync data from storage
    const syncData = await getStoredSyncData();
    
    if (syncData.length > 0) {
      // Process each sync item
      for (const item of syncData) {
        try {
          await processSyncItem(item);
          // Remove from storage after successful sync
          await removeSyncItem(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getStoredSyncData() {
  // This would typically read from IndexedDB
  // For now, return empty array
  return [];
}

async function processSyncItem(item) {
  // Process the sync item (e.g., send API request)
  console.log('Processing sync item:', item);
}

async function removeSyncItem(id) {
  // Remove the sync item from storage
  console.log('Removing sync item:', id);
}