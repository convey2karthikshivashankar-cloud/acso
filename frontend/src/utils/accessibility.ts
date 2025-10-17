// Accessibility utilities and helpers for WCAG 2.1 AA compliance

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  private static trapStack: (() => void)[] = [];

  // Save current focus and set new focus
  static saveFocus(newFocus?: HTMLElement) {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    if (newFocus) {
      newFocus.focus();
    }
  }

  // Restore previous focus
  static restoreFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }

  // Create focus trap for modals and dialogs
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    const cleanup = () => {
      container.removeEventListener('keydown', handleTabKey);
    };

    this.trapStack.push(cleanup);
    return cleanup;
  }

  // Remove focus trap
  static removeTrap() {
    const cleanup = this.trapStack.pop();
    if (cleanup) {
      cleanup();
    }
  }

  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter((element) => {
        const el = element as HTMLElement;
        return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hidden;
      }) as HTMLElement[];
  }

  // Move focus to next/previous focusable element
  static moveFocus(direction: 'next' | 'previous', container?: HTMLElement) {
    const focusableElements = this.getFocusableElements(container || document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= focusableElements.length) nextIndex = 0;
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = focusableElements.length - 1;
    }

    focusableElements[nextIndex]?.focus();
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  // Handle arrow key navigation for lists and grids
  static handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      columns?: number;
    } = {}
  ): number {
    const { orientation = 'vertical', wrap = true, columns = 1 } = options;
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          newIndex = columns > 1 ? currentIndex - columns : currentIndex - 1;
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0;
          }
          event.preventDefault();
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          newIndex = columns > 1 ? currentIndex + columns : currentIndex + 1;
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1;
          }
          event.preventDefault();
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          newIndex = currentIndex - 1;
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0;
          }
          event.preventDefault();
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          newIndex = currentIndex + 1;
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1;
          }
          event.preventDefault();
        }
        break;

      case 'Home':
        newIndex = 0;
        event.preventDefault();
        break;

      case 'End':
        newIndex = items.length - 1;
        event.preventDefault();
        break;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }

    return newIndex;
  }

  // Handle escape key for closing modals/menus
  static handleEscape(callback: () => void) {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }
}

// Screen reader utilities
export class ScreenReaderUtils {
  // Announce message to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }

  // Create visually hidden but screen reader accessible text
  static createSROnlyText(text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  }

  // Update aria-live region
  static updateLiveRegion(regionId: string, message: string) {
    const region = document.getElementById(regionId);
    if (region) {
      region.textContent = message;
    }
  }
}

// Color contrast utilities
export class ColorContrast {
  // Calculate relative luminance
  static getRelativeLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Calculate contrast ratio between two colors
  static getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Check if contrast ratio meets WCAG standards
  static meetsWCAG(
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    }
  }

  // Convert hex color to RGB
  private static hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }
}

// Reduced motion utilities
export class ReducedMotion {
  // Check if user prefers reduced motion
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Apply animation only if motion is not reduced
  static conditionalAnimation(
    element: HTMLElement,
    animation: () => void,
    fallback?: () => void
  ) {
    if (this.prefersReducedMotion()) {
      fallback?.();
    } else {
      animation();
    }
  }

  // Get appropriate transition duration
  static getTransitionDuration(normalDuration: number): number {
    return this.prefersReducedMotion() ? 0 : normalDuration;
  }
}

// High contrast mode utilities
export class HighContrast {
  // Check if high contrast mode is enabled
  static isHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  // Apply high contrast styles
  static applyHighContrastStyles(element: HTMLElement) {
    if (this.isHighContrastMode()) {
      element.classList.add('high-contrast');
    }
  }
}

// ARIA utilities
export class AriaUtils {
  // Generate unique ID for ARIA relationships
  static generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set up ARIA describedby relationship
  static setDescribedBy(element: HTMLElement, descriptionId: string) {
    const existingIds = element.getAttribute('aria-describedby') || '';
    const ids = existingIds.split(' ').filter(Boolean);
    
    if (!ids.includes(descriptionId)) {
      ids.push(descriptionId);
      element.setAttribute('aria-describedby', ids.join(' '));
    }
  }

  // Remove ARIA describedby relationship
  static removeDescribedBy(element: HTMLElement, descriptionId: string) {
    const existingIds = element.getAttribute('aria-describedby') || '';
    const ids = existingIds.split(' ').filter(id => id !== descriptionId);
    
    if (ids.length > 0) {
      element.setAttribute('aria-describedby', ids.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  }

  // Set up ARIA labelledby relationship
  static setLabelledBy(element: HTMLElement, labelId: string) {
    element.setAttribute('aria-labelledby', labelId);
  }

  // Set ARIA expanded state
  static setExpanded(element: HTMLElement, expanded: boolean) {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  // Set ARIA selected state
  static setSelected(element: HTMLElement, selected: boolean) {
    element.setAttribute('aria-selected', selected.toString());
  }

  // Set ARIA checked state
  static setChecked(element: HTMLElement, checked: boolean | 'mixed') {
    element.setAttribute('aria-checked', checked.toString());
  }

  // Set ARIA disabled state
  static setDisabled(element: HTMLElement, disabled: boolean) {
    if (disabled) {
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.removeAttribute('aria-disabled');
    }
  }

  // Set ARIA hidden state
  static setHidden(element: HTMLElement, hidden: boolean) {
    if (hidden) {
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('aria-hidden');
    }
  }
}

// Form accessibility utilities
export class FormAccessibility {
  // Associate label with form control
  static associateLabel(control: HTMLElement, label: HTMLElement) {
    const controlId = control.id || AriaUtils.generateId('control');
    control.id = controlId;
    label.setAttribute('for', controlId);
  }

  // Add error message to form control
  static addErrorMessage(control: HTMLElement, errorId: string, message: string) {
    // Create error element if it doesn't exist
    let errorElement = document.getElementById(errorId);
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'error-message';
      errorElement.setAttribute('role', 'alert');
      control.parentNode?.insertBefore(errorElement, control.nextSibling);
    }

    errorElement.textContent = message;
    AriaUtils.setDescribedBy(control, errorId);
    control.setAttribute('aria-invalid', 'true');
  }

  // Remove error message from form control
  static removeErrorMessage(control: HTMLElement, errorId: string) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.remove();
    }
    
    AriaUtils.removeDescribedBy(control, errorId);
    control.removeAttribute('aria-invalid');
  }

  // Add help text to form control
  static addHelpText(control: HTMLElement, helpId: string, text: string) {
    let helpElement = document.getElementById(helpId);
    if (!helpElement) {
      helpElement = document.createElement('div');
      helpElement.id = helpId;
      helpElement.className = 'help-text';
      control.parentNode?.insertBefore(helpElement, control.nextSibling);
    }

    helpElement.textContent = text;
    AriaUtils.setDescribedBy(control, helpId);
  }
}

// Skip links utility
export class SkipLinks {
  // Create skip link
  static createSkipLink(targetId: string, text: string): HTMLAnchorElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    
    // Make skip link visible on focus
    skipLink.addEventListener('focus', () => {
      skipLink.style.position = 'absolute';
      skipLink.style.top = '0';
      skipLink.style.left = '0';
      skipLink.style.zIndex = '9999';
      skipLink.style.padding = '8px';
      skipLink.style.backgroundColor = '#000';
      skipLink.style.color = '#fff';
      skipLink.style.textDecoration = 'none';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.position = 'absolute';
      skipLink.style.left = '-9999px';
    });

    return skipLink;
  }

  // Add skip links to page
  static addSkipLinks(links: Array<{ targetId: string; text: string }>) {
    const skipContainer = document.createElement('div');
    skipContainer.className = 'skip-links';
    
    links.forEach(({ targetId, text }) => {
      const skipLink = this.createSkipLink(targetId, text);
      skipContainer.appendChild(skipLink);
    });

    document.body.insertBefore(skipContainer, document.body.firstChild);
  }
}

// Accessibility testing utilities
export class AccessibilityTesting {
  // Check for missing alt text on images
  static checkImageAltText(): string[] {
    const issues: string[] = [];
    const images = document.querySelectorAll('img');
    
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('aria-labelledby')) {
        issues.push(`Image ${index + 1} is missing alt text`);
      }
    });

    return issues;
  }

  // Check for proper heading hierarchy
  static checkHeadingHierarchy(): string[] {
    const issues: string[] = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (index === 0 && level !== 1) {
        issues.push('Page should start with h1');
      }
      
      if (level > previousLevel + 1) {
        issues.push(`Heading level jumps from h${previousLevel} to h${level}`);
      }
      
      previousLevel = level;
    });

    return issues;
  }

  // Check for form labels
  static checkFormLabels(): string[] {
    const issues: string[] = [];
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach((input, index) => {
      const hasLabel = input.getAttribute('aria-label') ||
                      input.getAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        issues.push(`Form control ${index + 1} is missing a label`);
      }
    });

    return issues;
  }

  // Run all accessibility checks
  static runAllChecks(): { [key: string]: string[] } {
    return {
      imageAltText: this.checkImageAltText(),
      headingHierarchy: this.checkHeadingHierarchy(),
      formLabels: this.checkFormLabels(),
    };
  }
}