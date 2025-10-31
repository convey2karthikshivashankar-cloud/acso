import { useState, useEffect } from 'react';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHookReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  installApp: () => Promise<void>;
  showInstallPrompt: boolean;
  dismissInstallPrompt: () => void;
}

export const usePWA = (): PWAHookReturn => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstalled();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as any);
      setIsInstallable(true);
      
      // Show custom install prompt after a delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 5000);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      setInstallPrompt(null);
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInstalled]);

  const installApp = async (): Promise<void> => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setInstallPrompt(null);
      setIsInstallable(false);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Check if install prompt was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setShowInstallPrompt(false);
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installApp,
    showInstallPrompt,
    dismissInstallPrompt
  };
};

// PWA Install Banner Component
export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, showInstallPrompt, installApp, dismissInstallPrompt } = usePWA();

  if (!isInstallable || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-banner">
      <div className="pwa-banner-content">
        <div className="pwa-banner-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        </div>
        <div className="pwa-banner-text">
          <h4>Install ACSO App</h4>
          <p>Get quick access and work offline</p>
        </div>
        <div className="pwa-banner-actions">
          <button onClick={installApp} className="pwa-install-btn">
            Install
          </button>
          <button onClick={dismissInstallPrompt} className="pwa-dismiss-btn">
            ×
          </button>
        </div>
      </div>

      <style jsx>{`
        .pwa-install-banner {
          position: fixed;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }

        .pwa-banner-content {
          display: flex;
          align-items: center;
          padding: 1rem;
          gap: 1rem;
        }

        .pwa-banner-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pwa-banner-text {
          flex: 1;
        }

        .pwa-banner-text h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .pwa-banner-text p {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .pwa-banner-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .pwa-install-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pwa-install-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .pwa-dismiss-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .pwa-dismiss-btn:hover {
          opacity: 1;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .pwa-install-banner {
            left: 0.5rem;
            right: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

// Offline indicator
export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <div className="offline-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01L16.17 17l1.42 1.42 1.27-1.27z"/>
        </svg>
        <span>You're offline</span>
      </div>

      <style jsx>{`
        .offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #ff6b6b;
          color: white;
          z-index: 1001;
          animation: slideDown 0.3s ease;
        }

        .offline-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};