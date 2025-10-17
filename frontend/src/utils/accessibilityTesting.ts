export interface AccessibilityTestResult {
  testId: string;
  testName: string;
  passed: boolean;
  score: number;
  issues: AccessibilityIssue[];
  recommendations: string[];
  wcagLevel: 'A' | 'AA' | 'AAA';
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
}

export interface AccessibilityIssue {
  id: string;
  description: string;
  element: string;
  selector: string;
  wcagCriterion: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  helpUrl: string;
}

export interface AccessibilityAudit {
  url: string;
  timestamp: Date;
  overallScore: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: AccessibilityTestResult[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

class AccessibilityTester {
  private testResults: Map<string, AccessibilityTestResult> = new Map();

  async runColorContrastTest(): Promise<AccessibilityTestResult> {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Get all text elements
    const textElements = document.querySelectorAll('*');
    
    for (const element of Array.from(textElements)) {
      const computedStyle = window.getComputedStyle(element);
      const textColor = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      if (textColor && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = this.calculateContrastRatio(textColor, backgroundColor);
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontWeight = computedStyle.fontWeight;
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const requiredRatio = isLargeText ? 3 : 4.5;
        
        if (contrast < requiredRatio) {
          issues.push({
            id: `contrast-${issues.length}`,
            description: `Insufficient color contrast ratio: ${contrast.toFixed(2)}:1 (required: ${requiredRatio}:1)`,
            element: element.tagName.toLowerCase(),
            selector: this.getElementSelector(element),
            wcagCriterion: '1.4.3',
            impact: contrast < 2 ? 'critical' : contrast < 3 ? 'serious' : 'moderate',
            help: 'Ensure text has sufficient contrast against its background',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
          });
          score -= 10;
        }
      }
    }

    return {
      testId: 'color-contrast',
      testName: 'Color Contrast',
      passed: issues.length === 0,
      score: Math.max(0, score),
      issues,
      recommendations: issues.length > 0 ? [
        'Use darker text colors or lighter backgrounds',
        'Test color combinations with a contrast checker',
        'Consider using high contrast mode for better accessibility',
      ] : [],
      wcagLevel: 'AA',
      impact: issues.length > 0 ? 'serious' : 'minor',
    };
  }

  async runKeyboardNavigationTest(): Promise<AccessibilityTestResult> {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Check for focusable elements without proper focus indicators
    const focusableElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    for (const element of Array.from(focusableElements)) {
      const computedStyle = window.getComputedStyle(element);
      
      // Check if element has visible focus indicator
      if (computedStyle.outline === 'none' && !element.classList.contains('focus-visible')) {
        issues.push({
          id: `focus-${issues.length}`,
          description: 'Interactive element lacks visible focus indicator',
          element: element.tagName.toLowerCase(),
          selector: this.getElementSelector(element),
          wcagCriterion: '2.4.7',
          impact: 'serious',
          help: 'Ensure all interactive elements have visible focus indicators',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
        });
        score -= 15;
      }

      // Check for proper tabindex usage
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          id: `tabindex-${issues.length}`,
          description: 'Positive tabindex values can create confusing navigation',
          element: element.tagName.toLowerCase(),
          selector: this.getElementSelector(element),
          wcagCriterion: '2.4.3',
          impact: 'moderate',
          help: 'Avoid positive tabindex values; use 0 or -1 instead',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
        });
        score -= 5;
      }
    }

    return {
      testId: 'keyboard-navigation',
      testName: 'Keyboard Navigation',
      passed: issues.length === 0,
      score: Math.max(0, score),
      issues,
      recommendations: issues.length > 0 ? [
        'Add visible focus indicators to all interactive elements',
        'Ensure logical tab order throughout the page',
        'Test navigation using only the keyboard',
      ] : [],
      wcagLevel: 'AA',
      impact: issues.length > 0 ? 'serious' : 'minor',
    };
  }