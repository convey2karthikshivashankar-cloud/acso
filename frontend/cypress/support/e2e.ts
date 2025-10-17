// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // that we don't care about (like React DevTools warnings)
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});

// Set up global test data
beforeEach(() => {
  // Clear local storage before each test
  cy.clearLocalStorage();
  
  // Set up default viewport
  cy.viewport(1280, 720);
  
  // Intercept API calls for consistent testing
  cy.intercept('GET', '/api/auth/me', { fixture: 'user.json' }).as('getUser');
  cy.intercept('GET', '/api/agents', { fixture: 'agents.json' }).as('getAgents');
  cy.intercept('GET', '/api/workflows', { fixture: 'workflows.json' }).as('getWorkflows');
  cy.intercept('GET', '/api/incidents', { fixture: 'incidents.json' }).as('getIncidents');
});