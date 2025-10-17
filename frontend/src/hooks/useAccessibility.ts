import { useEffect, useRef, useCallback, useState } from 'react';
import {
  FocusManager,
  KeyboardNavigation,
  ScreenReaderUtils,
  ReducedMotion,
  HighContrast,
  AriaUtils,
} from '../utils/accessibility';

// Hook for managing focus traps in modals and dialogs
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      FocusManager.saveFocus();
      cleanupRef.current = FocusManager.trapFocus(containerRef.current);
    } else if (cleanupRef.current) {
      cleanupRef.current();
      FocusManager.restoreFocus();
      cleanupRef.current = null;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        FocusManager.restoreFocus();
      }
    };
  }, [isActive]);

  return containerRef;
}

// Hook for keyboard navigation in lists and grids
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    columns?: number;
    onSelectionChange?: (index: number) => void;
  } = {}
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { orientation = 'vertical', wrap = true, columns = 1, onSelectionChange } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const newIndex = KeyboardNavigation.handleArrowNavigation(
      event,
      items,
      currentIndex,
      { orientation, wrap, columns }
    );

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      onSelectionChange?.(newIndex);
    }
  }, [items, currentIndex, orientation, wrap, columns, onSelectionChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const setFocusedIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
      items[index]?.focus();
      onSelectionChange?.(index);
    }
  }, [items, onSelectionChange]);

  return {
    currentIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    ScreenReaderUtils.announce(message, priority);
  }, []);

  const updateLiveRegion = useCallback((regionId: string, message: string) => {
    ScreenReaderUtils.updateLiveRegion(regionId, message);
  }, []);

  return {
    announce,
    updateLiveRegion,
  };
}

// Hook for managing ARIA attributes
export function useAriaAttributes(elementRef: React.RefObject<HTMLElement>) {
  const setExpanded = useCallback((expanded: boolean) => {
    if (elementRef.current) {
      AriaUtils.setExpanded(elementRef.current, expanded);
    }
  }, [elementRef]);

  const setSelected = useCallback((selected: boolean) => {
    if (elementRef.current) {
      AriaUtils.setSelected(elementRef.current, selected);
    }
  }, [elementRef]);

  const setChecked = useCallback((checked: boolean | 'mixed') => {
    if (elementRef.current) {
      AriaUtils.setChecked(elementRef.current, checked);
    }
  }, [elementRef]);

  const setDisabled = useCallback((disabled: boolean) => {
    if (elementRef.current) {
      AriaUtils.setDisabled(elementRef.current, disabled);
    }
  }, [elementRef]);

  const setHidden = useCallback((hidden: boolean) => {
    if (elementRef.current) {
      AriaUtils.setHidden(elementRef.current, hidden);
    }
  }, [elementRef]);

  const setDescribedBy = useCallback((descriptionId: string) => {
    if (elementRef.current) {
      AriaUtils.setDescribedBy(elementRef.current, descriptionId);
    }
  }, [elementRef]);

  const setLabelledBy = useCallback((labelId: string) => {
    if (elementRef.current) {
      AriaUtils.setLabelledBy(elementRef.current, labelId);
    }
  }, [elementRef]);

  return {
    setExpanded,
    setSelected,
    setChecked,
    setDisabled,
    setHidden,
    setDescribedBy,
    setLabelledBy,
  };
}

// Hook for reduced motion preferences
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => ReducedMotion.prefersReducedMotion()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getTransitionDuration = useCallback((normalDuration: number) => {
    return ReducedMotion.getTransitionDuration(normalDuration);
  }, []);

  const conditionalAnimation = useCallback((
    element: HTMLElement,
    animation: () => void,
    fallback?: () => void
  ) => {
    ReducedMotion.conditionalAnimation(element, animation, fallback);
  }, []);

  return {
    prefersReducedMotion,
    getTransitionDuration,
    conditionalAnimation,
  };
}

// Hook for high contrast mode
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(
    () => HighContrast.isHighContrastMode()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setIsHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyHighContrastStyles = useCallback((element: HTMLElement) => {
    HighContrast.applyHighContrastStyles(element);
  }, []);

  return {
    isHighContrast,
    applyHighContrastStyles,
  };
}

// Hook for managing unique IDs for ARIA relationships
export function useAriaId(prefix: string = 'aria') {
  const idRef = useRef<string>();

  if (!idRef.current) {
    idRef.current = AriaUtils.generateId(prefix);
  }

  return idRef.current;
}

// Hook for escape key handling
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const cleanup = KeyboardNavigation.handleEscape(callback);
    return cleanup;
  }, [callback, isActive]);
}

// Hook for managing roving tabindex
export function useRovingTabindex<T extends HTMLElement>(
  items: T[],
  activeIndex: number = 0
) {
  useEffect(() => {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.setAttribute('tabindex', '0');
      } else {
        item.setAttribute('tabindex', '-1');
      }
    });
  }, [items, activeIndex]);

  const setActiveIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === index ? '0' : '-1');
      });
      items[index]?.focus();
    }
  }, [items]);

  return { setActiveIndex };
}

// Hook for accessible form validation
export function useAccessibleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorIds = useRef<Record<string, string>>({});

  const addError = useCallback((fieldName: string, message: string) => {
    if (!errorIds.current[fieldName]) {
      errorIds.current[fieldName] = AriaUtils.generateId('error');
    }

    setErrors(prev => ({ ...prev, [fieldName]: message }));
    
    // Announce error to screen readers
    ScreenReaderUtils.announce(`Error in ${fieldName}: ${message}`, 'assertive');
  }, []);

  const removeError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const getErrorProps = useCallback((fieldName: string) => {
    const hasError = fieldName in errors;
    const errorId = errorIds.current[fieldName];

    return {
      'aria-invalid': hasError,
      'aria-describedby': hasError ? errorId : undefined,
      errorId,
      errorMessage: errors[fieldName],
    };
  }, [errors]);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    errorIds.current = {};
  }, []);

  return {
    errors,
    addError,
    removeError,
    getErrorProps,
    clearAllErrors,
  };
}

// Hook for accessible tooltips
export function useAccessibleTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useAriaId('tooltip');
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLElement>(null);

  const show = useCallback(() => {
    setIsVisible(true);
    if (triggerRef.current) {
      AriaUtils.setDescribedBy(triggerRef.current, tooltipId);
    }
  }, [tooltipId]);

  const hide = useCallback(() => {
    setIsVisible(false);
    if (triggerRef.current) {
      AriaUtils.removeDescribedBy(triggerRef.current, tooltipId);
    }
  }, [tooltipId]);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  // Handle escape key to close tooltip
  useEscapeKey(hide, isVisible);

  return {
    isVisible,
    show,
    hide,
    toggle,
    tooltipId,
    triggerRef,
    tooltipRef,
    triggerProps: {
      'aria-describedby': isVisible ? tooltipId : undefined,
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide,
    },
    tooltipProps: {
      id: tooltipId,
      role: 'tooltip',
      'aria-hidden': !isVisible,
    },
  };
}

// Hook for accessible disclosure (collapsible content)
export function useAccessibleDisclosure(initialOpen: boolean = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const buttonId = useAriaId('disclosure-button');
  const contentId = useAriaId('disclosure-content');

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    toggle,
    open,
    close,
    buttonProps: {
      id: buttonId,
      'aria-expanded': isOpen,
      'aria-controls': contentId,
      onClick: toggle,
    },
    contentProps: {
      id: contentId,
      'aria-labelledby': buttonId,
      'aria-hidden': !isOpen,
    },
  };
}