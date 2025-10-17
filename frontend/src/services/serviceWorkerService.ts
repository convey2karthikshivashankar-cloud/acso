export interface ServiceWorkerConfig {
  enabled: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  cacheName: string;
  version: string;
  urlsToCache: string[];
  urlsToExclude: string[];
  offlinePageUrl: string;
}

export interface CacheStrategy {
  name: string;
  handler: (request: Request) => Promise<Response>;
}

class ServiceWorkerService {
  private config: ServiceWorkerConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline = navigator.onLine;
  private updateAvailable = false;

  constructor() {
    this.config = {
      enabled: true,
      cacheStrategy: 'stale-while-revalidate',
      cacheName: 'acso-ui-v1',
      version: '1.0.0',
      urlsToCache: [
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json',
        '/offline.html',
      ],
      urlsToExclude: [
        '/api/',
        '/auth/',
        '/socket.io/',
      ],
      offlinePageUrl: '/offline.html',
    };

    this.setupEventListeners();
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.config.enabled || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported or disabled');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully');

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered successfully');
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.registration.update();
      console.log('Service Worker update check completed');
    } catch (error) {
      console.error('Service Worker update failed:', error);
      throw error;
    }
  }

  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    // Send message to waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyOnlineStatusChange(false);
    });

    // Service Worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event);
    });
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', payload);
        break;
      case 'OFFLINE_READY':
        console.log('App ready for offline use');
        this.notifyOfflineReady();
        break;
      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        this.notifyUpdateAvailable();
        break;
      default:
        console.log('Unknown service worker message:', event.data);
    }
  }

  private notifyOnlineStatusChange(isOnline: boolean): void {
    // Dispatch custom event for online/offline status
    window.dispatchEvent(new CustomEvent('onlineStatusChange', {
      detail: { isOnline }
    }));

    // Show notification
    if (isOnline) {
      this.showNotification('Back online', 'Connection restored', 'success');
    } else {
      this.showNotification('Offline', 'Working in offline mode', 'warning');
    }
  }

  private notifyUpdateAvailable(): void {
    window.dispatchEvent(new CustomEvent('updateAvailable', {
      detail: { updateAvailable: true }
    }));

    this.showNotification(
      'Update available',
      'A new version is available. Refresh to update.',
      'info'
    );
  }

  private notifyOfflineReady(): void {
    window.dispatchEvent(new CustomEvent('offlineReady', {
      detail: { ready: true }
    }));

    this.showNotification(
      'Ready for offline',
      'App is ready to work offline',
      'success'
    );
  }

  private showNotification(title: string, message: string, type: 'success' | 'warning' | 'info' | 'error'): void {
    // This would integrate with your notification system
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // You could dispatch an event to show a toast notification
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { title, message, type }
    }));
  }

  // Cache management methods
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  async getCacheSize(): Promise<number> {
    if (!('caches' in window) || !('storage' in navigator) || !('estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  async getCacheInfo(): Promise<{
    caches: Array<{ name: string; size: number; urls: string[] }>;
    totalSize: number;
  }> {
    if (!('caches' in window)) {
      return { caches: [], totalSize: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          const urls = requests.map(req => req.url);
          
          // Rough size estimation
          const responses = await Promise.all(
            requests.slice(0, 10).map(req => cache.match(req))
          );
          const sampleSize = responses.reduce((size, response) => {
            if (response) {
              const contentLength = response.headers.get('content-length');
              return size + (contentLength ? parseInt(contentLength) : 1000);
            }
            return size;
          }, 0);
          
          const estimatedSize = (sampleSize / Math.min(responses.length, 10)) * urls.length;
          
          return {
            name,
            size: estimatedSize,
            urls,
          };
        })
      );

      const totalSize = cacheInfo.reduce((total, cache) => total + cache.size, 0);

      return {
        caches: cacheInfo,
        totalSize,
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return { caches: [], totalSize: 0 };
    }
  }

  // Prefetching and preloading
  async prefetchUrls(urls: string[]): Promise<void> {
    if (!this.registration || !this.registration.active) {
      console.warn('Service Worker not active, cannot prefetch');
      return;
    }

    this.registration.active.postMessage({
      type: 'PREFETCH_URLS',
      payload: { urls }
    });
  }

  async preloadCriticalResources(): Promise<void> {
    const criticalUrls = [
      '/static/css/main.css',
      '/static/js/bundle.js',
      '/api/user/profile',
      '/api/dashboard/summary',
    ];

    await this.prefetchUrls(criticalUrls);
  }

  // Background sync
  async scheduleBackgroundSync(tag: string, data?: any): Promise<void> {
    if (!this.registration || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background Sync not supported');
      return;
    }

    try {
      // Store data for background sync
      if (data) {
        localStorage.setItem(`bg-sync-${tag}`, JSON.stringify(data));
      }

      await this.registration.sync.register(tag);
      console.log(`Background sync scheduled: ${tag}`);
    } catch (error) {
      console.error('Failed to schedule background sync:', error);
    }
  }

  // Push notifications (if needed)
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
        ),
      });

      console.log('Push notification subscription created');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Getters
  get isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  get isRegistered(): boolean {
    return this.registration !== null;
  }

  get isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  get isOnlineStatus(): boolean {
    return this.isOnline;
  }

  get currentRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Configuration
  updateConfig(newConfig: Partial<ServiceWorkerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ServiceWorkerConfig {
    return { ...this.config };
  }
}

export const serviceWorkerService = new ServiceWorkerService();