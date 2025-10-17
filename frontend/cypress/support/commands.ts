/// <reference types="cypress" />

// Custom commands for ACSO testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with credentials
       * @example cy.login('admin', 'password')
       */
      login(username: string, password: string): Chainable<void>;
      
      /**
       * Custom command to login as a specific role
       * @example cy.loginAs('admin')
       */
      loginAs(role: 'admin' | 'security' | 'operations' | 'financial' | 'executive'): Chainable<void>;
      
      /**
       * Custom command to wait for page to load
       * @example cy.waitForPageLoad()
       */
      waitForPageLoad(): Chainable<void>;
      
      /**
       * Custom command to check accessibility
       * @example cy.checkA11y()
       */
      checkA11y(): Chainable<void>;
      
      /**
       * Custom command to test responsive design
       * @example cy.testResponsive()
       */
      testResponsive(): Chainable<void>;
      
      /**
       * Custom command to mock API responses
       * @example cy.mockAPI('agents', 'agents.json')
       */
      mockAPI(endpoint: string, fixture: string): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session([username, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="username-input"]').type(username);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('not.include', '/login');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });
});

// Login as role command
Cypress.Commands.add('loginAs', (role: 'admin' | 'security' | 'operations' | 'financial' | 'executive') => {
  const credentials = {
    admin: { username: 'admin', password: 'admin123' },
    security: { username: 'security', password: 'security123' },
    operations: { username: 'operations', password: 'operations123' },
    financial: { username: 'financial', password: 'financial123' },
    executive: { username: 'executive', password: 'executive123' },
  };
  
  const { username, password } = credentials[role];
  cy.login(username, password);
});

// Wait for page load command
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
  cy.get('body').should('not.have.class', 'loading');
});

// Accessibility check command
Cypress.Commands.add('checkA11y', () => {
  // Basic accessibility checks
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });
  
  cy.get('button, a, input, select, textarea').each(($el) => {
    const tagName = $el.prop('tagName').toLowerCase();
    if (tagName === 'button' || tagName === 'a') {
      cy.wrap($el).should('be.visible');
    }
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      cy.wrap($el).should('have.attr', 'aria-label').or('have.attr', 'aria-labelledby');
    }
  });
});

// Responsive design test command
Cypress.Commands.add('testResponsive', () => {
  const viewports = [
    { width: 320, height: 568 }, // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1024, height: 768 }, // Desktop small
    { width: 1920, height: 1080 }, // Desktop large
  ];
  
  viewports.forEach((viewport) => {
    cy.viewport(viewport.width, viewport.height);
    cy.waitForPageLoad();
    cy.get('body').should('be.visible');
  });
});

// Mock API command
Cypress.Commands.add('mockAPI', (endpoint: string, fixture: string) => {
  cy.intercept('GET', `/api/${endpoint}`, { fixture }).as(`get${endpoint}`);
});

export {};