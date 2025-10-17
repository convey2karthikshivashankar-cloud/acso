interface AccessibilityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  element: Element;
  selector: string;
  help: string;
  helpUrl: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

interface AccessibilityAuditResult {
  violations: AccessibilityIssue[];
  passes: AccessibilityIssue[];
  incomplete: AccessibilityIssue[];
  inapplicable: AccessibilityIssue[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    passed: number;
    score: number;
  };
}

class AccessibilityAuditor {
  private rules: Map<string, (element: Element) => AccessibilityIssue[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // WCAG 2.1 AA compliance rules
    this.rules.set('missing-alt-text', this.checkMissingAltText.bind(this));
    this.rules.set('missing-labels', this.checkMissingLabels.bind(this));
    this.rules.set('insufficient-contrast', this.checkColorContrast.bind(this));
    this.rules.set('keyboard-accessibility', this.checkKeyboardAccessibility.bind(this));
    this.rules.set('focus-indicators', this.checkFocusIndicators.bind(this));
    this.rules.set('heading-structure', this.checkHeadingStructure.bind(this));
    this.rules.set('landmark-regions', this.checkLandmarkRegions.bind(this));
    this.rules.set('aria-attributes', this.checkAriaAttributes.bind(this));
    this.rules.set('form-validation', this.checkFormValidation.bind(this));
    this.rules.set('link-purpose', this.checkLinkPurpose.bind(this));
    this.rules.set('table-headers', this.checkTableHeaders.bind(this));
    this.rules.set('media-alternatives', this.checkMediaAlternatives.bind(this));
    this.rules.set('touch-targets', this.checkTouchTargets.bind(this));
    this.rules.set('motion-preferences', this.checkMotionPreferences.bind(this));
    this.rules.set('language-attributes', this.checkLanguageAttributes.bind(this));
  }

  async audit(container: Element = document.body): Promise<AccessibilityAuditResult> {
    const violations: AccessibilityIssue[] = [];
    const passes: AccessibilityIssue[] = [];
    const incomplete: AccessibilityIssue[] = [];

    // Run all rules
    for (const [ruleName, ruleFunction] of this.rules) {
      try {
        const issues = ruleFunction(container);
        issues.forEach(issue => {
          if (issue.severity === 'error') {
            violations.push(issue);
          } else {
            passes.push(issue);
          }
        });
      } catch (error) {
        incomplete.push({
          id: `${ruleName}-error`,
          severity: 'warning',
          rule: ruleName,
          description: `Rule execution failed: ${error}`,
          element: container,
          selector: this.getSelector(container),
          help: 'Check rule implementation',
          helpUrl: '',
          impact: 'minor',
        });
      }
    }

    const summary = {
      total: violations.length + passes.length,
      errors: violations.filter(v => v.severity === 'error').length,
      warnings: violations.filter(v => v.severity === 'warning').length,
      passed: passes.length,
      score: this.calculateScore(violations, passes),
    };

    return {
      violations,
      passes,
      incomplete,
      inapplicable: [],
      summary,
    };
  }

  private calculateScore(violations: AccessibilityIssue[], passes: AccessibilityIssue[]): number {
    const totalIssues = violations.length + passes.length;
    if (totalIssues === 0) return 100;

    const weightedViolations = violations.reduce((sum, issue) => {
      const weights = { critical: 4, serious: 3, moderate: 2, minor: 1 };
      return sum + weights[issue.impact];
    }, 0);

    const maxPossibleScore = totalIssues * 4; // All critical issues
    const score = Math.max(0, ((maxPossibleScore - weightedViolations) / maxPossibleScore) * 100);
    return Math.round(score);
  }

  private checkMissingAltText(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const images = container.querySelectorAll('img');

    images.forEach(img => {
      const alt = img.getAttribute('alt');
      const ariaLabel = img.getAttribute('aria-label');
      const ariaLabelledby = img.getAttribute('aria-labelledby');
      const role = img.getAttribute('role');

      if (!alt && !ariaLabel && !ariaLabelledby && role !== 'presentation') {
        issues.push({
          id: `missing-alt-${this.generateId()}`,
          severity: 'error',
          rule: 'missing-alt-text',
          description: 'Image missing alternative text',
          element: img,
          selector: this.getSelector(img),
          help: 'Add alt attribute or aria-label to describe the image',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
          impact: 'serious',
        });
      }
    });

    return issues;
  }

  private checkMissingLabels(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const inputs = container.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      const placeholder = input.getAttribute('placeholder');
      const type = input.getAttribute('type');

      // Skip hidden inputs and buttons
      if (type === 'hidden' || type === 'button' || type === 'submit' || type === 'reset') {
        return;
      }

      let hasLabel = false;

      if (ariaLabel || ariaLabelledby) {
        hasLabel = true;
      } else if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        if (label) {
          hasLabel = true;
        }
      }

      // Check if input is wrapped in a label
      if (!hasLabel) {
        const parentLabel = input.closest('label');
        if (parentLabel) {
          hasLabel = true;
        }
      }

      if (!hasLabel && !placeholder) {
        issues.push({
          id: `missing-label-${this.generateId()}`,
          severity: 'error',
          rule: 'missing-labels',
          description: 'Form control missing accessible label',
          element: input,
          selector: this.getSelector(input),
          help: 'Add a label element, aria-label, or aria-labelledby attribute',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
          impact: 'serious',
        });
      }
    });

    return issues;
  }

  private checkColorContrast(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const textElements = container.querySelectorAll('*');

    textElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const textColor = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight;

      if (this.hasTextContent(element) && textColor && backgroundColor) {
        const contrast = this.calculateContrast(textColor, backgroundColor);
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const requiredContrast = isLargeText ? 3 : 4.5;

        if (contrast < requiredContrast) {
          issues.push({
            id: `low-contrast-${this.generateId()}`,
            severity: 'error',
            rule: 'insufficient-contrast',
            description: `Insufficient color contrast ratio: ${contrast.toFixed(2)}:1 (required: ${requiredContrast}:1)`,
            element: element,
            selector: this.getSelector(element),
            help: 'Increase color contrast between text and background',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
            impact: 'serious',
          });
        }
      }
    });

    return issues;
  }

  private checkKeyboardAccessibility(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const interactiveElements = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="menuitem"]'
    );

    interactiveElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      const role = element.getAttribute('role');
      
      // Check for positive tabindex (anti-pattern)
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          id: `positive-tabindex-${this.generateId()}`,
          severity: 'warning',
          rule: 'keyboard-accessibility',
          description: 'Positive tabindex values should be avoided',
          element: element,
          selector: this.getSelector(element),
          help: 'Use tabindex="0" or remove tabindex to maintain natural tab order',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
          impact: 'moderate',
        });
      }

      // Check for keyboard event handlers
      if (element.hasAttribute('onclick') && !element.hasAttribute('onkeydown') && !element.hasAttribute('onkeypress')) {
        const tagName = element.tagName.toLowerCase();
        if (tagName !== 'button' && tagName !== 'a' && tagName !== 'input') {
          issues.push({
            id: `missing-keyboard-handler-${this.generateId()}`,
            severity: 'error',
            rule: 'keyboard-accessibility',
            description: 'Interactive element missing keyboard event handler',
            element: element,
            selector: this.getSelector(element),
            help: 'Add keyboard event handlers (onkeydown/onkeypress) for mouse click handlers',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
            impact: 'serious',
          });
        }
      }
    });

    return issues;
  }

  private checkFocusIndicators(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const focusableElements = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element, ':focus');
      const outline = computedStyle.outline;
      const outlineWidth = computedStyle.outlineWidth;
      const boxShadow = computedStyle.boxShadow;

      // Check if element has visible focus indicator
      if (outline === 'none' || outlineWidth === '0px') {
        if (!boxShadow || boxShadow === 'none') {
          issues.push({
            id: `missing-focus-indicator-${this.generateId()}`,
            severity: 'error',
            rule: 'focus-indicators',
            description: 'Focusable element missing visible focus indicator',
            element: element,
            selector: this.getSelector(element),
            help: 'Add visible focus styles using outline or box-shadow',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
            impact: 'serious',
          });
        }
      }
    });

    return issues;
  }

  private checkHeadingStructure(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    if (headings.length === 0) {
      return issues;
    }

    let previousLevel = 0;
    let hasH1 = false;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level === 1) {
        hasH1 = true;
        if (index > 0) {
          issues.push({
            id: `multiple-h1-${this.generateId()}`,
            severity: 'warning',
            rule: 'heading-structure',
            description: 'Multiple H1 headings found',
            element: heading,
            selector: this.getSelector(heading),
            help: 'Use only one H1 per page',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
            impact: 'moderate',
          });
        }
      }

      if (previousLevel > 0 && level > previousLevel + 1) {
        issues.push({
          id: `skipped-heading-level-${this.generateId()}`,
          severity: 'error',
          rule: 'heading-structure',
          description: `Heading level skipped from H${previousLevel} to H${level}`,
          element: heading,
          selector: this.getSelector(heading),
          help: 'Use heading levels in sequential order',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
          impact: 'moderate',
        });
      }

      previousLevel = level;
    });

    if (!hasH1) {
      issues.push({
        id: `missing-h1-${this.generateId()}`,
        severity: 'warning',
        rule: 'heading-structure',
        description: 'Page missing H1 heading',
        element: container,
        selector: this.getSelector(container),
        help: 'Add an H1 heading to identify the main content',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
        impact: 'moderate',
      });
    }

    return issues;
  }

  private checkLandmarkRegions(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const landmarks = container.querySelectorAll(
      '[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], header, nav, main, aside, footer'
    );

    const landmarkTypes = new Set();
    landmarks.forEach(landmark => {
      const role = landmark.getAttribute('role') || landmark.tagName.toLowerCase();
      landmarkTypes.add(role);
    });

    if (!landmarkTypes.has('main') && !landmarkTypes.has('main')) {
      issues.push({
        id: `missing-main-landmark-${this.generateId()}`,
        severity: 'error',
        rule: 'landmark-regions',
        description: 'Page missing main landmark region',
        element: container,
        selector: this.getSelector(container),
        help: 'Add a main element or role="main" to identify the primary content',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
        impact: 'moderate',
      });
    }

    return issues;
  }

  private checkAriaAttributes(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const elementsWithAria = container.querySelectorAll('[aria-labelledby], [aria-describedby]');

    elementsWithAria.forEach(element => {
      const labelledby = element.getAttribute('aria-labelledby');
      const describedby = element.getAttribute('aria-describedby');

      if (labelledby) {
        const ids = labelledby.split(' ');
        ids.forEach(id => {
          if (!container.querySelector(`#${id}`)) {
            issues.push({
              id: `invalid-aria-labelledby-${this.generateId()}`,
              severity: 'error',
              rule: 'aria-attributes',
              description: `aria-labelledby references non-existent element: ${id}`,
              element: element,
              selector: this.getSelector(element),
              help: 'Ensure aria-labelledby references existing element IDs',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
              impact: 'serious',
            });
          }
        });
      }

      if (describedby) {
        const ids = describedby.split(' ');
        ids.forEach(id => {
          if (!container.querySelector(`#${id}`)) {
            issues.push({
              id: `invalid-aria-describedby-${this.generateId()}`,
              severity: 'error',
              rule: 'aria-attributes',
              description: `aria-describedby references non-existent element: ${id}`,
              element: element,
              selector: this.getSelector(element),
              help: 'Ensure aria-describedby references existing element IDs',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
              impact: 'serious',
            });
          }
        });
      }
    });

    return issues;
  }

  private checkFormValidation(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const requiredInputs = container.querySelectorAll('input[required], select[required], textarea[required]');

    requiredInputs.forEach(input => {
      const ariaRequired = input.getAttribute('aria-required');
      const ariaInvalid = input.getAttribute('aria-invalid');
      const ariaDescribedby = input.getAttribute('aria-describedby');

      if (!ariaRequired) {
        issues.push({
          id: `missing-aria-required-${this.generateId()}`,
          severity: 'warning',
          rule: 'form-validation',
          description: 'Required field missing aria-required attribute',
          element: input,
          selector: this.getSelector(input),
          help: 'Add aria-required="true" to required form fields',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html',
          impact: 'moderate',
        });
      }

      // Check for error messages
      if (ariaInvalid === 'true' && !ariaDescribedby) {
        issues.push({
          id: `missing-error-description-${this.generateId()}`,
          severity: 'error',
          rule: 'form-validation',
          description: 'Invalid field missing error description',
          element: input,
          selector: this.getSelector(input),
          help: 'Add aria-describedby pointing to error message element',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html',
          impact: 'serious',
        });
      }
    });

    return issues;
  }

  private checkLinkPurpose(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const links = container.querySelectorAll('a[href]');

    links.forEach(link => {
      const text = this.getAccessibleText(link);
      const href = link.getAttribute('href');

      if (!text || text.trim().length === 0) {
        issues.push({
          id: `empty-link-text-${this.generateId()}`,
          severity: 'error',
          rule: 'link-purpose',
          description: 'Link missing accessible text',
          element: link,
          selector: this.getSelector(link),
          help: 'Add descriptive text or aria-label to the link',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
          impact: 'serious',
        });
      } else if (text.toLowerCase().includes('click here') || text.toLowerCase().includes('read more')) {
        issues.push({
          id: `generic-link-text-${this.generateId()}`,
          severity: 'warning',
          rule: 'link-purpose',
          description: 'Link text is not descriptive',
          element: link,
          selector: this.getSelector(link),
          help: 'Use descriptive link text that explains the link purpose',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
          impact: 'moderate',
        });
      }

      // Check for external links
      if (href && (href.startsWith('http') || href.startsWith('//')) && !href.includes(window.location.hostname)) {
        const hasExternalIndicator = link.getAttribute('aria-label')?.includes('external') ||
                                   text.includes('external') ||
                                   link.querySelector('[aria-label*="external"]');

        if (!hasExternalIndicator) {
          issues.push({
            id: `unmarked-external-link-${this.generateId()}`,
            severity: 'warning',
            rule: 'link-purpose',
            description: 'External link not clearly marked',
            element: link,
            selector: this.getSelector(link),
            help: 'Indicate external links with text or aria-label',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
            impact: 'minor',
          });
        }
      }
    });

    return issues;
  }

  private checkTableHeaders(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const tables = container.querySelectorAll('table');

    tables.forEach(table => {
      const headers = table.querySelectorAll('th');
      const caption = table.querySelector('caption');

      if (headers.length === 0) {
        issues.push({
          id: `table-missing-headers-${this.generateId()}`,
          severity: 'error',
          rule: 'table-headers',
          description: 'Data table missing header cells',
          element: table,
          selector: this.getSelector(table),
          help: 'Add th elements to identify column and row headers',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
          impact: 'serious',
        });
      }

      if (!caption) {
        issues.push({
          id: `table-missing-caption-${this.generateId()}`,
          severity: 'warning',
          rule: 'table-headers',
          description: 'Data table missing caption',
          element: table,
          selector: this.getSelector(table),
          help: 'Add a caption element to describe the table purpose',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
          impact: 'moderate',
        });
      }

      // Check for complex tables
      const rows = table.querySelectorAll('tr');
      if (rows.length > 1) {
        headers.forEach(header => {
          const scope = header.getAttribute('scope');
          const id = header.getAttribute('id');

          if (!scope && !id) {
            issues.push({
              id: `table-header-missing-scope-${this.generateId()}`,
              severity: 'warning',
              rule: 'table-headers',
              description: 'Table header missing scope or id attribute',
              element: header,
              selector: this.getSelector(header),
              help: 'Add scope="col" or scope="row" to table headers',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
              impact: 'moderate',
            });
          }
        });
      }
    });

    return issues;
  }

  private checkMediaAlternatives(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const videos = container.querySelectorAll('video');
    const audios = container.querySelectorAll('audio');

    videos.forEach(video => {
      const tracks = video.querySelectorAll('track[kind="captions"], track[kind="subtitles"]');
      const controls = video.hasAttribute('controls');

      if (tracks.length === 0) {
        issues.push({
          id: `video-missing-captions-${this.generateId()}`,
          severity: 'error',
          rule: 'media-alternatives',
          description: 'Video missing captions or subtitles',
          element: video,
          selector: this.getSelector(video),
          help: 'Add track elements with captions or subtitles',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html',
          impact: 'serious',
        });
      }

      if (!controls) {
        issues.push({
          id: `video-missing-controls-${this.generateId()}`,
          severity: 'error',
          rule: 'media-alternatives',
          description: 'Video missing controls attribute',
          element: video,
          selector: this.getSelector(video),
          help: 'Add controls attribute to allow user control',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
          impact: 'serious',
        });
      }
    });

    audios.forEach(audio => {
      const controls = audio.hasAttribute('controls');
      const autoplay = audio.hasAttribute('autoplay');

      if (!controls && autoplay) {
        issues.push({
          id: `audio-autoplay-no-controls-${this.generateId()}`,
          severity: 'error',
          rule: 'media-alternatives',
          description: 'Auto-playing audio without controls',
          element: audio,
          selector: this.getSelector(audio),
          help: 'Remove autoplay or add controls attribute',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
          impact: 'serious',
        });
      }
    });

    return issues;
  }

  private checkTouchTargets(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const interactiveElements = container.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // WCAG AA requirement

      if (rect.width < minSize || rect.height < minSize) {
        issues.push({
          id: `small-touch-target-${this.generateId()}`,
          severity: 'warning',
          rule: 'touch-targets',
          description: `Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum: ${minSize}x${minSize}px)`,
          element: element,
          selector: this.getSelector(element),
          help: 'Increase touch target size to at least 44x44 pixels',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/target-size.html',
          impact: 'moderate',
        });
      }
    });

    return issues;
  }

  private checkMotionPreferences(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const elementsWithAnimation = container.querySelectorAll('[style*="animation"], [style*="transition"]');

    elementsWithAnimation.forEach(element => {
      const style = element.getAttribute('style') || '';
      const hasMotionQuery = style.includes('prefers-reduced-motion');

      if (!hasMotionQuery) {
        issues.push({
          id: `missing-motion-preference-${this.generateId()}`,
          severity: 'warning',
          rule: 'motion-preferences',
          description: 'Animation not respecting motion preferences',
          element: element,
          selector: this.getSelector(element),
          help: 'Use prefers-reduced-motion media query to respect user preferences',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html',
          impact: 'moderate',
        });
      }
    });

    return issues;
  }

  private checkLanguageAttributes(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Check document language
    if (!document.documentElement.hasAttribute('lang')) {
      issues.push({
        id: `missing-document-lang-${this.generateId()}`,
        severity: 'error',
        rule: 'language-attributes',
        description: 'Document missing lang attribute',
        element: document.documentElement,
        selector: 'html',
        help: 'Add lang attribute to html element',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
        impact: 'serious',
      });
    }

    // Check for content in different languages
    const elementsWithLang = container.querySelectorAll('[lang]');
    elementsWithLang.forEach(element => {
      const lang = element.getAttribute('lang');
      if (!lang || lang.trim().length === 0) {
        issues.push({
          id: `empty-lang-attribute-${this.generateId()}`,
          severity: 'error',
          rule: 'language-attributes',
          description: 'Empty lang attribute',
          element: element,
          selector: this.getSelector(element),
          help: 'Provide valid language code in lang attribute',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html',
          impact: 'moderate',
        });
      }
    });

    return issues;
  }

  // Helper methods
  private getSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const parent = element.parentElement;
    
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      return `${this.getSelector(parent)} > ${tagName}${className}:nth-child(${index + 1})`;
    }
    
    return `${tagName}${className}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private hasTextContent(element: Element): boolean {
    return element.textContent !== null && element.textContent.trim().length > 0;
  }

  private getAccessibleText(element: Element): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const ariaLabelledby = element.getAttribute('aria-labelledby');
    if (ariaLabelledby) {
      const labelElement = document.getElementById(ariaLabelledby);
      if (labelElement) return labelElement.textContent || '';
    }

    return element.textContent || '';
  }

  private calculateContrast(foreground: string, background: string): number {
    // Simplified contrast calculation
    // In a real implementation, you would parse RGB values and calculate proper contrast ratio
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getLuminance(color: string): number {
    // Simplified luminance calculation
    // This is a placeholder - implement proper RGB to luminance conversion
    const rgb = this.parseColor(color);
    return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
  }

  private parseColor(color: string): { r: number; g: number; b: number } {
    // Simplified color parsing
    // This is a placeholder - implement proper color parsing
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        return {
          r: parseInt(matches[0]),
          g: parseInt(matches[1]),
          b: parseInt(matches[2]),
        };
      }
    }
    
    // Default to black
    return { r: 0, g: 0, b: 0 };
  }
}

export const accessibilityAuditor = new AccessibilityAuditor();
export default AccessibilityAuditor;