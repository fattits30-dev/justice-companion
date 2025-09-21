import '@testing-library/jest-dom';

// Mock Electron API for testing
window.justiceAPI = {
  aiChat: jest.fn(),
  aiHealth: jest.fn(),
  saveCase: jest.fn(),
  getCases: jest.fn(),
  selectFile: jest.fn(),
  saveDocument: jest.fn(),
  createSession: jest.fn(),
  validateSession: jest.fn(),
  acceptDisclaimer: jest.fn(),
  openExternal: jest.fn(),
  onShowDisclaimer: jest.fn(),
  removeDisclaimerListener: jest.fn(),
  getAppInfo: jest.fn(() => ({
    name: 'Justice Companion',
    version: '1.0.0-test',
    description: 'Legal Aid Assistant (Test Mode)',
    build: new Date().toISOString(),
    security: 'Test Environment'
  })),
  validateInput: jest.fn()
};

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock DOM methods not available in JSDOM
Element.prototype.scrollIntoView = jest.fn();

// Global test utilities
global.createMockCase = () => ({
  id: 'test-case-1',
  title: 'Test Housing Case',
  description: 'Test case for landlord-tenant issue',
  type: 'housing',
  status: 'active',
  createdAt: new Date().toISOString()
});

global.createMockAIResponse = (content = 'Test AI response') => ({
  success: true,
  response: {
    content: content,
    confidence: 0.95,
    riskLevel: 'LOW',
    domain: 'LANDLORD_TENANT',
    sources: ['Housing Act 2004'],
    disclaimer: true
  },
  metadata: {
    responseTime: 1000,
    sessionId: 'test-session',
    timestamp: new Date().toISOString()
  }
});