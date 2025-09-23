import '@testing-library/jest-dom';

// Mock Electron API for testing
window.justiceAPI = {
  aiChat: jest.fn(),
  aiHealth: jest.fn(() => Promise.resolve({ mode: 'ollama', status: 'healthy' })),
  aiClearSession: jest.fn(),
  saveCase: jest.fn(),
  getCases: jest.fn(),
  selectFile: jest.fn(),
  saveDocument: jest.fn(),
  createSession: jest.fn(() => Promise.resolve({ success: true, sessionId: 'test-session-123' })),
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

// Mock Canvas and WebGL for SystemChecker
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return {
      getExtension: jest.fn(() => ({
        UNMASKED_RENDERER_WEBGL: 'Mock Renderer',
        UNMASKED_VENDOR_WEBGL: 'Mock Vendor'
      })),
      getParameter: jest.fn((param) => {
        if (param === 'Mock Renderer') return 'Test GPU Renderer';
        if (param === 'Mock Vendor') return 'Test GPU Vendor';
        return 'Mock Value';
      })
    };
  }
  return null;
});

// Mock performance.memory for SystemChecker
Object.defineProperty(performance, 'memory', {
  value: {
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    usedJSHeapSize: 50 * 1024 * 1024    // 50MB
  },
  writable: false
});

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
  response: content,
  model: 'llama3.1:8b',
  processingTime: 1000,
  metadata: {
    responseTime: 1000,
    sessionId: 'test-session',
    timestamp: new Date().toISOString()
  }
});