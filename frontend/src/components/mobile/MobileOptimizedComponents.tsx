import React, { useState, useEffect } from 'react';
import { useBreakpoints } from '../../hooks/useBreakpoints';

// Mobile-optimized navigation
export const MobileNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useBreakpoints();

  if (!isMobile) return null;

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        <span className={`hamburger ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsOpen(false)}>
          <nav className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>ACSO Menu</h3>
              <button onClick={() => setIsOpen(false)} aria-label="Close menu">
                ×
              </button>
            </div>
            <ul className="mobile-menu-items">
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/agents">Agents</a></li>
              <li><a href="/incidents">Incidents</a></li>
              <li><a href="/financial">Financial</a></li>
              <li><a href="/workflows">Workflows</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>
        </div>
      )}

      <style jsx>{`
        .mobile-menu-btn {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1001;
          background: var(--primary-color);
          border: none;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          width: 24px;
          height: 18px;
          position: relative;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: white;
          border-radius: 1px;
          transition: all 0.3s ease;
        }

        .hamburger span:nth-child(2) {
          margin: 6px 0;
        }

        .hamburger.open span:first-child {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:last-child {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .mobile-menu {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 280px;
          background: white;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          animation: slideIn 0.3s ease;
        }

        .mobile-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        .mobile-menu-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .mobile-menu-items li {
          border-bottom: 1px solid #eee;
        }

        .mobile-menu-items a {
          display: block;
          padding: 1rem;
          text-decoration: none;
          color: #333;
          font-weight: 500;
        }

        .mobile-menu-items a:hover {
          background: #f5f5f5;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

// Touch-optimized controls
export const TouchOptimizedButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', size = 'medium', disabled = false }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => setIsPressed(true);
  const handleTouchEnd = () => setIsPressed(false);

  return (
    <button
      className={`touch-btn touch-btn-${variant} touch-btn-${size} ${isPressed ? 'pressed' : ''}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
    >
      {children}
      
      <style jsx>{`
        .touch-btn {
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          min-height: 44px; /* iOS recommended touch target size */
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .touch-btn-small {
          padding: 8px 16px;
          font-size: 14px;
        }

        .touch-btn-medium {
          padding: 12px 24px;
          font-size: 16px;
        }

        .touch-btn-large {
          padding: 16px 32px;
          font-size: 18px;
        }

        .touch-btn-primary {
          background: var(--primary-color, #007bff);
          color: white;
        }

        .touch-btn-secondary {
          background: var(--secondary-color, #6c757d);
          color: white;
        }

        .touch-btn-danger {
          background: var(--danger-color, #dc3545);
          color: white;
        }

        .touch-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .touch-btn.pressed {
          transform: translateY(1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .touch-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .touch-btn {
            min-height: 48px; /* Larger touch targets on mobile */
            min-width: 48px;
          }
        }
      `}</style>
    </button>
  );
};

// Mobile-optimized data table
export const MobileDataTable: React.FC<{
  data: any[];
  columns: { key: string; label: string; mobile?: boolean }[];
  onRowClick?: (row: any) => void;
}> = ({ data, columns, onRowClick }) => {
  const { isMobile } = useBreakpoints();

  if (!isMobile) {
    // Render regular table for desktop
    return (
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} onClick={() => onRowClick?.(row)}>
                {columns.map(col => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Mobile card layout
  return (
    <div className="mobile-table">
      {data.map((row, index) => (
        <div
          key={index}
          className="mobile-table-card"
          onClick={() => onRowClick?.(row)}
        >
          {columns
            .filter(col => col.mobile !== false)
            .map(col => (
              <div key={col.key} className="mobile-table-row">
                <span className="mobile-table-label">{col.label}:</span>
                <span className="mobile-table-value">{row[col.key]}</span>
              </div>
            ))}
        </div>
      ))}

      <style jsx>{`
        .mobile-table {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mobile-table-card {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .mobile-table-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .mobile-table-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }

        .mobile-table-row:last-child {
          border-bottom: none;
        }

        .mobile-table-label {
          font-weight: 600;
          color: #666;
          flex: 1;
        }

        .mobile-table-value {
          flex: 2;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

// Swipe gesture handler
export const SwipeHandler: React.FC<{
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}> = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown, 
  threshold = 50 
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) < threshold) return;

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    setTouchStart(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
};

// Mobile-optimized modal
export const MobileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}> = ({ isOpen, onClose, title, children, fullScreen = false }) => {
  const { isMobile } = useBreakpoints();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${isMobile && fullScreen ? 'mobile-fullscreen' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .mobile-fullscreen {
          max-width: none;
          max-height: none;
          height: 100vh;
          width: 100vw;
          border-radius: 0;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0;
          }
          
          .modal-content {
            border-radius: 0;
            height: 100vh;
            max-height: none;
          }
        }
      `}</style>
    </div>
  );
};