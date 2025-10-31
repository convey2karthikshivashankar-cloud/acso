// WCAG 2.1 AA Compliance utilities
export class AccessibilityCompliance {
  private static instance: AccessibilityCompliance;
  
  static getInstance(): AccessibilityCompliance {
    if (!AccessibilityCompliance.instance) {
      AccessibilityCompliance.instance = new AccessibilityCompliance();
    }
    return AccessibilityCompliance.instance;
  }

  // Color contrast checker (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
  checkColorContrast(foreground: string, background: string): {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  } {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                  (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    return {
      ratio: Math.round(ratio * 100) / 100,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7
    };
  }

  private getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Keyboard navigation helper
  setupKeyboardNavigation(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
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
      }

      if (e.key === 'Escape') {
        const closeButton = container.querySelector('[data-dismiss]') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    });
  }

  // ARIA live region announcer
  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.getElementById('aria-live-announcer') || this.createAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }

  private createAnnouncer(): HTMLElement {
    const announcer = document.createElement('div');
    announcer.id = 'aria-live-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcer);
    return announcer;
  }

  // Focus management
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
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
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  // Skip link helper
  addSkipLinks(): void {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        z-index: 1000;
      }
      
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1001;
      }
      
      .skip-link:focus {
        top: 6px;
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  // Form accessibility enhancer
  enhanceFormAccessibility(form: HTMLFormElement): void {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const label = form.querySelector(`label[for="${input.id}"]`);
      if (!label && !input.getAttribute('aria-label')) {
        console.warn('Input missing label:', input);
      }

      // Add required indicator
      if (input.hasAttribute('required')) {
        const requiredIndicator = document.createElement('span');
        requiredIndicator.textContent = ' *';
        requiredIndicator.setAttribute('aria-label', 'required');
        requiredIndicator.style.color = '#d32f2f';
        
        if (label) {
          label.appendChild(requiredIndicator);
        }
      }

      // Add error handling
      input.addEventListener('invalid', (e) => {
        const target = e.target as HTMLInputElement;
        const errorId = `${target.id}-error`;
        let errorElement = document.getElementById(errorId);
        
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.id = errorId;
          errorElement.className = 'error-message';
          errorElement.setAttribute('role', 'alert');
          errorElement.style.cssText = 'color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;';
          target.parentNode?.insertBefore(errorElement, target.nextSibling);
        }
        
        errorElement.textContent = target.validationMessage;
        target.setAttribute('aria-describedby', errorId);
        target.setAttribute('aria-invalid', 'true');
      });

      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.validity.valid) {
          target.removeAttribute('aria-invalid');
          const errorElement = document.getElementById(`${target.id}-error`);
          if (errorElement) {
            errorElement.remove();
          }
        }
      });
    });
  }

  // High contrast mode detector
  detectHighContrastMode(): boolean {
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      border: 1px solid;
      border-color: red green;
      position: absolute;
      height: 5px;
      top: -999px;
      background-image: url("data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
    `;
    
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const isHighContrast = computedStyle.backgroundImage === 'none' ||
                          computedStyle.borderTopColor === computedStyle.borderRightColor;
    
    document.body.removeChild(testElement);
    return isHighContrast;
  }

  // Reduced motion detector
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Screen reader detector
  detectScreenReader(): boolean {
    return !!(
      navigator.userAgent.match(/NVDA|JAWS|VoiceOver|ORCA|Talkback/i) ||
      window.speechSynthesis ||
      document.querySelector('[aria-live]')
    );
  }

  // Accessibility audit
  auditPage(): {
    issues: Array<{ type: string; element: Element; message: string; severity: 'error' | 'warning' }>;
    score: number;
  } {
    const issues: Array<{ type: string; element: Element; message: string; severity: 'error' | 'warning' }> = [];

    // Check for missing alt text
    document.querySelectorAll('img').forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push({
          type: 'missing-alt',
          element: img,
          message: 'Image missing alt text',
          severity: 'error'
        });
      }
    });

    // Check for missing form labels
    document.querySelectorAll('input, select, textarea').forEach(input => {
      const id = input.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = input.getAttribute('aria-label');
      
      if (!label && !ariaLabel) {
        issues.push({
          type: 'missing-label',
          element: input,
          message: 'Form control missing label',
          severity: 'error'
        });
      }
    });

    // Check for missing headings hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push({
          type: 'heading-hierarchy',
          element: heading,
          message: `Heading level ${level} skips level ${lastLevel + 1}`,
          severity: 'warning'
        });
      }
      lastLevel = level;
    });

    // Check for low contrast
    document.querySelectorAll('*').forEach(element => {
      const style = window.getComputedStyle(element);
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.checkColorContrast(color, backgroundColor);
        if (!contrast.wcagAA) {
          issues.push({
            type: 'low-contrast',
            element,
            message: `Low contrast ratio: ${contrast.ratio}:1`,
            severity: 'error'
          });
        }
      }
    });

    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 5));

    return { issues, score };
  }
}

// Accessibility testing utilities
export const accessibilityTest = {
  // Test keyboard navigation
  testKeyboardNavigation: (container: HTMLElement): Promise<boolean> => {
    return new Promise((resolve) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;

      let currentIndex = 0;
      const testNext = () => {
        if (currentIndex >= focusableElements.length) {
          resolve(true);
          return;
        }

        const element = focusableElements[currentIndex];
        element.focus();
        
        setTimeout(() => {
          if (document.activeElement === element) {
            currentIndex++;
            testNext();
          } else {
            resolve(false);
          }
        }, 100);
      };

      testNext();
    });
  },

  // Test screen reader announcements
  testScreenReaderAnnouncements: (): boolean => {
    const announcer = document.getElementById('aria-live-announcer');
    return !!announcer;
  },

  // Test color contrast
  testColorContrast: (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    const compliance = AccessibilityCompliance.getInstance();
    const contrast = compliance.checkColorContrast(style.color, style.backgroundColor);
    return contrast.wcagAA;
  }
};